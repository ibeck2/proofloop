# タスク通知（レビュー移行・担当者アサイン）とオプトアウト基盤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`でタスクが「レビュー待ち」に移行した時にレビュー者へ、担当者がアサインされた時に担当者へ、それぞれメール通知を送る。あわせて、本人が事前に通知をオフにできる汎用オプトアウト基盤（`notification_preferences`）を新設する。

**Architecture:** DBに`notification_preferences`テーブル（行が無ければ有効＝オプトアウト方式）を追加し、コード側の静的レジストリで通知タイプのメタデータ（オプトアウト可否・団体単位かどうか）を管理する。`/clubtasks`の保存/ドラッグ操作後、発火判定の純粋関数→SECURITY DEFINER RPCでの本人以外のオプトアウト確認→`/api/emails/task-notification`へのfire-and-forget POST、という流れで送信する。設定変更用の`/mypage/notifications`は自分自身の行のみをRLS越しに直接読み書きする。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase（Postgres・RLS）/ Resend / vitest

## Global Constraints
- ロジックは純粋関数に切り出し、テストを書く（CLAUDE.md §5）。UIコンポーネントに判定ロジックを埋め込まない。
- メール送信APIは既存の`/api/emails/*`パターン（DBに問い合わせない・受け取った値をそのままResendへ渡す・`RESEND_API_KEY`未設定時は開発向けスキップでHTTP 200）を踏襲する。
- 呼び出し側からのメール送信はawaitしないfire-and-forget（claim承認と同じベストエフォート）。
- 確認ダイアログ・トーストは作らない（自動送信＋事前のオプトアウト設定のみ）。
- `RESEND_FROM`（`@/lib/email/resendFrom`）を使う。
- 実装後は必ず `npx tsc --noEmit && npm test` を通す。

---

### ⚠️ RLSの重要な注意点（実装前に必ず読む）

`notification_preferences`のRLSは「本人のみ読み書き可」（`user_id = auth.uid()`）にする。ところが**通知を送るのは操作した本人（actor）であり、確認したいのはレビュー者/担当者（recipient、別人）の設定**である。actorのセッションでrecipientの行をクライアントから直接SELECTすると、RLSに阻まれて常に0件になり、「行が無い＝有効」のデフォルト解決ロジックと組み合わさると**実際にオフにしていても常に「有効」と誤判定してオプトアウトが機能しなくなる**（サイレントなバグ）。

これを避けるため、cross-userの確認は必ず**SECURITY DEFINER RPC（`is_notification_enabled`）経由**で行う（Task 1で作成）。`/mypage/notifications`（本人が自分の行を読み書きする自己完結のケース）だけは通常のテーブルクエリで問題ない。

---

### Task 1: マイグレーション（テーブル・RLS・RPC）

**Files:**
- Create: `supabase/migrations/046_notification_preferences.sql`

**Interfaces:**
- Produces: テーブル`public.notification_preferences(id, user_id, notification_type, organization_id, enabled, created_at, updated_at)`。RPC`public.is_notification_enabled(p_user_id uuid, p_notification_type text, p_organization_id uuid) RETURNS boolean`。

- [ ] **Step 1: マイグレーションファイルを書く**

```sql
-- 046 notification_preferences: 通知のオプトアウト設定
--
-- 設計原則：行が存在しない＝有効（デフォルトON）。オプトアウトした時だけ
-- enabled=false の行を作る（オプトインテーブルではなくオプトアウトテーブル）。
--
-- RLSは本人のみ読み書き可。ただし通知を送る側（actor）は受信者（recipient）の
-- 設定を確認する必要があるため、その cross-user 確認は is_notification_enabled
-- （SECURITY DEFINER）経由で行う。この関数はbooleanしか返さないため、
-- 露出する情報は最小限（list_approved_claims・submit_dispute と同じ、
-- 関数が露出範囲を制御する設計）。

CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- organization_id が NULL の行同士は標準UNIQUE制約では重複を許してしまうため、
-- 部分ユニークインデックスを2本に分ける。
CREATE UNIQUE INDEX uniq_notification_preferences_org
  ON public.notification_preferences (user_id, notification_type, organization_id)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX uniq_notification_preferences_global
  ON public.notification_preferences (user_id, notification_type)
  WHERE organization_id IS NULL;

CREATE INDEX idx_notification_preferences_user
  ON public.notification_preferences(user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_select_own"
  ON public.notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_own"
  ON public.notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_own"
  ON public.notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_delete_own"
  ON public.notification_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- cross-user の確認用。呼び出し元は自分以外のuser_idを渡せるが、
-- 返すのはboolean 1個だけなので情報漏洩の余地が無い。
CREATE OR REPLACE FUNCTION public.is_notification_enabled(
  p_user_id uuid, p_notification_type text, p_organization_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT enabled FROM public.notification_preferences
     WHERE user_id = p_user_id
       AND notification_type = p_notification_type
       AND organization_id IS NOT DISTINCT FROM p_organization_id
     LIMIT 1),
    true
  );
$$;

REVOKE ALL ON FUNCTION public.is_notification_enabled(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_notification_enabled(uuid, text, uuid) TO authenticated;
```

- [ ] **Step 2: 本番Supabase（project `uhhofjcyotfyrlhaguvy`）に適用**

Supabase MCPの`apply_migration`で上記ファイルを適用する。適用前に`list_tables`で`notification_preferences`が存在しないことを確認し、適用後に`get_advisors(type: "security")`で新規の警告が増えていないことを確認する。

- [ ] **Step 3: 動作確認（BEGIN...ROLLBACKで実地検証）**

Supabase MCPの`execute_sql`で以下を実行し、期待どおりの結果になることを確認してから`ROLLBACK`する。

```sql
BEGIN;
-- 適当な既存ユーザー2人のIDを使う（実行時に実際のIDへ置き換える）
-- ケース1：行が無い → true（デフォルトON）
SELECT public.is_notification_enabled('<user_a>'::uuid, 'task_review_assigned', '<org_id>'::uuid);
-- ケース2：オプトアウト行を作ってから確認 → false
INSERT INTO public.notification_preferences (user_id, notification_type, organization_id, enabled)
VALUES ('<user_a>'::uuid, 'task_review_assigned', '<org_id>'::uuid, false);
SELECT public.is_notification_enabled('<user_a>'::uuid, 'task_review_assigned', '<org_id>'::uuid);
ROLLBACK;
```

Expected: 1つ目のSELECTは`true`、2つ目のSELECTは`false`。

---

### Task 2: 型定義と通知レジストリ

**Files:**
- Create: `lib/types/notificationPreference.ts`
- Create: `lib/notifications/registry.ts`

**Interfaces:**
- Produces: `NotificationType`型、`NotificationPreferenceRow`型、`NOTIFICATION_REGISTRY`配列、`getOptionalNotificationTypes()`関数

- [ ] **Step 1: 型定義ファイルを書く**

`lib/types/notificationPreference.ts`:
```ts
export type NotificationType =
  | "task_review_assigned"
  | "task_assignee_changed";

export interface NotificationPreferenceRow {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  organization_id: string | null;
  enabled: boolean;
}
```

- [ ] **Step 2: レジストリファイルを書く**

`lib/notifications/registry.ts`:
```ts
import type { NotificationType } from "@/lib/types/notificationPreference";

/**
 * 通知タイプの静的な性質。DBテーブルにはしない（動的追加の需要が無いため）。
 * isOptional=false の種類は /mypage/notifications に出さず、常時送信のままにする。
 */
export interface NotificationTypeMeta {
  id: NotificationType;
  label: string;
  description: string;
  isOptional: boolean;
  isOrgScoped: boolean;
}

export const NOTIFICATION_REGISTRY: NotificationTypeMeta[] = [
  {
    id: "task_review_assigned",
    label: "タスクのレビュー依頼",
    description:
      "自分がレビュー者に指定されたタスクが「レビュー待ち」になったときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
  {
    id: "task_assignee_changed",
    label: "タスクの担当者アサイン",
    description: "自分がタスクの担当者に指定されたときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
];

export function getOptionalNotificationTypes(): NotificationTypeMeta[] {
  return NOTIFICATION_REGISTRY.filter((n) => n.isOptional);
}
```

- [ ] **Step 3: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add lib/types/notificationPreference.ts lib/notifications/registry.ts
git commit -m "feat: 通知タイプの型定義とレジストリを追加"
```

---

### Task 3: オプトアウト解決の純粋関数

**Files:**
- Create: `lib/notifications/resolvePreference.ts`
- Test: `lib/notifications/resolvePreference.test.ts`

**Interfaces:**
- Consumes: `NotificationPreferenceRow`（Task 2）
- Produces: `resolveNotificationEnabled(rows, notificationType, organizationId): boolean`（`/mypage/notifications`の表示用。自分自身の行を対象にした自己完結のケースでのみ使う）

- [ ] **Step 1: 失敗するテストを書く**

`lib/notifications/resolvePreference.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resolveNotificationEnabled } from "./resolvePreference";
import type { NotificationPreferenceRow } from "@/lib/types/notificationPreference";

const baseRow: NotificationPreferenceRow = {
  id: "row-1",
  user_id: "user-1",
  notification_type: "task_review_assigned",
  organization_id: "org-1",
  enabled: false,
};

describe("resolveNotificationEnabled", () => {
  it("returns true when no matching row exists (default on)", () => {
    expect(resolveNotificationEnabled([], "task_review_assigned", "org-1")).toBe(true);
  });

  it("returns false when a disabling row matches type and org", () => {
    expect(
      resolveNotificationEnabled([baseRow], "task_review_assigned", "org-1")
    ).toBe(false);
  });

  it("returns true when the row is for a different organization", () => {
    expect(
      resolveNotificationEnabled([baseRow], "task_review_assigned", "org-2")
    ).toBe(true);
  });

  it("returns true when the row is for a different notification type", () => {
    expect(
      resolveNotificationEnabled([baseRow], "task_assignee_changed", "org-1")
    ).toBe(true);
  });

  it("returns true when a matching row exists but enabled=true", () => {
    const enabledRow = { ...baseRow, enabled: true };
    expect(
      resolveNotificationEnabled([enabledRow], "task_review_assigned", "org-1")
    ).toBe(true);
  });

  it("matches a global (organization_id=null) row when organizationId is null", () => {
    const globalRow: NotificationPreferenceRow = {
      ...baseRow,
      organization_id: null,
    };
    expect(
      resolveNotificationEnabled([globalRow], "task_review_assigned", null)
    ).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/notifications/resolvePreference.test.ts`
Expected: FAIL（`resolvePreference`モジュールが存在しない）

- [ ] **Step 3: 実装を書く**

`lib/notifications/resolvePreference.ts`:
```ts
import type {
  NotificationPreferenceRow,
  NotificationType,
} from "@/lib/types/notificationPreference";

/**
 * /mypage/notifications の表示用。行が存在しない＝有効（デフォルトON）。
 * 自分自身の行（RLSで読める範囲）を対象にした自己完結のケースでのみ使う。
 * 他人の設定をactorが確認するcross-userのケースは
 * is_notification_enabled（RPC）を使うこと（RLSに阻まれて常に0件になり
 * 誤判定するため、このクライアント側関数では代替できない）。
 */
export function resolveNotificationEnabled(
  rows: NotificationPreferenceRow[],
  notificationType: NotificationType,
  organizationId: string | null
): boolean {
  const row = rows.find(
    (r) =>
      r.notification_type === notificationType &&
      r.organization_id === organizationId
  );
  return row ? row.enabled : true;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/notifications/resolvePreference.test.ts`
Expected: PASS（6件）

- [ ] **Step 5: コミット**

```bash
git add lib/notifications/resolvePreference.ts lib/notifications/resolvePreference.test.ts
git commit -m "feat: 通知オプトアウトの解決ロジックを追加"
```

---

### Task 4: タスク通知の発火判定（純粋関数）

**Files:**
- Create: `lib/tasks/taskNotificationTriggers.ts`
- Test: `lib/tasks/taskNotificationTriggers.test.ts`

**Interfaces:**
- Produces: `TaskReviewState`型、`shouldNotifyReviewAssigned(prev, next, actorUserId): boolean`、`TaskAssigneeState`型、`shouldNotifyAssigneeChanged(prev, next, actorUserId): boolean`

- [ ] **Step 1: 失敗するテストを書く**

`lib/tasks/taskNotificationTriggers.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  shouldNotifyReviewAssigned,
  shouldNotifyAssigneeChanged,
} from "./taskNotificationTriggers";

describe("shouldNotifyReviewAssigned", () => {
  it("notifies when a brand-new task is created directly in review with a reviewer", () => {
    expect(
      shouldNotifyReviewAssigned(
        null,
        { status: "in_review", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("notifies when status transitions from another lane into in_review", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "todo", reviewerId: "user-r" },
        { status: "in_review", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("does not notify when status stays in_review with the same reviewer", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "in_review", reviewerId: "user-r" },
        { status: "in_review", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(false);
  });

  it("notifies on reassignment even while status stays in_review", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "in_review", reviewerId: "user-old" },
        { status: "in_review", reviewerId: "user-new" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("does not notify when no reviewer is set", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "todo", reviewerId: null },
        { status: "in_review", reviewerId: null },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when the new status is not in_review", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "in_review", reviewerId: "user-r" },
        { status: "done", reviewerId: "user-r" },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when the reviewer is the actor themself", () => {
    expect(
      shouldNotifyReviewAssigned(
        { status: "todo", reviewerId: null },
        { status: "in_review", reviewerId: "user-actor" },
        "user-actor"
      )
    ).toBe(false);
  });
});

describe("shouldNotifyAssigneeChanged", () => {
  it("notifies when a brand-new task is created with an assignee", () => {
    expect(
      shouldNotifyAssigneeChanged(null, { assigneeId: "user-a" }, "user-actor")
    ).toBe(true);
  });

  it("notifies when assignee changes from one member to another", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: "user-old" },
        { assigneeId: "user-new" },
        "user-actor"
      )
    ).toBe(true);
  });

  it("does not notify when assignee is unchanged", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: "user-a" },
        { assigneeId: "user-a" },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when assignee is cleared", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: "user-a" },
        { assigneeId: null },
        "user-actor"
      )
    ).toBe(false);
  });

  it("does not notify when the assignee is the actor themself", () => {
    expect(
      shouldNotifyAssigneeChanged(
        { assigneeId: null },
        { assigneeId: "user-actor" },
        "user-actor"
      )
    ).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/tasks/taskNotificationTriggers.test.ts`
Expected: FAIL（モジュールが存在しない）

- [ ] **Step 3: 実装を書く**

`lib/tasks/taskNotificationTriggers.ts`:
```ts
/**
 * タスク通知の発火判定。UIコンポーネント（app/(club)/clubtasks/page.tsx）から
 * ドラッグ操作・フォーム保存の両方で呼ばれる想定。prev=null は新規タスク作成を表す
 * （「以前はこの状態でなかった」に自然に該当するため、新規作成もこの1本のルールで
 * カバーできる）。
 */

export interface TaskReviewState {
  status: string;
  reviewerId: string | null;
}

export function shouldNotifyReviewAssigned(
  prev: TaskReviewState | null,
  next: TaskReviewState,
  actorUserId: string | null
): boolean {
  if (next.status !== "in_review") return false;
  if (!next.reviewerId) return false;
  if (next.reviewerId === actorUserId) return false;

  const wasInReview = prev?.status === "in_review";
  const sameReviewer = prev?.reviewerId === next.reviewerId;
  if (wasInReview && sameReviewer) return false;

  return true;
}

export interface TaskAssigneeState {
  assigneeId: string | null;
}

export function shouldNotifyAssigneeChanged(
  prev: TaskAssigneeState | null,
  next: TaskAssigneeState,
  actorUserId: string | null
): boolean {
  if (!next.assigneeId) return false;
  if (next.assigneeId === actorUserId) return false;
  if (prev?.assigneeId === next.assigneeId) return false;

  return true;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/tasks/taskNotificationTriggers.test.ts`
Expected: PASS（12件）

- [ ] **Step 5: コミット**

```bash
git add lib/tasks/taskNotificationTriggers.ts lib/tasks/taskNotificationTriggers.test.ts
git commit -m "feat: タスク通知の発火判定ロジックを追加"
```

---

### Task 5: メール送信API

**Files:**
- Create: `app/api/emails/task-notification/route.ts`

**Interfaces:**
- Consumes: なし（既存パターンを踏襲する自己完結のRoute Handler）
- Produces: `POST /api/emails/task-notification`。リクエストボディ`{ type: "task_review_assigned" | "task_assignee_changed", email, recipientName, actorName, taskTitle, organizationName }`

- [ ] **Step 1: ルートファイルを書く**

`app/api/emails/task-notification/route.ts`（`app/api/emails/claim/route.ts`と同じ構造。既存4ルートと同じくDBに問い合わせず、受け取った値をそのままResendへ渡す）:
```ts
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { RESEND_FROM } from "@/lib/email/resendFrom";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** メール件名用：ヘッダーインジェクション防止 */
function sanitizeSubjectPart(text: string): string {
  return text.replace(/[\r\n ]/g, " ").trim().slice(0, 80) || "タスク";
}

function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function emailShell(headline: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:rgba(255,255,255,0.9);">ProofLoop</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;line-height:1.4;color:#ffffff;">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                本メールは ProofLoop 運営より自動送信されています。この通知は「マイページ」の通知設定からオフにできます。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function ctaButton(href: string, label: string): string {
  return `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background:#0d9488;">
                    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
                  </td>
                </tr>
              </table>`;
}

function buildReviewAssignedHtml(
  recipientName: string,
  actorName: string,
  taskTitle: string,
  organizationName: string,
  tasksUrl: string
): string {
  const name = escapeHtml(recipientName || "メンバー");
  const actor = escapeHtml(actorName || "メンバー");
  const title = escapeHtml(taskTitle || "タスク");
  const org = escapeHtml(organizationName || "団体");
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
      <strong style="color:#0f172a;">${name}</strong> 様
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
      <strong style="color:#0f172a;">${actor}</strong>さんが、<strong style="color:#0f172a;">${org}</strong>のタスク「<strong style="color:#0f172a;">${title}</strong>」をレビュー待ちにしました。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      内容を確認し、対応をお願いします。
    </p>
    ${ctaButton(tasksUrl, "タスク一覧を開く")}`;
  return emailShell("タスクのレビューを依頼されました", body);
}

function buildAssigneeChangedHtml(
  recipientName: string,
  actorName: string,
  taskTitle: string,
  organizationName: string,
  tasksUrl: string
): string {
  const name = escapeHtml(recipientName || "メンバー");
  const actor = escapeHtml(actorName || "メンバー");
  const title = escapeHtml(taskTitle || "タスク");
  const org = escapeHtml(organizationName || "団体");
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
      <strong style="color:#0f172a;">${name}</strong> 様
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
      <strong style="color:#0f172a;">${actor}</strong>さんが、<strong style="color:#0f172a;">${org}</strong>のタスク「<strong style="color:#0f172a;">${title}</strong>」の担当者にあなたを設定しました。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      内容を確認し、対応をお願いします。
    </p>
    ${ctaButton(tasksUrl, "タスク一覧を開く")}`;
  return emailShell("タスクの担当者に指定されました", body);
}

type TaskNotificationBody = {
  type?: "task_review_assigned" | "task_assignee_changed";
  email?: string;
  recipientName?: string;
  actorName?: string;
  taskTitle?: string;
  organizationName?: string;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.warn(
        "[api/emails/task-notification] RESEND_API_KEY が未設定のためメール送信をスキップしました（開発環境のモック動作）"
      );
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          skipped: true,
          reason: "resend_api_key_missing",
          message: "開発環境ではメール送信をスキップしました",
        },
        { status: 200 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("Email API Error: JSON parse failed", parseErr);
      return NextResponse.json(
        { ok: false, error: "リクエストボディの解析に失敗しました" },
        { status: 400 }
      );
    }

    const b = body as TaskNotificationBody;
    const type = b.type;
    const email = typeof b.email === "string" ? b.email.trim() : "";
    const recipientName =
      typeof b.recipientName === "string" ? b.recipientName.trim() : "";
    const actorName = typeof b.actorName === "string" ? b.actorName.trim() : "";
    const taskTitle = typeof b.taskTitle === "string" ? b.taskTitle.trim() : "";
    const organizationName =
      typeof b.organizationName === "string" ? b.organizationName.trim() : "";

    if (type !== "task_review_assigned" && type !== "task_assignee_changed") {
      return NextResponse.json(
        { ok: false, error: "type（task_review_assigned/task_assignee_changed）が不正です" },
        { status: 400 }
      );
    }
    if (!email) {
      console.error("Email API Error: missing email in body", { type });
      return NextResponse.json(
        { ok: false, error: "送信先メールアドレス（email）が必要です" },
        { status: 400 }
      );
    }

    const tasksUrl = `${getAppOrigin()}/clubtasks`;
    let subject: string;
    let html: string;

    if (type === "task_review_assigned") {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」のレビューを依頼されました`;
      html = buildReviewAssignedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    } else {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」の担当者に指定されました`;
      html = buildAssigneeChangedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error("Email API Error: Resend send failed", {
        type,
        message: error.message,
        name: error.name,
        error,
      });
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          skipped: false,
          reason: "resend_api_error",
          message: error.message ?? "メール送信に失敗しました",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: true, emailSent: true, skipped: false, id: data?.id },
      { status: 200 }
    );
  } catch (err) {
    console.error("Email API Error:", err);
    const message =
      err instanceof Error ? err.message : "不明なエラーが発生しました";
    return NextResponse.json(
      {
        ok: true,
        emailSent: false,
        skipped: false,
        reason: "unexpected_error",
        message,
      },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: 開発サーバーでの手動確認**

`npm run dev`を起動し、`RESEND_API_KEY`が未設定のローカル環境で以下を実行:
```bash
curl -X POST http://localhost:3000/api/emails/task-notification \
  -H "Content-Type: application/json" \
  -d '{"type":"task_review_assigned","email":"test@example.com","recipientName":"テスト太郎","actorName":"テスト花子","taskTitle":"新歓チラシ作成","organizationName":"テスト団体"}'
```
Expected: `{"ok":true,"emailSent":false,"skipped":true,...}`（HTTP 200）

- [ ] **Step 4: コミット**

```bash
git add app/api/emails/task-notification/route.ts
git commit -m "feat: タスク通知メールAPIを追加"
```

---

### Task 6: `/mypage/notifications`（オプトアウト設定ページ）

**Files:**
- Create: `app/mypage/notifications/page.tsx`

**Interfaces:**
- Consumes: `getOptionalNotificationTypes()`（Task 2）、`resolveNotificationEnabled()`（Task 3）、`fetchMyOrganizationMemberships()`（既存 `lib/organizationMembers.ts`）
- Produces: `/mypage/notifications`ページ

- [ ] **Step 1: ページを書く**

`app/mypage/notifications/page.tsx`:
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  fetchMyOrganizationMemberships,
  type OrganizationMembership,
} from "@/lib/organizationMembers";
import { getOptionalNotificationTypes } from "@/lib/notifications/registry";
import { resolveNotificationEnabled } from "@/lib/notifications/resolvePreference";
import type { NotificationPreferenceRow } from "@/lib/types/notificationPreference";

export default function MypageNotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [rows, setRows] = useState<NotificationPreferenceRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const [membershipResult, prefResult] = await Promise.all([
      fetchMyOrganizationMemberships(supabase, user.id),
      supabase
        .from("notification_preferences")
        .select("id, user_id, notification_type, organization_id, enabled")
        .eq("user_id", user.id),
    ]);

    if (membershipResult.error) {
      console.error("memberships fetch error:", membershipResult.error);
    }
    setMemberships(membershipResult.data);

    if (prefResult.error) {
      console.error("notification_preferences fetch error:", prefResult.error);
      toast.error("通知設定の読み込みに失敗しました");
    } else {
      setRows((prefResult.data as NotificationPreferenceRow[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleToggle = async (
    notificationType: string,
    organizationId: string,
    nextEnabled: boolean
  ) => {
    if (!userId) return;
    const key = `${notificationType}:${organizationId}`;
    setSavingKey(key);
    try {
      const existing = rows.find(
        (r) =>
          r.notification_type === notificationType &&
          r.organization_id === organizationId
      );

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update({ enabled: nextEnabled })
          .eq("id", existing.id);
        if (error) throw error;
        setRows((prev) =>
          prev.map((r) => (r.id === existing.id ? { ...r, enabled: nextEnabled } : r))
        );
      } else if (!nextEnabled) {
        const { data, error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: userId,
            notification_type: notificationType,
            organization_id: organizationId,
            enabled: false,
          })
          .select("id, user_id, notification_type, organization_id, enabled")
          .single();
        if (error) throw error;
        setRows((prev) => [...prev, data as NotificationPreferenceRow]);
      }
      // nextEnabled=true かつ既存行なし＝既にデフォルトON。書き込み不要。
      toast.success("通知設定を更新しました");
    } catch (err) {
      console.error("notification preference update error:", err);
      toast.error("更新に失敗しました");
    } finally {
      setSavingKey(null);
    }
  };

  const optionalTypes = getOptionalNotificationTypes();

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-graphite">ログインが必要です。</p>
      </div>
    );
  }

  return (
    <div className="bg-mist text-graphite font-body min-h-screen pb-20 md:pb-8">
      <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
        <Link
          href="/mypage"
          className="inline-flex items-center gap-1.5 text-sm text-graphite/70 hover:text-ink mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          マイページに戻る
        </Link>
        <h1 className="text-ink text-2xl font-bold font-mincho mb-8">通知設定</h1>

        {memberships.length === 0 ? (
          <p className="text-graphite/70 text-sm">
            通知設定は所属団体ごとに管理します。所属している団体がまだありません。
          </p>
        ) : (
          <div className="space-y-6">
            {memberships.map((m) => (
              <section
                key={m.membershipId}
                className="bg-paper border border-rule rounded-lg p-6 shadow-sm"
              >
                <h2 className="text-ink text-base font-bold mb-4">
                  {m.organization?.name?.trim() || "団体"}
                </h2>
                <div className="space-y-3">
                  {optionalTypes.map((t) => {
                    const enabled = resolveNotificationEnabled(
                      rows,
                      t.id,
                      m.organizationId
                    );
                    const key = `${t.id}:${m.organizationId}`;
                    return (
                      <label
                        key={key}
                        className="flex items-start gap-3 rounded border border-rule px-4 py-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={savingKey === key}
                          onChange={(e) =>
                            handleToggle(t.id, m.organizationId, e.target.checked)
                          }
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-bold text-ink">{t.label}</span>
                          <span className="block text-graphite/70 mt-0.5">
                            {t.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: 開発サーバーでの手動確認**

`npm run dev`後、ログイン済み・団体に所属しているアカウントで`/mypage/notifications`を開く。所属団体ごとに2つのトグル（レビュー依頼・担当者アサイン）が表示され、デフォルトでONになっていることを確認する。トグルをOFFにして再読み込みし、OFFのまま保持されることを確認する。

- [ ] **Step 4: コミット**

```bash
git add app/mypage/notifications/page.tsx
git commit -m "feat: 個人の通知設定ページ(/mypage/notifications)を追加"
```

---

### Task 7: `/clubtasks`への配線

**Files:**
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `shouldNotifyReviewAssigned`・`shouldNotifyAssigneeChanged`（Task 4）

- [ ] **Step 1: `MemberOption`型に`email`を追加し、`loadMembers`のselectに`email`を足す**

`app/(club)/clubtasks/page.tsx:121`付近の`MemberOption`型を変更:
```ts
type MemberOption = { user_id: string; name: string; title: string | null; email: string | null };
```

`loadMembers`内（`page.tsx:183-204`付近）の`profiles`selectとmapを変更:
```ts
    const { data: profData, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, display_name, email")
      .in("id", ids);
    if (profErr || !profData) {
      console.error("profiles fetch error:", profErr);
      setMembers([]);
      return;
    }
    setMembers(
      (
        profData as Array<{
          id: string;
          full_name: string | null;
          display_name: string | null;
          email: string | null;
        }>
      ).map((p) => ({
        user_id: p.id,
        name: p.full_name?.trim() || p.display_name?.trim() || "（氏名未設定）",
        title: titleByUserId[p.id]?.trim() || null,
        email: p.email?.trim() || null,
      }))
    );
```

- [ ] **Step 2: importを追加し、`currentUserId`・`memberEmailById`・通知送信関数を追加**

ファイル冒頭のimportに追加:
```ts
import {
  shouldNotifyReviewAssigned,
  shouldNotifyAssigneeChanged,
} from "@/lib/tasks/taskNotificationTriggers";
```

コンポーネント内、`const [view, setView] = useState<"kanban" | "gantt">("kanban");`の直後に追加:
```ts
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);
```

`memberNameById`の定義の直後（`page.tsx:214-218`付近）に追加:
```ts
  const memberEmailById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) {
      if (m.email) map[m.user_id] = m.email;
    }
    return map;
  }, [members]);
```

`loadMembers`の定義より後、コンポーネント内の適当な位置（`formatDue`の直前あたり）に通知送信関数を追加:
```ts
  const notifyTaskChange = useCallback(
    async (params: {
      type: "task_review_assigned" | "task_assignee_changed";
      recipientId: string;
      taskTitle: string;
    }) => {
      if (!orgId || !orgName) return;
      const email = memberEmailById[params.recipientId];
      if (!email) return;

      const { data: enabled, error } = await supabase.rpc(
        "is_notification_enabled",
        {
          p_user_id: params.recipientId,
          p_notification_type: params.type,
          p_organization_id: orgId,
        }
      );
      if (error) {
        console.error("is_notification_enabled error:", error);
        // フェイルセーフ：判定に失敗しても通知を止めない（既定ON）
      } else if (enabled === false) {
        return;
      }

      const actorName =
        (currentUserId && memberNameById[currentUserId]) || "運営メンバー";
      fetch("/api/emails/task-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: params.type,
          email,
          recipientName: memberNameById[params.recipientId] ?? "メンバー",
          actorName,
          taskTitle: params.taskTitle,
          organizationName: orgName,
        }),
      }).catch((err) => {
        console.error("task-notification email error:", err);
      });
    },
    [orgId, orgName, memberEmailById, memberNameById, currentUserId]
  );
```

- [ ] **Step 3: `handleSave`に発火判定を組み込む**

`handleSave`内（`page.tsx:295-321`付近）、`toast.success(...)`の**直後**にそれぞれ追加。まず更新分岐（`if (editingTask) { ... }`）:
```ts
      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            due_date: payload.due_date,
            assignee_id: payload.assignee_id,
            reviewer_id: payload.reviewer_id,
            category: payload.category,
          })
          .eq("id", editingTask.id);
        if (error) throw error;
        toast.success("タスクを更新しました");

        const prevReview = {
          status: normalizeStatus(editingTask.status),
          reviewerId: editingTask.reviewer_id,
        };
        const nextReview = {
          status: payload.status,
          reviewerId: payload.reviewer_id,
        };
        if (shouldNotifyReviewAssigned(prevReview, nextReview, currentUserId)) {
          void notifyTaskChange({
            type: "task_review_assigned",
            recipientId: payload.reviewer_id!,
            taskTitle: payload.title,
          });
        }

        const prevAssignee = { assigneeId: editingTask.assignee_id };
        const nextAssignee = { assigneeId: payload.assignee_id };
        if (shouldNotifyAssigneeChanged(prevAssignee, nextAssignee, currentUserId)) {
          void notifyTaskChange({
            type: "task_assignee_changed",
            recipientId: payload.assignee_id!,
            taskTitle: payload.title,
          });
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("tasks").insert({
          ...payload,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success("タスクを追加しました");

        const nextReview = {
          status: payload.status,
          reviewerId: payload.reviewer_id,
        };
        if (shouldNotifyReviewAssigned(null, nextReview, currentUserId)) {
          void notifyTaskChange({
            type: "task_review_assigned",
            recipientId: payload.reviewer_id!,
            taskTitle: payload.title,
          });
        }

        const nextAssignee = { assigneeId: payload.assignee_id };
        if (shouldNotifyAssigneeChanged(null, nextAssignee, currentUserId)) {
          void notifyTaskChange({
            type: "task_assignee_changed",
            recipientId: payload.assignee_id!,
            taskTitle: payload.title,
          });
        }
      }
```

- [ ] **Step 4: `handleDragEnd`に発火判定を組み込む**

`handleDragEnd`内（`page.tsx:368-378`付近）、`toast.success("移動しました");`の直前に追加:
```ts
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", draggableId);

      if (error) {
        setTasks(prevTasks);
        toast.error("ステータスの更新に失敗しました");
        return;
      }

      const prevReview = {
        status: normalizeStatus(task.status),
        reviewerId: task.reviewer_id,
      };
      const nextReview = { status: newStatus, reviewerId: task.reviewer_id };
      if (shouldNotifyReviewAssigned(prevReview, nextReview, currentUserId)) {
        void notifyTaskChange({
          type: "task_review_assigned",
          recipientId: task.reviewer_id!,
          taskTitle: task.title,
        });
      }

      toast.success("移動しました");
```

`handleDragEnd`の依存配列（`page.tsx:380`付近の`[tasks]`）に`notifyTaskChange`と`currentUserId`を追加:
```ts
    [tasks, notifyTaskChange, currentUserId]
```

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: `npm test`が全件通ることを確認**

Run: `npm test`
Expected: 既存テストすべてPASS（Task 3・4で追加した分も含む）

- [ ] **Step 7: 開発サーバーでの手動確認**

`npm run dev`後、`/clubtasks`で以下を確認する（`RESEND_API_KEY`が未設定ならブラウザのネットワークタブで`task-notification`へのPOSTが200で返ることを確認すれば十分。実送信の確認は本番デプロイ後にオーナーが行う）:
1. 新規タスクを「レビュー待ち」＋レビュー者指定で作成 → POSTが飛ぶ
2. 「未対応」のタスクをドラッグで「レビュー待ち」に移動 → POSTが飛ぶ
3. 既に「レビュー待ち」のタスクでレビュー者だけを変更して保存 → POSTが飛ぶ
4. 自分自身をレビュー者に設定して自分で移動 → POSTが飛ばない
5. 担当者を新しく設定して保存 → 担当者アサイン用のPOSTが飛ぶ

- [ ] **Step 8: コミット**

```bash
git add "app/(club)/clubtasks/page.tsx"
git commit -m "feat: タスクのレビュー移行・担当者アサイン通知を配線"
```

---

### Task 8: `/mypage`からの導線とマイグレーション自己レビュー

**Files:**
- Modify: `app/mypage/page.tsx`

- [ ] **Step 1: マイページに通知設定へのリンクを追加**

`app/mypage/page.tsx:932`（プロフィール情報の`</section>`閉じタグ）の直後に新規セクションを追加:
```tsx
            </section>

            {/* 通知設定への導線 */}
            <section className="mb-10">
              <Link
                href="/mypage/notifications"
                className="inline-flex items-center gap-2 text-sm font-bold text-ink hover:underline"
              >
                <Bell className="w-4 h-4" aria-hidden="true" />
                通知設定を開く
              </Link>
            </section>
```

`app/mypage/page.tsx:6-21`のlucide-reactのimportに`Bell`を追加する:
```ts
import {
  LayoutDashboard,
  Bookmark,
  CalendarDays,
  CalendarCheck,
  Clock,
  MapPin,
  Video,
  ChevronRight,
  Plus,
  Mail,
  Users,
  ClipboardList,
  MessageCircle,
  X,
  Bell,
} from "lucide-react";
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: 全体テスト**

Run: `npx tsc --noEmit && npm test`
Expected: エラーなし・全テストPASS

- [ ] **Step 4: ビルド確認**

⚠️ 開発サーバーが起動中なら先に停止してから実行する（CLAUDE.md「開発サーバー稼働中に`npm run build`を叩くと`.next`が壊れる」）。

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 5: コミット**

```bash
git add app/mypage/page.tsx
git commit -m "feat: マイページに通知設定への導線を追加"
```

---

## 完了条件

- [ ] `npx tsc --noEmit && npm test` が通る
- [ ] `npm run build` が通る
- [ ] マイグレーション046が本番Supabaseに適用済み
- [ ] `/mypage/notifications`で所属団体ごとにトグルが表示され、ON/OFFが保持される
- [ ] `/clubtasks`でレビュー移行・担当者アサインの操作時にメールAPIへのリクエストが飛ぶ（自分宛て・オプトアウト時は飛ばない）

## スコープ外（このplanでは対応しない）

- チャット・claim系など既存通知のオプトアウト化
- アプリ内通知（未読バッジ・通知一覧画面）
- 「ProofLoopからのお知らせ」等、レジストリ未登録の将来の通知タイプ
- 実際のResend送信ログでの到達確認（本番デプロイ後、オーナーが実運用の中で確認）

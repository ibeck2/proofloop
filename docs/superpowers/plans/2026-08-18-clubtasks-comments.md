# /clubtasks コメント・活動ログ機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/clubtasks`の各タスクにコメント（活動ログ）を追加できるようにする。投稿後の編集・削除はできない、追記のみの記録として設計する。コメント投稿時、担当者・レビュー者・作成者（投稿者自身を除く）へオプトアウト可能なメール通知を送る。

**Architecture:** 新規テーブル`task_comments`（`task_id`にぶら下がる、`organization_id`はBEFORE INSERTトリガーで`tasks`から自動導出）。**コメントは活動ログとして投稿後の編集・削除機能を作らない設計のため、RLSポリシーはSELECT/INSERTの2つのみ**（UPDATE/DELETEポリシーを一切作らない＝PostgreSQLレベルで誰にも書き換え・削除ができない）。UPDATE経路が存在しないため、チェックリスト機能（`task_checklist_items`）で問題になった「列指定UPDATEトリガーの穴」という脆弱性クラスは、この設計では原理的に発生し得ない。通知は既存の`notification_preferences`基盤に新しい通知タイプ`task_comment_added`を追加し、既存の`/api/emails/task-notification`ルートに3つ目のtypeとして統合する。編集モーダル内に新設する`CommentSection`コンポーネントが自分でSupabaseへの読み書きを行い、投稿成功時に`page.tsx`側のコールバックを呼んで通知をトリガーする。投稿ボタンは`<form>`要素を使わない（チェックリスト機能で発生したフォーム入れ子バグの教訓）。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase（Postgres・RLS）/ Resend / vitest

## Global Constraints
- ロジックは`lib/`に純粋関数として切り出しテストする（CLAUDE.md §5）。UIコンポーネントに計算を埋め込まない。
- デザインは`lib/design/tokens.ts`の6色トークンのみ使用（ink/seal/paper/mist/rule/graphite）。新しい色を足さない。
- 型チェックは`npx tsc --noEmit`を使う（`npm run build`は使わない）。
- 各タスクの最後で`npm test`を実行し、既存テスト＋新規テストがすべて通ることを確認してからコミットする。
- 新規テーブルのRLSは既存`tasks`テーブルの`tasks_*_own_org`パターン（`organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))`、roleを見ない）を踏襲するが、**SELECT/INSERTのみ**とする（本機能は活動ログであり編集・削除機能を作らないため）。
- `organization_id`はクライアントから受け取らず、BEFORE INSERTトリガーで`tasks.organization_id`から自動導出する。
- メール送信は既存の`/api/emails/*`パターン（Bearer認証・DBに問い合わせない・受け取った値をそのままResendへ渡す・`RESEND_API_KEY`未設定時は開発向けスキップでHTTP 200）を踏襲する。新しい通知は`notification_preferences`基盤に乗せ、`is_notification_enabled`（SECURITY DEFINER RPC）経由でオプトアウトを確認してから送る。
- 呼び出し側からのメール送信はawaitしないfire-and-forget（既存の`notifyTaskChange`と同じベストエフォート）。
- モーダル内に新設するUIは、既存の`<form onSubmit={handleSave}>`の中に置かれる。**`<form>`要素を新たに作らない**（ネストしたformのsubmitイベントが外側のフォームにバブリングし、タスクの意図しない保存・モーダルの意図しない終了を引き起こすバグが`ChecklistSection`で実際に発生し修正済み。同じ罠を踏まない。投稿ボタンは`type="button"`＋`onClick`にする）。
- Supabase本番プロジェクトID：`uhhofjcyotfyrlhaguvy`。マイグレーション適用は`mcp__claude_ai_Supabase__apply_migration`、検証は`mcp__claude_ai_Supabase__execute_sql`を使う。

---

## File Structure

**新規作成：**
- `supabase/migrations/053_task_comments.sql` — テーブル・RLS（SELECT/INSERTのみ）・organization_id自動導出トリガー（BEFORE INSERTのみ）
- `app/(club)/clubtasks/CommentSection.tsx` — コメント一覧（新しい順）・投稿

**変更：**
- `lib/types/task.ts` — `CommentRow`型を追加
- `lib/tasks/taskFormatting.ts`（+テスト）— `formatDateTime`関数を追加（コメントのタイムスタンプ表示用）
- `lib/types/notificationPreference.ts` — `NotificationType`に`"task_comment_added"`を追加
- `lib/notifications/registry.ts` — `NOTIFICATION_REGISTRY`に`task_comment_added`のメタデータを追加
- `lib/tasks/taskNotificationTriggers.ts`（+テスト）— `commentNotificationRecipients`関数を追加
- `app/api/emails/task-notification/route.ts` — `type`に`"task_comment_added"`を追加し、対応するメール文面を実装
- `app/(club)/clubtasks/page.tsx` — `notifyTaskChange`の`type`型拡張、`handleCommentAdded`コールバック追加、編集モーダルへの`CommentSection`組み込み

---

### Task 1: マイグレーション（テーブル・RLS・トリガー）

**Files:**
- Create: `supabase/migrations/053_task_comments.sql`

**Interfaces:**
- Produces: テーブル`public.task_comments(id, task_id, organization_id, author_id, body, created_at)`。`organization_id`はクライアントが送らなくても、BEFORE INSERTトリガーが`tasks.organization_id`から自動的に埋める（Task 4のクライアントコードはinsert時に`organization_id`を含めない）。

- [ ] **Step 1: マイグレーションファイルを書く**

`supabase/migrations/053_task_comments.sql`を作成：

```sql
-- 053 task_comments: タスクへのコメント（活動ログ）
--
-- 投稿後の編集・削除機能を作らない設計（活動ログとしての性質上、後から書き換え
-- られる記録には価値が無い）。そのためRLSポリシーはSELECT/INSERTの2つのみで、
-- UPDATE/DELETEポリシーを一切作らない＝PostgreSQLレベルで誰にも（adminであっても
-- クライアント経由では）書き換え・削除ができない。
--
-- UPDATE経路がテーブルに一切存在しないため、organization_id自動導出トリガーは
-- BEFORE INSERTのみでよい。task_checklist_items（048/050）で問題になった
-- 「BEFORE INSERT OR UPDATE OF task_id という列指定トリガーの穴（task_idを
-- 触らずorganization_idだけを直接PATCHするとトリガーが発火しない）」という
-- 脆弱性クラスは、そもそもUPDATEの実行経路が無いこの設計では原理的に発生し得ない。
-- 詳細はdocs/task-board.mdセクションS参照。

CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_org_id ON public.task_comments(organization_id);

-- organization_id の自動導出（クライアント送信値は無視して上書きする）
CREATE OR REPLACE FUNCTION public.set_task_comment_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_comment_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_task_comment_org() FROM anon, authenticated;

-- BEFORE INSERT のみ（UPDATEポリシーが無いため、UPDATE自体が発生しない）
CREATE TRIGGER task_comments_set_org
  BEFORE INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_task_comment_org();

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_select_own_org"
  ON public.task_comments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_comments_insert_own_org"
  ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- UPDATE/DELETEポリシーは意図的に作らない（活動ログは追記のみ）
```

- [ ] **Step 2: 本番Supabase（project `uhhofjcyotfyrlhaguvy`）に適用**

`mcp__claude_ai_Supabase__apply_migration`で上記ファイルを適用する。適用前に`mcp__claude_ai_Supabase__list_tables`で`task_comments`が存在しないことを確認し、適用後に`mcp__claude_ai_Supabase__get_advisors(type: "security")`で新規の警告が増えていないことを確認する。

- [ ] **Step 3: 動作確認（BEGIN...ROLLBACKで実地検証）**

まず実在するタスク1件のIDと、そのタスクが属する団体のメンバー（user_id）を1人特定する（`mcp__claude_ai_Supabase__execute_sql`で`SELECT id, organization_id FROM public.tasks LIMIT 1;`→`SELECT user_id FROM public.organization_members WHERE organization_id = '<上のorganization_id>' LIMIT 1;`）。同時に、**その団体に所属しない**別のユーザーも1人特定する。

その2つのuser_idと1つのtask_idを使い、`mcp__claude_ai_Supabase__execute_sql`で以下を1回のクエリとして実行する：

```sql
BEGIN;

-- ---- ケース1：団体メンバーが自分の団体のタスクにコメントを投稿できる ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<member_user_id>')::text, true);

INSERT INTO public.task_comments (task_id, author_id, body)
VALUES ('<task_id>', '<member_user_id>', 'RLS検証用コメント')
RETURNING id, task_id, organization_id, body;
-- 期待：1行返る。organization_idはtasksの実際のorganization_idと一致する

-- ---- ケース2：非メンバーは同じタスクにコメントを投稿できない ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<non_member_user_id>')::text, true);

INSERT INTO public.task_comments (task_id, author_id, body)
VALUES ('<task_id>', '<non_member_user_id>', '非メンバーからの投稿（失敗するはず）');
-- 期待：new row violates row-level security policy エラーになる

-- ---- ケース3：投稿済みコメントは（団体メンバーであっても）UPDATE/DELETEできない ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '<member_user_id>')::text, true);

DO $$
BEGIN
  UPDATE public.task_comments SET body = '改ざん' WHERE body = 'RLS検証用コメント';
  RAISE NOTICE 'CASE3_UPDATE_UNEXPECTED_SUCCESS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'CASE3_UPDATE_REJECTED: %', SQLERRM;
END $$;

DO $$
BEGIN
  DELETE FROM public.task_comments WHERE body = 'RLS検証用コメント';
  RAISE NOTICE 'CASE3_DELETE_UNEXPECTED_SUCCESS';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'CASE3_DELETE_REJECTED: %', SQLERRM;
END $$;

RESET ROLE;
ROLLBACK;
```

Expected: ケース1は1行返り`organization_id`がタスクの所属団体と一致、ケース2はRLS違反エラー、ケース3はUPDATE・DELETEともに拒否される（`DO`ブロックの`EXCEPTION`分岐に入る。ポリシーが存在しないテーブルへのUPDATE/DELETEは「no policy matched」でRLS違反として拒否される）。`ROLLBACK`により、この検証で挿入した行は本番に残らない。

- [ ] **Step 4: コミット**

```bash
git add supabase/migrations/053_task_comments.sql
git commit -m "$(cat <<'EOF'
feat(clubtasks): コメント（活動ログ）用テーブルtask_commentsを追加

投稿後の編集・削除機能を作らない設計のため、RLSはSELECT/INSERTのみ。
UPDATE経路が存在しないため、organization_id自動導出トリガーはBEFORE
INSERTのみで足りる（task_checklist_itemsで問題になった列指定UPDATE
トリガーの穴という脆弱性クラスが、この設計では原理的に発生し得ない）。
EOF
)"
```

---

### Task 2: 型定義・日時フォーマット・通知タイプ登録・発火判定（TDD）

**Files:**
- Modify: `lib/types/task.ts`
- Modify: `lib/tasks/taskFormatting.ts`
- Modify: `lib/tasks/taskFormatting.test.ts`
- Modify: `lib/types/notificationPreference.ts`
- Modify: `lib/notifications/registry.ts`
- Modify: `lib/tasks/taskNotificationTriggers.ts`
- Modify: `lib/tasks/taskNotificationTriggers.test.ts`

**Interfaces:**
- Produces: `CommentRow`型（`@/lib/types/task`）。`formatDateTime(iso: string | null | undefined): string`（`@/lib/tasks/taskFormatting`、Task 4で`CommentSection`が使用）。`NotificationType`に`"task_comment_added"`追加（`@/lib/types/notificationPreference`）。`commentNotificationRecipients(task: { assigneeId: string | null; reviewerId: string | null; createdBy: string | null }, authorId: string): string[]`（`@/lib/tasks/taskNotificationTriggers`、Task 4で`page.tsx`が使用）

- [ ] **Step 1: `lib/types/task.ts`に`CommentRow`を追加**

`lib/types/task.ts`の末尾に追記：

```ts

/** タスクへのコメント（task_comments テーブル。投稿後の編集・削除は無い） */
export interface CommentRow {
  id: string;
  task_id: string;
  organization_id: string;
  author_id: string | null;
  body: string;
  created_at?: string;
}
```

- [ ] **Step 2: `lib/types/notificationPreference.ts`に通知タイプを追加**

`lib/types/notificationPreference.ts`の`NotificationType`定義を次に置き換える：

```ts
export type NotificationType =
  | "task_review_assigned"
  | "task_assignee_changed"
  | "task_comment_added";
```

- [ ] **Step 3: `lib/notifications/registry.ts`に通知タイプのメタデータを追加**

`lib/notifications/registry.ts`の`NOTIFICATION_REGISTRY`配列の末尾（`task_assignee_changed`のオブジェクトの直後、`];`の直前）に追加：

```ts
  {
    id: "task_comment_added",
    label: "タスクへのコメント",
    description:
      "自分が担当・レビュー・作成したタスクにコメントが投稿されたときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
```

これにより`/mypage/notifications`（`getOptionalNotificationTypes()`を使って描画している）に自動的に新しい通知種別が表示される。このページ自体の変更は不要。

- [ ] **Step 4: 失敗するテストを書く（`lib/tasks/taskFormatting.test.ts`）**

`lib/tasks/taskFormatting.test.ts`の末尾に追記：

```ts

describe("formatDateTime", () => {
  it("returns an em dash for a missing date", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("returns an em dash for an unparseable date", () => {
    expect(formatDateTime("not-a-date")).toBe("—");
  });

  it("formats a valid ISO datetime in ja-JP long form with time", () => {
    const iso = "2026-09-01T10:30:00Z";
    expect(formatDateTime(iso)).toBe(
      new Date(iso).toLocaleString("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  });
});
```

ファイル冒頭のimportを次に置き換える：

```ts
import { describe, expect, it } from "vitest";
import {
  checklistProgressLabel,
  formatDateTime,
  formatDue,
  formatFileSize,
  priorityBadgeClass,
  priorityLabel,
} from "./taskFormatting";
```

- [ ] **Step 5: テストを実行し、失敗することを確認**

Run: `npm test -- taskFormatting`
Expected: FAIL（`formatDateTime`が存在しない）

- [ ] **Step 6: `lib/tasks/taskFormatting.ts`に実装を追加**

ファイル末尾に追記：

```ts

/**
 * コメントのタイムスタンプ表示用。日付だけの formatDue と異なり時刻も含める。
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
```

- [ ] **Step 7: テストを実行し、通ることを確認**

Run: `npm test -- taskFormatting`
Expected: PASS（新規3テストを含め全て成功）

- [ ] **Step 8: 失敗するテストを書く（`lib/tasks/taskNotificationTriggers.test.ts`）**

`lib/tasks/taskNotificationTriggers.test.ts`の末尾に追記：

```ts

describe("commentNotificationRecipients", () => {
  it("returns assignee, reviewer, and creator when all are distinct and none is the author", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-a", reviewerId: "user-r", createdBy: "user-c" },
      "user-author"
    );
    expect(result).toEqual(["user-a", "user-r", "user-c"]);
  });

  it("deduplicates when the same person holds two roles", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-x", reviewerId: "user-x", createdBy: "user-c" },
      "user-author"
    );
    expect(result).toEqual(["user-x", "user-c"]);
  });

  it("excludes the comment author even when they hold a role", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-author", reviewerId: "user-r", createdBy: "user-c" },
      "user-author"
    );
    expect(result).toEqual(["user-r", "user-c"]);
  });

  it("returns an empty array when all roles are null", () => {
    const result = commentNotificationRecipients(
      { assigneeId: null, reviewerId: null, createdBy: null },
      "user-author"
    );
    expect(result).toEqual([]);
  });

  it("returns an empty array when the author holds every role", () => {
    const result = commentNotificationRecipients(
      { assigneeId: "user-author", reviewerId: "user-author", createdBy: "user-author" },
      "user-author"
    );
    expect(result).toEqual([]);
  });
});
```

ファイル冒頭のimportを次に置き換える：

```ts
import { describe, expect, it } from "vitest";
import {
  commentNotificationRecipients,
  shouldNotifyAssigneeChanged,
  shouldNotifyReviewAssigned,
} from "./taskNotificationTriggers";
```

- [ ] **Step 9: テストを実行し、失敗することを確認**

Run: `npm test -- taskNotificationTriggers`
Expected: FAIL（`commentNotificationRecipients`が存在しない）

- [ ] **Step 10: `lib/tasks/taskNotificationTriggers.ts`に実装を追加**

ファイル末尾に追記：

```ts

export interface TaskCommentRoles {
  assigneeId: string | null;
  reviewerId: string | null;
  createdBy: string | null;
}

/**
 * コメント投稿時に通知すべき相手（担当者・レビュー者・作成者）を、
 * 投稿者自身を除き重複無く返す。順序は 担当者→レビュー者→作成者。
 */
export function commentNotificationRecipients(
  task: TaskCommentRoles,
  authorId: string
): string[] {
  const candidates = [task.assigneeId, task.reviewerId, task.createdBy];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of candidates) {
    if (id && id !== authorId && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}
```

- [ ] **Step 11: テストを実行し、通ることを確認**

Run: `npm test -- taskNotificationTriggers`
Expected: PASS（新規5テストを含め全て成功）

- [ ] **Step 12: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 13: コミット**

```bash
git add lib/types/task.ts lib/tasks/taskFormatting.ts lib/tasks/taskFormatting.test.ts lib/types/notificationPreference.ts lib/notifications/registry.ts lib/tasks/taskNotificationTriggers.ts lib/tasks/taskNotificationTriggers.test.ts
git commit -m "feat(clubtasks): コメントの型・日時フォーマット・通知タイプ登録・発火判定を追加"
```

---

### Task 3: メール送信APIにコメント通知タイプを統合

**Files:**
- Modify: `app/api/emails/task-notification/route.ts`

**Interfaces:**
- Consumes: なし（既存ルートへの追加のみ）
- Produces: `POST /api/emails/task-notification`が`type: "task_comment_added"`を受け付けるようになる（Task 4で`page.tsx`の`notifyTaskChange`がこのtypeを送信する）

- [ ] **Step 1: `TaskNotificationBody`型に`task_comment_added`を追加**

`app/api/emails/task-notification/route.ts`の`type TaskNotificationBody = { type?: "task_review_assigned" | "task_assignee_changed"; ... };`を次に置き換える：

```ts
type TaskNotificationBody = {
  type?: "task_review_assigned" | "task_assignee_changed" | "task_comment_added";
  email?: string;
  recipientName?: string;
  actorName?: string;
  taskTitle?: string;
  organizationName?: string;
};
```

- [ ] **Step 2: バリデーションのif文を3値対応に拡張**

`if (type !== "task_review_assigned" && type !== "task_assignee_changed") { ... }`を次に置き換える：

```ts
    if (
      type !== "task_review_assigned" &&
      type !== "task_assignee_changed" &&
      type !== "task_comment_added"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "type（task_review_assigned/task_assignee_changed/task_comment_added）が不正です",
        },
        { status: 400 }
      );
    }
```

- [ ] **Step 3: コメント通知のメール文面を組み立てる関数を追加**

`buildAssigneeChangedHtml`関数の定義の直後（`type TaskNotificationBody`の定義の直前）に追加：

```ts
function buildCommentAddedHtml(
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
      <strong style="color:#0f172a;">${actor}</strong>さんが、<strong style="color:#0f172a;">${org}</strong>のタスク「<strong style="color:#0f172a;">${title}</strong>」にコメントを投稿しました。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      内容を確認してください。
    </p>
    ${ctaButton(tasksUrl, "タスク一覧を開く")}`;
  return emailShell("タスクにコメントが投稿されました", body);
}
```

- [ ] **Step 4: 件名・本文の分岐を3値対応に拡張**

次のブロック（`if (type === "task_review_assigned") { ... } else { ... }`。POST関数内、`const tasksUrl = ...`の直後にある）：

```ts
    if (type === "task_review_assigned") {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」のレビューを依頼されました`;
      html = buildReviewAssignedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    } else {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」の担当者に指定されました`;
      html = buildAssigneeChangedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    }
```

を次に置き換える：

```ts
    if (type === "task_review_assigned") {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」のレビューを依頼されました`;
      html = buildReviewAssignedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    } else if (type === "task_assignee_changed") {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」の担当者に指定されました`;
      html = buildAssigneeChangedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    } else {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」にコメントが投稿されました`;
      html = buildCommentAddedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    }
```

- [ ] **Step 5: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS（このルートに対する自動テストは無いため、既存テストの回帰確認のみ）

- [ ] **Step 6: コミット**

```bash
git add app/api/emails/task-notification/route.ts
git commit -m "feat(clubtasks): タスク通知APIにコメント投稿通知（task_comment_added）を追加"
```

---

### Task 4: `CommentSection`コンポーネント・通知トリガー・編集モーダルへの組み込み

**Files:**
- Create: `app/(club)/clubtasks/CommentSection.tsx`
- Modify: `app/(club)/clubtasks/page.tsx`

**Interfaces:**
- Consumes: `CommentRow`（`@/lib/types/task`、Task 2）、`formatDateTime`（`@/lib/tasks/taskFormatting`、Task 2）、`commentNotificationRecipients`（`@/lib/tasks/taskNotificationTriggers`、Task 2）
- Produces: `CommentSection`（デフォルトexport）。Props：`{ taskId: string; memberNameById: Record<string, string>; onCommentAdded: () => void }`

- [ ] **Step 1: `app/(club)/clubtasks/CommentSection.tsx`を作成**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Textarea } from "@/components/ui";
import type { CommentRow } from "@/lib/types/task";
import { formatDateTime } from "@/lib/tasks/taskFormatting";

type Props = {
  taskId: string;
  memberNameById: Record<string, string>;
  onCommentAdded: () => void;
};

export default function CommentSection({
  taskId,
  memberNameById,
  onCommentAdded,
}: Props) {
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_comments")
      .select("id, task_id, organization_id, author_id, body, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("comments fetch error:", error);
      toast.error("コメントの読み込みに失敗しました");
      return;
    }
    setItems((data as CommentRow[]) ?? []);
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async () => {
    const body = newBody.trim();
    if (!body) return;
    setPosting(true);
    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      body,
    });
    setPosting(false);
    if (error) {
      console.error("comment insert error:", error);
      toast.error("コメントの投稿に失敗しました");
      return;
    }
    setNewBody("");
    await load();
    onCommentAdded();
  };

  return (
    <div>
      <label className="block text-sm font-bold text-ink mb-1">
        コメント・活動ログ
      </label>
      {loading ? (
        <p className="text-xs text-graphite/70">読み込み中...</p>
      ) : (
        <ul className="space-y-2 mb-2 max-h-48 overflow-y-auto">
          {items.length === 0 && (
            <li className="text-xs text-graphite/70">
              コメントはまだありません。
            </li>
          )}
          {items.map((item) => (
            <li
              key={item.id}
              className="text-sm border-b border-rule pb-2 last:border-b-0"
            >
              <p className="text-xs text-graphite/60 flex items-center gap-1 mb-0.5">
                <span className="font-medium text-ink">
                  {(item.author_id && memberNameById[item.author_id]) ||
                    "（元メンバー）"}
                </span>
                <span>・{formatDateTime(item.created_at)}</span>
              </p>
              <p className="text-ink whitespace-pre-wrap">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
      <Textarea
        value={newBody}
        onChange={(e) => setNewBody(e.target.value)}
        placeholder="コメントを追加"
        rows={2}
        disabled={posting}
        className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink mb-2"
      />
      <Button
        type="button"
        variant="outlineMuted"
        onClick={handlePost}
        disabled={posting || !newBody.trim()}
      >
        {posting ? "投稿中..." : "コメントを投稿"}
      </Button>
    </div>
  );
}
```

**注意**：投稿ボタンは`type="button"`＋`onClick`であり、`<form>`要素を一切使わない。`ChecklistSection`で発生した「ネストしたformのsubmitイベントが外側のタスク編集フォームにバブリングし、モーダルが意図せず閉じる」バグと同じ構造を避けるための意図的な選択（`AttachmentSection`と同じ方針）。

- [ ] **Step 2: `page.tsx`の`notifyTaskChange`の型を拡張**

`app/(club)/clubtasks/page.tsx`内の次のブロック（`notifyTaskChange`の`useCallback`の型定義）：

```tsx
  const notifyTaskChange = useCallback(
    async (params: {
      type: "task_review_assigned" | "task_assignee_changed";
      recipientId: string;
      taskTitle: string;
    }) => {
```

を次に置き換える：

```tsx
  const notifyTaskChange = useCallback(
    async (params: {
      type:
        | "task_review_assigned"
        | "task_assignee_changed"
        | "task_comment_added";
      recipientId: string;
      taskTitle: string;
    }) => {
```

- [ ] **Step 3: `handleCommentAdded`コールバックを追加**

`app/(club)/clubtasks/page.tsx`内の次の行（`const notifyTaskChange = useCallback(`。この文字列で一意に検索できる）の直前に追加する（＝`handleChecklistCountChange`の`useCallback`定義の直後、`notifyTaskChange`の定義の直前）：

```tsx
  const handleCommentAdded = useCallback(() => {
    if (!editingTask) return;
    const recipients = commentNotificationRecipients(
      {
        assigneeId: editingTask.assignee_id,
        reviewerId: editingTask.reviewer_id,
        createdBy: editingTask.created_by,
      },
      currentUserId ?? ""
    );
    for (const recipientId of recipients) {
      void notifyTaskChange({
        type: "task_comment_added",
        recipientId,
        taskTitle: editingTask.title,
      });
    }
  }, [editingTask, currentUserId, notifyTaskChange]);
```

`app/(club)/clubtasks/page.tsx`冒頭にある次のimportブロック（この内容で一意に検索できる）：

```tsx
import {
  shouldNotifyReviewAssigned,
  shouldNotifyAssigneeChanged,
} from "@/lib/tasks/taskNotificationTriggers";
```

を次に置き換える：

```tsx
import {
  shouldNotifyReviewAssigned,
  shouldNotifyAssigneeChanged,
  commentNotificationRecipients,
} from "@/lib/tasks/taskNotificationTriggers";
```

- [ ] **Step 4: 編集モーダルに`CommentSection`を組み込む**

`app/(club)/clubtasks/page.tsx`内の次のブロック（`{editingTask ? ( <> <ChecklistSection .../> <AttachmentSection .../> </> ) : ( <p ...>チェックリスト・添付ファイルは保存後に追加できます。</p> )}`、この文字列で一意に検索できる）：

```tsx
              {editingTask ? (
                <>
                  <ChecklistSection
                    taskId={editingTask.id}
                    onCountChange={handleChecklistCountChange}
                  />
                  <AttachmentSection
                    taskId={editingTask.id}
                    organizationId={editingTask.organization_id}
                  />
                </>
              ) : (
                <p className="text-xs text-graphite/60">
                  チェックリスト・添付ファイルは保存後に追加できます。
                </p>
              )}
```

を次に置き換える：

```tsx
              {editingTask ? (
                <>
                  <ChecklistSection
                    taskId={editingTask.id}
                    onCountChange={handleChecklistCountChange}
                  />
                  <AttachmentSection
                    taskId={editingTask.id}
                    organizationId={editingTask.organization_id}
                  />
                  <CommentSection
                    taskId={editingTask.id}
                    memberNameById={memberNameById}
                    onCommentAdded={handleCommentAdded}
                  />
                </>
              ) : (
                <p className="text-xs text-graphite/60">
                  チェックリスト・添付ファイル・コメントは保存後に追加できます。
                </p>
              )}
```

ファイル冒頭のimportに追加（`import AttachmentSection from "./AttachmentSection";`の直後）：

```tsx
import CommentSection from "./CommentSection";
```

- [ ] **Step 5: 型チェック・全テスト実行**

Run: `npx tsc --noEmit && npm test`
Expected: 両方PASS

- [ ] **Step 6: ブラウザで手動確認**

`npm run dev`を起動し、`/clubtasks`で既存タスクの編集モーダルを開く：
- 「コメント・活動ログ」欄が表示され、「コメントはまだありません。」と出ること
- コメントを投稿すると**モーダルが閉じずに**一覧に追加されること（フォーム入れ子バグが再発していないことの確認が最重要）
- 投稿者名・日時が表示されること
- 自分自身が担当者・レビュー者・作成者のいずれでもないタスクにコメントした場合、`is_notification_enabled`のRPC呼び出しが（担当者・レビュー者・作成者それぞれに対して）走ること（`RESEND_API_KEY`が未設定の開発環境ではメール自体は送信されずスキップされるが、コンソールにエラーが出ていないことを確認する）
- 新規タスク作成モーダルでは「チェックリスト・添付ファイル・コメントは保存後に追加できます。」と表示され、3つのUIすべてが出ないこと
- ブラウザのコンソールにエラーが出ていないこと

確認後、開発サーバーを停止する。

- [ ] **Step 7: コミット**

```bash
git add app/\(club\)/clubtasks/CommentSection.tsx app/\(club\)/clubtasks/page.tsx
git commit -m "feat(clubtasks): コメント投稿UIと通知連携を編集モーダルに追加"
```

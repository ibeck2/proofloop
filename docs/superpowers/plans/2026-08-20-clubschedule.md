# `/clubschedule` 日程調整機能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 学生団体が候補日時に対して○/△/×で回答し、既読/未読の可視化と未回答者へのリマインドメールで「調整さん」に対して差別化された日程調整機能を`/clubschedule`に実装する。

**Architecture:** 4つの新規テーブル（`schedule_polls`／`schedule_poll_candidates`／`schedule_poll_responses`／`schedule_poll_views`）をSupabaseに追加し、既存の`get_user_organization_ids`／`get_user_admin_organization_ids`パターンでRLSを団体スコープに閉じる。回答・確定の書き込みはPostgRESTのupsertを使わずSECURITY DEFINER RPCに一本化する（CLAUDE.mdに記録済みのupsert×列権限の落とし穴を回避するため）。UIは既存の`/clubevents`と同じフォーム・カードパターンを踏襲し、一覧（`/clubschedule`）と詳細（`/clubschedule/[id]`）の2ページ構成にする。通知は既存の`notification_preferences`＋`/api/emails/*`パターンをそのまま拡張する。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase (Postgres + RLS) / Tailwind CSS / Resend / vitest

## Global Constraints

- デザイントークンは6色（ink/seal/paper/mist/rule/graphite）のみを使用し、新しい色を追加しない。
- ロジックは`lib/`配下の純粋関数に切り出し、vitestでテストする。UIコンポーネントに計算を埋め込まない。
- DBの列レベル権限・upsert・RLSは`docs/superpowers/specs/2026-08-20-clubschedule-design.md` §4/§5の設計どおりとし、PostgRESTのupsertは一切使わない（RPC経由に統一）。
- 本番マイグレーション適用前に`migration-safety`スキルの手順（本番`BEGIN...ROLLBACK`検証）を必ず踏む。
- 新規通知（`schedule_poll_created`／`schedule_poll_reminder`）はどちらもオプトアウト可能にする（CLAUDE.md §5の必須ルール、既にオーナー承認済み）。
- マイグレーション番号は実装時点の最新（本計画作成時点で065が最新）を`ls supabase/migrations`で再確認し、066以降で採番し直す。

---

## File Structure

新規作成：
- `supabase/migrations/066_schedule_polls.sql` — `schedule_polls`／`schedule_poll_candidates`テーブル・トリガー・RLS
- `supabase/migrations/068_schedule_poll_responses.sql` — `schedule_poll_responses`テーブル・RLS・`submit_schedule_poll_response`RPC
- `supabase/migrations/070_schedule_poll_views.sql` — `schedule_poll_views`テーブル・RLS
- `supabase/migrations/071_schedule_poll_decide.sql` — `decide_schedule_poll_candidate`RPC
- `lib/schedule/scheduleResponse.ts` / `.test.ts` — ○/△/×表示変換
- `lib/schedule/scheduleReadStatus.ts` / `.test.ts` — 未読／既読・未回答／回答済み判定
- `lib/schedule/scheduleReminderTargets.ts` / `.test.ts` — リマインド対象抽出
- `app/api/emails/schedule-notification/route.ts` — 作成通知・リマインドメール送信
- `app/(club)/clubschedule/page.tsx` — 一覧・新規作成
- `app/(club)/clubschedule/[id]/page.tsx` — 詳細（回答マトリクス・既読状況・確定）

変更：
- `lib/types/notificationPreference.ts` — `NotificationType`に2種追加
- `lib/notifications/registry.ts` — `NOTIFICATION_REGISTRY`に2種追加
- `components/ClubSidebar.tsx` — 「日程調整」リンク追加

---

### Task 1: DB migration — `schedule_polls` / `schedule_poll_candidates`

**Files:**
- Create: `supabase/migrations/066_schedule_polls.sql`

**Interfaces:**
- Produces: テーブル`public.schedule_polls(id, organization_id, created_by, title, description, created_at)`、
  `public.schedule_poll_candidates(id, poll_id, organization_id, starts_at, is_decided, created_at)`。
  後続タスクはこの2テーブルのRLS（`get_user_organization_ids(auth.uid())`スコープ）に依存する。

- [ ] **Step 1: 最新マイグレーション番号を確認**

Run: `ls supabase/migrations | sort | tail -3`
Expected: 065番台が最新であることを確認する（既に065以降が存在する場合は本タスク以降の採番を繰り下げる）。

- [ ] **Step 2: マイグレーションファイルを作成**

```sql
-- 066 schedule_polls: 日程調整（poll本体・候補日時）
--
-- 決定候補は schedule_polls に decided_candidate_id 列を持たせる循環参照を避け、
-- schedule_poll_candidates.is_decided の部分ユニーク索引で「1 pollにつき決定候補は
-- 最大1件」をDB側から保証する（decide_schedule_poll_candidate RPCは071で追加）。

CREATE TABLE public.schedule_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_polls_org_id ON public.schedule_polls(organization_id);

CREATE TABLE public.schedule_poll_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.schedule_polls(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  is_decided boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schedule_poll_candidates_poll_id ON public.schedule_poll_candidates(poll_id);
CREATE INDEX idx_schedule_poll_candidates_org_id ON public.schedule_poll_candidates(organization_id);

-- 1 pollにつき決定候補は最大1件
CREATE UNIQUE INDEX uniq_schedule_poll_candidates_decided
  ON public.schedule_poll_candidates(poll_id)
  WHERE is_decided;

-- organization_id の自動導出（task_comments/053と同じパターン）
CREATE OR REPLACE FUNCTION public.set_schedule_poll_candidate_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.schedule_polls WHERE id = NEW.poll_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'poll_id % does not reference an existing schedule_polls row', NEW.poll_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_schedule_poll_candidate_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_schedule_poll_candidate_org() FROM anon, authenticated;

CREATE TRIGGER schedule_poll_candidates_set_org
  BEFORE INSERT ON public.schedule_poll_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_schedule_poll_candidate_org();

ALTER TABLE public.schedule_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_poll_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_polls_select_own_org"
  ON public.schedule_polls FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_polls_insert_own_org"
  ON public.schedule_polls FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_candidates_select_own_org"
  ON public.schedule_poll_candidates FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_candidates_insert_own_org"
  ON public.schedule_poll_candidates FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

-- UPDATE/DELETEポリシーは意図的に作らない。is_decidedの変更は071のRPC（SECURITY DEFINER）
-- 経由に限定し、クライアントからの直接UPDATEは許可しない。
```

- [ ] **Step 3: `migration-safety`スキルを起動し、本番`BEGIN...ROLLBACK`で検証**

`migration-safety`スキルの指示に従い、Supabase MCPの`execute_sql`で以下を確認してからロールバックする：
- `schedule_polls`にorgメンバーとしてINSERTできる／非メンバーとしてはINSERTが拒否される
- `schedule_poll_candidates`をINSERTすると`organization_id`が自動導出される
- 2件目の`is_decided=true`をINSERTしようとするとユニーク制約違反になる

- [ ] **Step 4: 本番へマイグレーション適用**

Supabase MCPの`apply_migration`で適用し、`get_advisors(type: "security")`で新規警告が無いことを確認する。

- [ ] **Step 5: コミット**

```bash
git add supabase/migrations/066_schedule_polls.sql
git commit -m "feat(db): schedule_polls/schedule_poll_candidatesテーブルを追加"
```

---

### Task 2: DB migration — `schedule_poll_responses` + `submit_schedule_poll_response` RPC

**Files:**
- Create: `supabase/migrations/068_schedule_poll_responses.sql`

**Interfaces:**
- Consumes: `public.schedule_poll_candidates(id, organization_id)`（Task 1）、`public.get_user_organization_ids(uuid)`（既存020）
- Produces: `public.schedule_poll_responses(id, candidate_id, organization_id, user_id, response, updated_at)`、
  RPC `public.submit_schedule_poll_response(p_candidate_id uuid, p_response text) RETURNS void`。
  UIタスク（Task 13）はこのRPCを`supabase.rpc("submit_schedule_poll_response", { p_candidate_id, p_response })`で呼ぶ。

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- 068 schedule_poll_responses: 候補日時への回答（○/△/×）
--
-- 書き込みはPostgRESTのupsertを使わず submit_schedule_poll_response RPC に一本化する。
-- 理由：PostgRESTのupsert（ON CONFLICT DO UPDATE）はpayload全列のUPDATE権限を要求し、
-- 主キー相当の列（candidate_id/user_id）にもUPDATE権限が必要になる（CLAUDE.mdに記録済みの
-- profiles upsert事故と同種の罠）。RPCに一本化すればテーブルへの直接UPDATE経路が
-- そもそも存在しないため、この罠を構造的に回避できる。

CREATE TABLE public.schedule_poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.schedule_poll_candidates(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('yes', 'maybe', 'no')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_schedule_poll_responses_candidate_user
  ON public.schedule_poll_responses(candidate_id, user_id);
CREATE INDEX idx_schedule_poll_responses_org_id ON public.schedule_poll_responses(organization_id);
CREATE INDEX idx_schedule_poll_responses_user_id ON public.schedule_poll_responses(user_id);

ALTER TABLE public.schedule_poll_responses ENABLE ROW LEVEL SECURITY;

-- SELECT/INSERTのみ許可。INSERTは直接の初回回答用に残すが、実運用ではRPCが
-- INSERT ... ON CONFLICT DO UPDATE を発行するため、クライアントから直接INSERTを
-- 呼んでも2回目以降は一意制約違反になる（RPC経由のみが正しい書き込み手段）。
CREATE POLICY "schedule_poll_responses_select_own_org"
  ON public.schedule_poll_responses FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_responses_insert_own_org"
  ON public.schedule_poll_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );

-- UPDATEポリシーは作らない（更新はRPC内部のSECURITY DEFINERで行う）。

CREATE OR REPLACE FUNCTION public.submit_schedule_poll_response(
  p_candidate_id uuid, p_response text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_response NOT IN ('yes', 'maybe', 'no') THEN
    RAISE EXCEPTION 'invalid response: %', p_response;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.schedule_poll_candidates
  WHERE id = p_candidate_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'candidate % not found', p_candidate_id;
  END IF;

  IF v_org_id NOT IN (SELECT public.get_user_organization_ids(auth.uid())) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  INSERT INTO public.schedule_poll_responses (candidate_id, organization_id, user_id, response)
  VALUES (p_candidate_id, v_org_id, auth.uid(), p_response)
  ON CONFLICT (candidate_id, user_id)
  DO UPDATE SET response = EXCLUDED.response, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.submit_schedule_poll_response(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_schedule_poll_response(uuid, text) TO authenticated;
```

- [ ] **Step 2: `migration-safety`スキルの手順で本番`BEGIN...ROLLBACK`検証**

確認項目：
- orgメンバーがRPC経由で初回回答→2回目回答（上書き）できる
- 非メンバーがRPC呼び出しで例外になる
- `schedule_poll_responses`への直接UPDATE（RPCを経由しない）が権限エラーで拒否される

- [ ] **Step 3: 本番へ適用し、コミット**

```bash
git add supabase/migrations/068_schedule_poll_responses.sql
git commit -m "feat(db): schedule_poll_responsesとsubmit_schedule_poll_response RPCを追加"
```

---

### Task 3: DB migration — `schedule_poll_views`

**Files:**
- Create: `supabase/migrations/070_schedule_poll_views.sql`

**Interfaces:**
- Consumes: `public.schedule_polls(id, organization_id)`（Task 1）
- Produces: `public.schedule_poll_views(id, poll_id, organization_id, user_id, viewed_at)`。
  Task 13は詳細ページ表示時に`supabase.from("schedule_poll_views").upsert({poll_id, user_id}, { onConflict: "poll_id,user_id", ignoreDuplicates: true })`で書き込む。

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- 070 schedule_poll_views: 日程調整の既読記録（初回閲覧時刻のみ）
--
-- INSERT ... ON CONFLICT DO NOTHING はSET句が無いためUPDATE権限を必要としない
-- （068のresponsesと異なり、ここはRPCを使わずテーブル直接INSERTで安全に書ける）。

CREATE TABLE public.schedule_poll_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.schedule_polls(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_schedule_poll_views_poll_user
  ON public.schedule_poll_views(poll_id, user_id);
CREATE INDEX idx_schedule_poll_views_org_id ON public.schedule_poll_views(organization_id);

CREATE OR REPLACE FUNCTION public.set_schedule_poll_view_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.schedule_polls WHERE id = NEW.poll_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'poll_id % does not reference an existing schedule_polls row', NEW.poll_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_schedule_poll_view_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_schedule_poll_view_org() FROM anon, authenticated;

CREATE TRIGGER schedule_poll_views_set_org
  BEFORE INSERT ON public.schedule_poll_views
  FOR EACH ROW EXECUTE FUNCTION public.set_schedule_poll_view_org();

ALTER TABLE public.schedule_poll_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_poll_views_select_own_org"
  ON public.schedule_poll_views FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_views_insert_own_org"
  ON public.schedule_poll_views FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );

-- UPDATE/DELETEポリシーは作らない（既読は初回記録のみで十分、書き換え不要）。
```

- [ ] **Step 2: `migration-safety`スキルの手順で本番`BEGIN...ROLLBACK`検証**

確認項目：orgメンバーが自分の`user_id`でINSERTできる／他人の`user_id`でのINSERTが拒否される／同じ`(poll_id, user_id)`への2回目のupsert（`ignoreDuplicates: true`相当の`ON CONFLICT DO NOTHING`）がエラーにならず`viewed_at`も上書きされない。

- [ ] **Step 3: 本番へ適用し、コミット**

```bash
git add supabase/migrations/070_schedule_poll_views.sql
git commit -m "feat(db): schedule_poll_viewsテーブルを追加（既読記録）"
```

---

### Task 4: DB migration — `decide_schedule_poll_candidate` RPC

**Files:**
- Create: `supabase/migrations/071_schedule_poll_decide.sql`

**Interfaces:**
- Consumes: `public.schedule_poll_candidates`（Task 1）、`public.get_user_admin_organization_ids(uuid)`（既存020）
- Produces: RPC `public.decide_schedule_poll_candidate(p_candidate_id uuid) RETURNS void`。
  Task 13は`supabase.rpc("decide_schedule_poll_candidate", { p_candidate_id })`で呼ぶ。

- [ ] **Step 1: マイグレーションファイルを作成**

```sql
-- 071 decide_schedule_poll_candidate: 幹事による確定操作
--
-- 呼び出し元がpollの作成者本人、またはその団体のowner/adminであることを内部で確認する。
-- 全メンバーが日程調整を作成できる一方、確定は無関係な人が誤って操作しないよう
-- 作成者/owner/adminに限定する（design spec §5・オーナー承認済み）。

CREATE OR REPLACE FUNCTION public.decide_schedule_poll_candidate(
  p_candidate_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_poll_id uuid;
  v_created_by uuid;
BEGIN
  SELECT c.organization_id, c.poll_id, p.created_by
  INTO v_org_id, v_poll_id, v_created_by
  FROM public.schedule_poll_candidates c
  JOIN public.schedule_polls p ON p.id = c.poll_id
  WHERE c.id = p_candidate_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'candidate % not found', p_candidate_id;
  END IF;

  IF auth.uid() IS DISTINCT FROM v_created_by
     AND v_org_id NOT IN (SELECT public.get_user_admin_organization_ids(auth.uid())) THEN
    RAISE EXCEPTION 'only the poll creator or an org admin can decide a candidate';
  END IF;

  -- 同じpoll内の既存の決定を解除してから、指定候補を決定にする
  -- （部分ユニーク索引が「1 pollにつき決定候補は最大1件」を保証しているため、
  -- 解除せずに次のUPDATEを行うと制約違反になる）。
  UPDATE public.schedule_poll_candidates
  SET is_decided = false
  WHERE poll_id = v_poll_id AND is_decided;

  UPDATE public.schedule_poll_candidates
  SET is_decided = true
  WHERE id = p_candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_schedule_poll_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_schedule_poll_candidate(uuid) TO authenticated;
```

- [ ] **Step 2: `migration-safety`スキルの手順で本番`BEGIN...ROLLBACK`検証**

確認項目：poll作成者が確定できる／owner・adminが確定できる／無関係な一般メンバーが呼ぶと例外になる／既に決定済みの候補がある状態で別候補を決定すると、前の決定が自動的に解除される（部分ユニーク索引違反にならない）。

- [ ] **Step 3: 本番へ適用し、コミット**

```bash
git add supabase/migrations/071_schedule_poll_decide.sql
git commit -m "feat(db): decide_schedule_poll_candidate RPCを追加"
```

---

### Task 5: 純粋関数 — 回答表示変換（`scheduleResponse.ts`）

**Files:**
- Create: `lib/schedule/scheduleResponse.ts`
- Test: `lib/schedule/scheduleResponse.test.ts`

**Interfaces:**
- Produces: `responseLabel(response: string | null | undefined): string`、
  `responseBadgeClass(response: string | null | undefined): string`。
  Task 13（詳細ページ）がこの2関数をインポートして使う。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { responseBadgeClass, responseLabel } from "./scheduleResponse";

describe("responseLabel", () => {
  it("converts yes/maybe/no to ○/△/×", () => {
    expect(responseLabel("yes")).toBe("○");
    expect(responseLabel("maybe")).toBe("△");
    expect(responseLabel("no")).toBe("×");
  });

  it("returns a dash for null, undefined, or unknown values", () => {
    expect(responseLabel(null)).toBe("—");
    expect(responseLabel(undefined)).toBe("—");
    expect(responseLabel("unknown")).toBe("—");
  });
});

describe("responseBadgeClass", () => {
  it("returns a distinct class per response value", () => {
    expect(responseBadgeClass("yes")).not.toBe(responseBadgeClass("maybe"));
    expect(responseBadgeClass("maybe")).not.toBe(responseBadgeClass("no"));
  });

  it("falls back to the default class for unknown values", () => {
    expect(responseBadgeClass(null)).toBe(responseBadgeClass("unknown"));
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/schedule/scheduleResponse.test.ts`
Expected: FAIL（`./scheduleResponse`が存在しない）

- [ ] **Step 3: 実装**

```typescript
/**
 * 日程調整の回答（○/△/×）の表示変換。
 * DB側はtasks.statusと同じ「英語canonical値／UI=日本語ラベル」パターンに
 * 揃えるため、response列は 'yes'/'maybe'/'no' を持つ。
 */

const RESPONSE_LABEL: Record<string, string> = {
  yes: "○",
  maybe: "△",
  no: "×",
};

export function responseLabel(response: string | null | undefined): string {
  return (response && RESPONSE_LABEL[response]) || "—";
}

const RESPONSE_BADGE_CLASS: Record<string, string> = {
  yes: "border border-ink bg-ink text-paper",
  maybe: "border border-rule bg-mist text-ink",
  no: "border border-rule bg-paper text-graphite",
};
const DEFAULT_RESPONSE_BADGE_CLASS = "border border-rule bg-paper text-graphite/50";

export function responseBadgeClass(response: string | null | undefined): string {
  return RESPONSE_BADGE_CLASS[response ?? ""] ?? DEFAULT_RESPONSE_BADGE_CLASS;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/schedule/scheduleResponse.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add lib/schedule/scheduleResponse.ts lib/schedule/scheduleResponse.test.ts
git commit -m "feat: 日程調整の回答表示変換関数を追加"
```

---

### Task 6: 純粋関数 — 既読状態判定（`scheduleReadStatus.ts`）

**Files:**
- Create: `lib/schedule/scheduleReadStatus.ts`
- Test: `lib/schedule/scheduleReadStatus.test.ts`

**Interfaces:**
- Produces: `type ScheduleReadStatus = "unread" | "viewed_no_response" | "responded"`、
  `computeReadStatus(member: ScheduleMemberResponseState, candidateIds: string[]): ScheduleReadStatus`
  （`ScheduleMemberResponseState = { hasViewed: boolean; respondedCandidateIds: string[] }`）。
  Task 13（詳細ページの既読/未読リスト）とTask 7（リマインド対象抽出）が依存する。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { computeReadStatus } from "./scheduleReadStatus";

describe("computeReadStatus", () => {
  const candidateIds = ["c1", "c2", "c3"];

  it("returns responded when the member answered every candidate", () => {
    expect(
      computeReadStatus(
        { hasViewed: true, respondedCandidateIds: ["c1", "c2", "c3"] },
        candidateIds
      )
    ).toBe("responded");
  });

  it("returns viewed_no_response when only some candidates were answered", () => {
    expect(
      computeReadStatus(
        { hasViewed: true, respondedCandidateIds: ["c1"] },
        candidateIds
      )
    ).toBe("viewed_no_response");
  });

  it("returns viewed_no_response when the poll was opened but nothing was answered", () => {
    expect(
      computeReadStatus({ hasViewed: true, respondedCandidateIds: [] }, candidateIds)
    ).toBe("viewed_no_response");
  });

  it("returns unread when the poll was never opened", () => {
    expect(
      computeReadStatus({ hasViewed: false, respondedCandidateIds: [] }, candidateIds)
    ).toBe("unread");
  });

  it("treats a poll with zero candidates as never fully responded", () => {
    expect(computeReadStatus({ hasViewed: false, respondedCandidateIds: [] }, [])).toBe(
      "unread"
    );
    expect(computeReadStatus({ hasViewed: true, respondedCandidateIds: [] }, [])).toBe(
      "viewed_no_response"
    );
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/schedule/scheduleReadStatus.test.ts`
Expected: FAIL（`./scheduleReadStatus`が存在しない）

- [ ] **Step 3: 実装**

```typescript
/**
 * 日程調整の既読/未読判定。「回答済み」は全候補に回答した状態のみを指す
 * （一部の候補だけ回答した状態は viewed_no_response のまま——poll全体としては
 * まだリマインド対象、という扱いにする）。
 */

export type ScheduleReadStatus = "unread" | "viewed_no_response" | "responded";

export interface ScheduleMemberResponseState {
  hasViewed: boolean;
  respondedCandidateIds: string[];
}

export function computeReadStatus(
  member: ScheduleMemberResponseState,
  candidateIds: string[]
): ScheduleReadStatus {
  const respondedSet = new Set(member.respondedCandidateIds);
  const respondedAll =
    candidateIds.length > 0 && candidateIds.every((id) => respondedSet.has(id));

  if (respondedAll) return "responded";
  if (member.hasViewed) return "viewed_no_response";
  return "unread";
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/schedule/scheduleReadStatus.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add lib/schedule/scheduleReadStatus.ts lib/schedule/scheduleReadStatus.test.ts
git commit -m "feat: 日程調整の既読/未読判定関数を追加"
```

---

### Task 7: 純粋関数 — リマインド対象抽出（`scheduleReminderTargets.ts`）

**Files:**
- Create: `lib/schedule/scheduleReminderTargets.ts`
- Test: `lib/schedule/scheduleReminderTargets.test.ts`

**Interfaces:**
- Consumes: `ScheduleReadStatus`（Task 6）
- Produces: `reminderTargetUserIds(members: Array<{ userId: string; status: ScheduleReadStatus }>): string[]`。
  Task 13の「未回答者にリマインドを送る」ボタンが使う。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { reminderTargetUserIds } from "./scheduleReminderTargets";

describe("reminderTargetUserIds", () => {
  it("includes unread and viewed_no_response members, excludes responded members", () => {
    const result = reminderTargetUserIds([
      { userId: "u1", status: "unread" },
      { userId: "u2", status: "viewed_no_response" },
      { userId: "u3", status: "responded" },
    ]);
    expect(result).toEqual(["u1", "u2"]);
  });

  it("returns an empty array when everyone has responded", () => {
    expect(
      reminderTargetUserIds([{ userId: "u1", status: "responded" }])
    ).toEqual([]);
  });

  it("returns an empty array for an empty member list", () => {
    expect(reminderTargetUserIds([])).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/schedule/scheduleReminderTargets.test.ts`
Expected: FAIL（`./scheduleReminderTargets`が存在しない）

- [ ] **Step 3: 実装**

```typescript
import type { ScheduleReadStatus } from "./scheduleReadStatus";

export interface ScheduleMemberStatus {
  userId: string;
  status: ScheduleReadStatus;
}

export function reminderTargetUserIds(members: ScheduleMemberStatus[]): string[] {
  return members.filter((m) => m.status !== "responded").map((m) => m.userId);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/schedule/scheduleReminderTargets.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add lib/schedule/scheduleReminderTargets.ts lib/schedule/scheduleReminderTargets.test.ts
git commit -m "feat: 日程調整のリマインド対象抽出関数を追加"
```

---

### Task 8: 通知タイプの登録

**Files:**
- Modify: `lib/types/notificationPreference.ts`
- Modify: `lib/notifications/registry.ts`

**Interfaces:**
- Produces: `NotificationType`に`"schedule_poll_created"`・`"schedule_poll_reminder"`を追加。
  Task 10（メールAPI）・Task 13（一覧・詳細ページ）が参照する。

- [ ] **Step 1: `NotificationType`に2種追加**

`lib/types/notificationPreference.ts`を以下に置き換える：

```typescript
export type NotificationType =
  | "task_review_assigned"
  | "task_assignee_changed"
  | "task_comment_added"
  | "schedule_poll_created"
  | "schedule_poll_reminder";

export interface NotificationPreferenceRow {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  organization_id: string | null;
  enabled: boolean;
}
```

- [ ] **Step 2: `NOTIFICATION_REGISTRY`に2種追加**

`lib/notifications/registry.ts`の`NOTIFICATION_REGISTRY`配列の末尾（`task_comment_added`の次）に追加：

```typescript
  {
    id: "schedule_poll_created",
    label: "日程調整の新規作成",
    description: "自分が所属する団体で新しい日程調整が作成されたときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
  {
    id: "schedule_poll_reminder",
    label: "日程調整の未回答リマインド",
    description: "自分がまだ回答していない日程調整について、幹事からリマインドが送られたときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
```

- [ ] **Step 3: 型チェックを確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: `/mypage/notifications`で新項目が表示されることを目視確認**

`npm run dev`で開発サーバーを起動し（事前に`netstat -ano | findstr :3000`で先客プロセスが無いことを確認）、
所属団体があるアカウントで`/mypage/notifications`を開き、「日程調整の新規作成」「日程調整の未回答リマインド」
の2項目がチェックボックス付きで表示されることを確認する。

- [ ] **Step 5: コミット**

```bash
git add lib/types/notificationPreference.ts lib/notifications/registry.ts
git commit -m "feat: 日程調整の通知タイプ2種をnotification_preferencesに登録"
```

---

### Task 9: メールAPI — `/api/emails/schedule-notification`

**Files:**
- Create: `app/api/emails/schedule-notification/route.ts`

**Interfaces:**
- Consumes: `RESEND_FROM`（`lib/email/resendFrom.ts`）、`createSupabaseWithBearer`/`getBearerToken`（`lib/supabaseRoute.ts`）
- Produces: `POST /api/emails/schedule-notification`（body: `{ type: "schedule_poll_created" | "schedule_poll_reminder", email, recipientName, actorName, pollTitle, organizationName }`）。
  Task 13がこのエンドポイントを`fetch`で呼ぶ。

- [ ] **Step 1: ファイルを作成**

`app/api/emails/task-notification/route.ts`と同型のHTMLメールシェルを流用し、poll向けの2種類に差し替える。

```typescript
import { Resend } from "resend";
import { NextResponse } from "next/server";
import {
  createSupabaseWithBearer,
  getBearerToken,
} from "@/lib/supabaseRoute";
import { RESEND_FROM } from "@/lib/email/resendFrom";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeSubjectPart(text: string): string {
  return text.replace(/[\r\n ]/g, " ").trim().slice(0, 80) || "日程調整";
}

function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function emailShell(headline: string, bodyHtml: string): string {
  const settingsUrl = `${getAppOrigin()}/mypage/notifications`;
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
                本メールは ProofLoop 運営より自動送信されています。この通知は<a href="${escapeHtml(settingsUrl)}" style="color:#0d9488;text-decoration:underline;">「マイページ」の通知設定</a>からオフにできます。
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

function buildPollCreatedHtml(
  recipientName: string,
  actorName: string,
  pollTitle: string,
  organizationName: string,
  pollUrl: string
): string {
  const name = escapeHtml(recipientName || "メンバー");
  const actor = escapeHtml(actorName || "メンバー");
  const title = escapeHtml(pollTitle || "日程調整");
  const org = escapeHtml(organizationName || "団体");
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
      <strong style="color:#0f172a;">${name}</strong> 様
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
      <strong style="color:#0f172a;">${actor}</strong>さんが、<strong style="color:#0f172a;">${org}</strong>で日程調整「<strong style="color:#0f172a;">${title}</strong>」を作成しました。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      候補日時に回答をお願いします。
    </p>
    ${ctaButton(pollUrl, "日程調整を開く")}`;
  return emailShell("日程調整が作成されました", body);
}

function buildPollReminderHtml(
  recipientName: string,
  actorName: string,
  pollTitle: string,
  organizationName: string,
  pollUrl: string
): string {
  const name = escapeHtml(recipientName || "メンバー");
  const actor = escapeHtml(actorName || "メンバー");
  const title = escapeHtml(pollTitle || "日程調整");
  const org = escapeHtml(organizationName || "団体");
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
      <strong style="color:#0f172a;">${name}</strong> 様
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
      <strong style="color:#0f172a;">${actor}</strong>さんから、<strong style="color:#0f172a;">${org}</strong>の日程調整「<strong style="color:#0f172a;">${title}</strong>」への回答リマインドが届いています。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      まだ回答していない候補日時にご回答ください。
    </p>
    ${ctaButton(pollUrl, "日程調整を開く")}`;
  return emailShell("日程調整の回答リマインド", body);
}

type ScheduleNotificationBody = {
  type?: "schedule_poll_created" | "schedule_poll_reminder";
  email?: string;
  recipientName?: string;
  actorName?: string;
  pollTitle?: string;
  organizationName?: string;
  pollId?: string;
};

export async function POST(request: Request) {
  try {
    const bearer = getBearerToken(request);
    if (!bearer) {
      return NextResponse.json(
        { ok: false, error: "認証が必要です（Authorization: Bearer）" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseWithBearer(bearer);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "セッションが無効です" },
        { status: 401 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.warn(
        "[api/emails/schedule-notification] RESEND_API_KEY が未設定のためメール送信をスキップしました（開発環境のモック動作）"
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

    const b = body as ScheduleNotificationBody;
    const type = b.type;
    const email = typeof b.email === "string" ? b.email.trim() : "";
    const recipientName =
      typeof b.recipientName === "string" ? b.recipientName.trim() : "";
    const actorName = typeof b.actorName === "string" ? b.actorName.trim() : "";
    const pollTitle = typeof b.pollTitle === "string" ? b.pollTitle.trim() : "";
    const organizationName =
      typeof b.organizationName === "string" ? b.organizationName.trim() : "";
    const pollId = typeof b.pollId === "string" ? b.pollId.trim() : "";

    if (type !== "schedule_poll_created" && type !== "schedule_poll_reminder") {
      return NextResponse.json(
        {
          ok: false,
          error: "type（schedule_poll_created/schedule_poll_reminder）が不正です",
        },
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

    const pollUrl = pollId
      ? `${getAppOrigin()}/clubschedule/${pollId}`
      : `${getAppOrigin()}/clubschedule`;
    let subject: string;
    let html: string;

    if (type === "schedule_poll_created") {
      subject = `【ProofLoop】日程調整「${sanitizeSubjectPart(pollTitle)}」が作成されました`;
      html = buildPollCreatedHtml(recipientName, actorName, pollTitle, organizationName, pollUrl);
    } else {
      subject = `【ProofLoop】日程調整「${sanitizeSubjectPart(pollTitle)}」の回答リマインド`;
      html = buildPollReminderHtml(recipientName, actorName, pollTitle, organizationName, pollUrl);
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

- [ ] **Step 2: 型チェックを確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add app/api/emails/schedule-notification/route.ts
git commit -m "feat: 日程調整の通知メールAPIを追加"
```

---

### Task 10: `ClubSidebar`にナビゲーション追加

**Files:**
- Modify: `components/ClubSidebar.tsx`

**Interfaces:**
- Consumes: `useClubOrganization().withOrgQuery`（既存）
- Produces: `/clubschedule`へのリンク。Task 11・12ページが遷移先として存在する前提でリンクを張る（この時点ではまだ404だが、Task 11完了までの一時的な状態）。

- [ ] **Step 1: `lucide-react`のimportに`CalendarClock`を追加**

`components/ClubSidebar.tsx`の1行目付近のimportを変更：

```typescript
import {
  LayoutDashboard,
  Pencil,
  Users,
  ClipboardList,
  Mail,
  Kanban,
  Megaphone,
  CalendarDays,
  CalendarClock,
  Images,
  Star,
  Wallet,
  LogOut,
} from "lucide-react";
```

- [ ] **Step 2: 「タスク管理」リンクの直後に「日程調整」リンクを追加**

`/clubtasks`の`<Link>`ブロックの直後に挿入：

```typescript
            <Link className={linkClass("/clubschedule", false)} href={withOrgQuery("/clubschedule")}>
              <CalendarClock className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">日程調整</span>
            </Link>
```

`false`（`exact`不指定と同義）にするのは、`/clubschedule/[id]`詳細ページでも一覧と同じ項目をアクティブ表示させるため（`linkClass`は`exact`未指定時に`pathname.startsWith(path + "/")`も含める）。

- [ ] **Step 3: 型チェックを確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add components/ClubSidebar.tsx
git commit -m "feat: ClubSidebarに日程調整へのリンクを追加"
```

---

### Task 11: 一覧・新規作成ページ `/clubschedule`

**Files:**
- Create: `app/(club)/clubschedule/page.tsx`

**Interfaces:**
- Consumes: `useClubOrganization()`（`contexts/ClubOrganizationContext.tsx`）、`Button`/`Input`/`Textarea`（`components/ui`）、
  `asRows`（`lib/supabase-rows.ts`）
- Produces: `schedule_polls`・`schedule_poll_candidates`へのINSERT、作成後に全メンバーへ`schedule_poll_created`通知メール送信。
  Task 12（詳細ページ）へのリンク先になる`/clubschedule/[id]`のURLを生成する。

- [ ] **Step 1: ファイルを作成**

```typescript
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { asRows } from "@/lib/supabase-rows";
import { Button, Input, Textarea } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

type PollRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

type CandidateFlagRow = {
  poll_id: string;
  is_decided: boolean;
};

type CandidateDraft = {
  key: string;
  value: string; // datetime-local文字列
};

function isoToLocalDatetime(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function ClubSchedulePage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [userId, setUserId] = useState<string | null>(null);
  const [polls, setPolls] = useState<PollRow[]>([]);
  const [decidedPollIds, setDecidedPollIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [candidates, setCandidates] = useState<CandidateDraft[]>([
    { key: crypto.randomUUID(), value: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadPolls = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("schedule_polls")
      .select("id, title, description, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("schedule_polls fetch error:", error);
      setPolls([]);
      return;
    }
    setPolls(asRows<PollRow>(data));

    const pollIds = (data ?? []).map((p) => (p as PollRow).id);
    if (pollIds.length === 0) {
      setDecidedPollIds(new Set());
      return;
    }
    const { data: candData, error: candErr } = await supabase
      .from("schedule_poll_candidates")
      .select("poll_id, is_decided")
      .in("poll_id", pollIds)
      .eq("is_decided", true);
    if (candErr) {
      console.error("schedule_poll_candidates fetch error:", candErr);
      setDecidedPollIds(new Set());
      return;
    }
    setDecidedPollIds(
      new Set(asRows<CandidateFlagRow>(candData).map((c) => c.poll_id))
    );
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadPolls();
  }, [orgId, loadPolls]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCandidates([{ key: crypto.randomUUID(), value: "" }]);
    setShowForm(false);
    setErrorMessage(null);
  };

  const addCandidateRow = () => {
    setCandidates((prev) => [...prev, { key: crypto.randomUUID(), value: "" }]);
  };

  const removeCandidateRow = (key: string) => {
    setCandidates((prev) => (prev.length > 1 ? prev.filter((c) => c.key !== key) : prev));
  };

  const updateCandidateRow = (key: string, value: string) => {
    setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, value } : c)));
  };

  const sendCreatedNotifications = useCallback(
    async (pollId: string, pollTitle: string) => {
      if (!orgId || !userId) return;
      const { data: memberRows, error: memErr } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgId);
      if (memErr || !memberRows) return;

      const recipientIds = (memberRows as Array<{ user_id: string }>)
        .map((m) => m.user_id)
        .filter((id) => id !== userId);
      if (recipientIds.length === 0) return;

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .in("id", [...recipientIds, userId]);
      const profiles = (profileRows ?? []) as Array<{
        id: string;
        full_name: string | null;
        display_name: string | null;
        email: string | null;
      }>;
      const nameById: Record<string, string> = {};
      const emailById: Record<string, string> = {};
      for (const p of profiles) {
        nameById[p.id] = p.full_name?.trim() || p.display_name?.trim() || "メンバー";
        if (p.email) emailById[p.id] = p.email.trim();
      }
      const actorName = nameById[userId] || "運営メンバー";

      const {
        data: { session },
      } = await supabase.auth.getSession();

      for (const recipientId of recipientIds) {
        const email = emailById[recipientId];
        if (!email) continue;

        const { data: enabled, error: prefErr } = await supabase.rpc(
          "is_notification_enabled",
          {
            p_user_id: recipientId,
            p_notification_type: "schedule_poll_created",
            p_organization_id: orgId,
          }
        );
        if (prefErr) {
          console.error("is_notification_enabled error:", prefErr);
        } else if (enabled === false) {
          continue;
        }

        fetch("/api/emails/schedule-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : "",
          },
          body: JSON.stringify({
            type: "schedule_poll_created",
            email,
            recipientName: nameById[recipientId] ?? "メンバー",
            actorName,
            pollTitle,
            organizationName: orgName ?? "団体",
            pollId,
          }),
        }).catch((err) => {
          console.error("schedule-notification email error:", err);
        });
      }
    },
    [orgId, orgName, userId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validCandidates = candidates
      .map((c) => c.value.trim())
      .filter((v) => v.length > 0);
    if (!orgId || !title.trim() || validCandidates.length === 0) {
      setErrorMessage("タイトルと候補日時を1件以上入力してください。");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { data: pollData, error: pollErr } = await supabase
        .from("schedule_polls")
        .insert({
          organization_id: orgId,
          created_by: userId,
          title: title.trim(),
          description: description.trim() || null,
        })
        .select("id")
        .single();
      if (pollErr || !pollData) throw pollErr ?? new Error("作成に失敗しました。");

      const pollId = (pollData as { id: string }).id;
      const { error: candErr } = await supabase.from("schedule_poll_candidates").insert(
        validCandidates.map((v) => ({
          poll_id: pollId,
          starts_at: new Date(v).toISOString(),
        }))
      );
      if (candErr) throw candErr;

      resetForm();
      loadPolls();
      void sendCreatedNotifications(pollId, title.trim());
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "作成に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const sortedPolls = useMemo(() => polls, [polls]);

  if (ctxLoading) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite/70">
          管理できる団体がありません。プロフィール編集から団体情報を作成すると、日程調整を利用できるようになります。
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <h2 className="text-2xl font-bold text-ink font-mincho mb-2">日程調整</h2>
      <p className="text-graphite/70 text-sm mb-6">
        候補日時に○/△/×で回答してもらい、未回答のメンバーを一目で確認できます。
      </p>

      {!showForm ? (
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)} className="mb-8">
          新しい日程調整を作成
        </Button>
      ) : (
        <div className="mb-8 p-6 rounded-lg border border-rule bg-paper">
          <h3 className="text-lg font-bold text-ink mb-4">日程調整を作成</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="poll-title" className="block text-sm font-bold text-ink mb-2">
                タイトル <span className="text-ink">*</span>
              </label>
              <Input
                id="poll-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 新歓説明会の日程"
                required
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="poll-description" className="block text-sm font-bold text-ink mb-2">
                補足
              </label>
              <Textarea
                id="poll-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="調整の背景や注意事項があれば入力してください"
                rows={3}
                className="w-full"
              />
            </div>
            <div>
              <span className="block text-sm font-bold text-ink mb-2">
                候補日時 <span className="text-ink">*</span>
              </span>
              <div className="space-y-2">
                {candidates.map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={c.value}
                      onChange={(e) => updateCandidateRow(c.key, e.target.value)}
                      className="flex-1 border border-rule rounded px-3 py-2 text-ink bg-paper focus:ring-1 focus:ring-ink focus:border-ink"
                    />
                    <button
                      type="button"
                      onClick={() => removeCandidateRow(c.key)}
                      aria-label="この候補を削除"
                      className="p-2 text-graphite hover:text-seal transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addCandidateRow}
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-seal transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                候補を追加
              </button>
            </div>
            {errorMessage && (
              <div className="border border-rule border-l-4 border-l-seal bg-mist px-3 py-2" role="alert">
                <p className="text-sm text-graphite">{errorMessage}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "作成中..." : "作成する"}
              </Button>
              <Button type="button" variant="outlineMuted" onClick={resetForm}>
                キャンセル
              </Button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-ink mb-4">これまでの日程調整</h3>
        {sortedPolls.length === 0 ? (
          <p className="text-graphite/70 py-8 text-center border border-dashed border-rule rounded-lg">
            日程調整はまだありません。上のボタンから作成してください。
          </p>
        ) : (
          <div className="space-y-3">
            {sortedPolls.map((poll) => (
              <Link
                key={poll.id}
                href={`/clubschedule/${poll.id}`}
                className="flex items-center gap-4 p-5 rounded-lg border border-rule bg-paper hover:border-ink/30 transition-colors"
              >
                <CalendarClock className="w-5 h-5 text-graphite/70 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-ink font-bold">{poll.title}</h4>
                  {poll.description && (
                    <p className="text-graphite/70 text-sm mt-1 line-clamp-1">{poll.description}</p>
                  )}
                </div>
                {decidedPollIds.has(poll.id) && (
                  <span className="shrink-0 text-xs font-bold border border-ink bg-ink text-paper px-2 py-1">
                    確定済み
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェックを確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: 開発サーバーで作成フローを目視確認**

`npm run dev`（先客プロセス無しを確認してから）で、`/clubschedule?orgId=<所属団体ID>`を開き：
- 「新しい日程調整を作成」→タイトル・候補日時2件を入力→「作成する」で一覧に反映される
- 候補を1件だけ残した状態で削除ボタンが無効化されている（最低1件は残る）ことを確認

- [ ] **Step 4: コミット**

```bash
git add app/(club)/clubschedule/page.tsx
git commit -m "feat: 日程調整の一覧・新規作成ページを追加"
```

---

### Task 12: 詳細ページ `/clubschedule/[id]`

**Files:**
- Create: `app/(club)/clubschedule/[id]/page.tsx`

**Interfaces:**
- Consumes: `responseLabel`/`responseBadgeClass`（Task 5）、`computeReadStatus`/`ScheduleReadStatus`（Task 6）、
  `reminderTargetUserIds`（Task 7）、`useClubOrganization()`
- Produces: 詳細画面（回答マトリクス・既読状況・リマインド送信・確定操作）

- [ ] **Step 1: ファイルを作成**

```typescript
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { asRows } from "@/lib/supabase-rows";
import { Button } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import { responseBadgeClass, responseLabel } from "@/lib/schedule/scheduleResponse";
import { computeReadStatus, type ScheduleReadStatus } from "@/lib/schedule/scheduleReadStatus";
import { reminderTargetUserIds } from "@/lib/schedule/scheduleReminderTargets";

type PollRow = { id: string; title: string; description: string | null; created_by: string | null };
type CandidateRow = { id: string; starts_at: string; is_decided: boolean };
type ResponseRow = { candidate_id: string; user_id: string; response: string };
type ViewRow = { user_id: string };
type MemberRow = { user_id: string; name: string; email: string | null };

function formatCandidateDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const READ_STATUS_LABEL: Record<ScheduleReadStatus, string> = {
  unread: "未読",
  viewed_no_response: "既読・未回答",
  responded: "回答済み",
};

export default function ClubSchedulePollDetailPage() {
  const params = useParams<{ id: string }>();
  const pollId = params.id;
  const { activeOrgId: orgId, activeOrgName: orgName, activeRole, isReady } = useClubOrganization();

  const [userId, setUserId] = useState<string | null>(null);
  const [poll, setPoll] = useState<PollRow | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const [decidingCandidateId, setDecidingCandidateId] = useState<string | null>(null);
  const [remindSending, setRemindSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const loadAll = useCallback(async () => {
    if (!pollId || !orgId) return;
    const [{ data: pollData }, { data: candData }, { data: memberRows }] = await Promise.all([
      supabase.from("schedule_polls").select("id, title, description, created_by").eq("id", pollId).single(),
      supabase
        .from("schedule_poll_candidates")
        .select("id, starts_at, is_decided")
        .eq("poll_id", pollId)
        .order("starts_at", { ascending: true }),
      supabase.from("organization_members").select("user_id").eq("organization_id", orgId),
    ]);

    setPoll((pollData as PollRow) ?? null);
    const candRows = asRows<CandidateRow>(candData);
    setCandidates(candRows);

    const candidateIds = candRows.map((c) => c.id);
    if (candidateIds.length > 0) {
      const { data: respData } = await supabase
        .from("schedule_poll_responses")
        .select("candidate_id, user_id, response")
        .in("candidate_id", candidateIds);
      setResponses(asRows<ResponseRow>(respData));
    } else {
      setResponses([]);
    }

    const { data: viewData } = await supabase
      .from("schedule_poll_views")
      .select("user_id")
      .eq("poll_id", pollId);
    setViews(asRows<ViewRow>(viewData));

    const memberIds = (memberRows as Array<{ user_id: string }> | null)?.map((m) => m.user_id) ?? [];
    if (memberIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, full_name, display_name, email")
        .in("id", memberIds);
      const profiles =
        (profileRows as Array<{
          id: string;
          full_name: string | null;
          display_name: string | null;
          email: string | null;
        }> | null) ?? [];
      setMembers(
        profiles.map((p) => ({
          user_id: p.id,
          name: p.full_name?.trim() || p.display_name?.trim() || "（氏名未設定）",
          email: p.email?.trim() || null,
        }))
      );
    } else {
      setMembers([]);
    }
  }, [pollId, orgId]);

  useEffect(() => {
    if (isReady) loadAll();
  }, [isReady, loadAll]);

  // 詳細ページを開いた時点で既読を記録する（初回のみ、SET句が無いのでUPDATE権限は不要）
  useEffect(() => {
    if (!pollId || !userId) return;
    supabase
      .from("schedule_poll_views")
      .upsert({ poll_id: pollId, user_id: userId }, { onConflict: "poll_id,user_id", ignoreDuplicates: true })
      .then(({ error }) => {
        if (error) console.error("schedule_poll_views upsert error:", error);
      });
  }, [pollId, userId]);

  const candidateIds = useMemo(() => candidates.map((c) => c.id), [candidates]);

  const responsesByUser = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const r of responses) {
      if (!map[r.user_id]) map[r.user_id] = {};
      map[r.user_id][r.candidate_id] = r.response;
    }
    return map;
  }, [responses]);

  const viewedUserIds = useMemo(() => new Set(views.map((v) => v.user_id)), [views]);

  const memberStatuses = useMemo(
    () =>
      members.map((m) => {
        const respondedCandidateIds = Object.keys(responsesByUser[m.user_id] ?? {});
        const status = computeReadStatus(
          { hasViewed: viewedUserIds.has(m.user_id), respondedCandidateIds },
          candidateIds
        );
        return { ...m, status };
      }),
    [members, responsesByUser, viewedUserIds, candidateIds]
  );

  const reminderTargets = useMemo(
    () =>
      reminderTargetUserIds(memberStatuses.map((m) => ({ userId: m.user_id, status: m.status }))),
    [memberStatuses]
  );

  const canDecide = activeRole === "owner" || activeRole === "admin" || poll?.created_by === userId;

  const handleRespond = async (candidateId: string, response: "yes" | "maybe" | "no") => {
    setSavingCandidateId(candidateId);
    setErrorMessage(null);
    try {
      const { error } = await supabase.rpc("submit_schedule_poll_response", {
        p_candidate_id: candidateId,
        p_response: response,
      });
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "回答の保存に失敗しました。");
    } finally {
      setSavingCandidateId(null);
    }
  };

  const handleDecide = async (candidateId: string) => {
    setDecidingCandidateId(candidateId);
    setErrorMessage(null);
    try {
      const { error } = await supabase.rpc("decide_schedule_poll_candidate", {
        p_candidate_id: candidateId,
      });
      if (error) throw error;
      await loadAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "確定に失敗しました。");
    } finally {
      setDecidingCandidateId(null);
    }
  };

  const handleRemind = async () => {
    if (!orgId || !userId || !poll) return;
    setRemindSending(true);
    setErrorMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const actorName =
        members.find((m) => m.user_id === userId)?.name || "運営メンバー";

      for (const recipientId of reminderTargets) {
        const recipient = members.find((m) => m.user_id === recipientId);
        if (!recipient?.email) continue;

        const { data: enabled, error: prefErr } = await supabase.rpc(
          "is_notification_enabled",
          {
            p_user_id: recipientId,
            p_notification_type: "schedule_poll_reminder",
            p_organization_id: orgId,
          }
        );
        if (prefErr) {
          console.error("is_notification_enabled error:", prefErr);
        } else if (enabled === false) {
          continue;
        }

        await fetch("/api/emails/schedule-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          },
          body: JSON.stringify({
            type: "schedule_poll_reminder",
            email: recipient.email,
            recipientName: recipient.name,
            actorName,
            pollTitle: poll.title,
            organizationName: orgName ?? "団体",
            pollId,
          }),
        });
      }
    } catch (err) {
      console.error("reminder send error:", err);
      setErrorMessage("リマインドの送信に失敗しました。");
    } finally {
      setRemindSending(false);
    }
  };

  if (!poll) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <Link
        href="/clubschedule"
        className="inline-flex items-center gap-1.5 text-sm text-graphite/70 hover:text-ink mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        日程調整一覧に戻る
      </Link>
      <h2 className="text-2xl font-bold text-ink font-mincho mb-2">{poll.title}</h2>
      {poll.description && <p className="text-graphite/70 text-sm mb-6">{poll.description}</p>}

      {errorMessage && (
        <div className="border border-rule border-l-4 border-l-seal bg-mist px-3 py-2 mb-6" role="alert">
          <p className="text-sm text-graphite">{errorMessage}</p>
        </div>
      )}

      <div className="mb-8 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">候補日時</th>
              <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">集計</th>
              <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">あなたの回答</th>
              {canDecide && (
                <th className="text-left p-2 border-b border-rule text-graphite/70 font-medium">確定</th>
              )}
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const counts = { yes: 0, maybe: 0, no: 0 };
              for (const r of responses) {
                if (r.candidate_id === c.id && r.response in counts) {
                  counts[r.response as "yes" | "maybe" | "no"] += 1;
                }
              }
              const myResponse = userId ? responsesByUser[userId]?.[c.id] : undefined;
              return (
                <tr key={c.id} className={c.is_decided ? "bg-mist" : undefined}>
                  <td className="p-2 border-b border-rule">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-graphite/70" aria-hidden="true" />
                      {formatCandidateDate(c.starts_at)}
                      {c.is_decided && (
                        <span className="text-xs font-bold border border-ink bg-ink text-paper px-2 py-0.5">
                          確定
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 border-b border-rule">
                    ○{counts.yes} / △{counts.maybe} / ×{counts.no}
                  </td>
                  <td className="p-2 border-b border-rule">
                    <div className="flex gap-1">
                      {(["yes", "maybe", "no"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          disabled={savingCandidateId === c.id}
                          onClick={() => handleRespond(c.id, v)}
                          className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                            myResponse === v
                              ? responseBadgeClass(v)
                              : "border border-rule bg-paper text-graphite hover:border-ink"
                          }`}
                        >
                          {responseLabel(v)}
                        </button>
                      ))}
                    </div>
                  </td>
                  {canDecide && (
                    <td className="p-2 border-b border-rule">
                      <Button
                        variant={c.is_decided ? "outlineMuted" : "primary"}
                        size="sm"
                        disabled={decidingCandidateId === c.id || c.is_decided}
                        onClick={() => handleDecide(c.id)}
                      >
                        {c.is_decided ? "確定済み" : "この候補に決定"}
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink">回答状況（{members.length}人中）</h3>
        <Button
          variant="outlineMuted"
          size="sm"
          disabled={reminderTargets.length === 0 || remindSending}
          onClick={handleRemind}
        >
          {remindSending
            ? "送信中..."
            : `未回答者にリマインドを送る（${reminderTargets.length}人）`}
        </Button>
      </div>
      <div className="space-y-2">
        {memberStatuses.map((m) => (
          <div
            key={m.user_id}
            className="flex items-center justify-between p-3 border border-rule rounded"
          >
            <span className="text-ink text-sm">{m.name}</span>
            <span className="text-xs font-bold text-graphite/70">
              {READ_STATUS_LABEL[m.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 型チェックを確認**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: 開発サーバーでフロー全体を目視確認**

`npm run dev`で、Task 11で作成した日程調整を開き：
- 候補への○/△/×クリックで即座に「あなたの回答」ボタンの見た目が切り替わる
- 別アカウント（別メンバー）でログインし直し、詳細ページを開いただけで一覧の自分の行が「未読」→「既読・未回答」に変わることを確認
- owner/adminアカウントで「この候補に決定」を押すと、他候補に決定済みがあれば自動的に解除され、押した候補だけが「確定」になる
- 一般メンバーアカウントには「確定」列が表示されないことを確認

- [ ] **Step 4: コミット**

```bash
git add "app/(club)/clubschedule/[id]/page.tsx"
git commit -m "feat: 日程調整の詳細ページ（回答マトリクス・既読状況・確定）を追加"
```

---

### Task 13: 全体検証

**Files:** なし（検証のみ）

**Interfaces:** なし

- [ ] **Step 1: 全テストを実行**

Run: `npm test`
Expected: 全ファイルPASS（新規追加した`lib/schedule/*.test.ts`3ファイルを含む）

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: ビルド確認**

開発サーバーが起動中でないことを確認してから実行する（CLAUDE.mdの既知の落とし穴：dev server稼働中のbuildは`.next`を壊す）。

Run: `netstat -ano | findstr :3000`
Expected: 出力なし（先客プロセスが無いことを確認）

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 4: `docs/task-board.md`にセクション追記**

タスクJの「未着手」リストから「日程調整ツール」を除去し、完了セクションとして
本機能の概要・関連コミット・見送った項目（イベント自動変換・タスク連携・cronリマインド）を記録する。

- [ ] **Step 5: コミット**

```bash
git add docs/task-board.md
git commit -m "docs: 日程調整機能（/clubschedule）の完了をtask-board.mdに記録"
```

---

## Self-Review Notes

- **Spec coverage**：design specの§4データモデル（4テーブル）→Task 1-4、§5 RLS→Task 1-4のRLSポリシー、
  §6画面構成→Task 10-12、§7通知配線→Task 8-9・Task 11-12の送信ロジック、§8テスト方針→Task 5-7。
  全項目に対応するタスクがある。
- **Placeholder scan**：各ステップに実コードを記載済み。「TODO」「後で実装」等の記述なし。
- **Type consistency**：`ScheduleReadStatus`（Task 6で定義）を`scheduleReminderTargets.ts`（Task 7）・
  詳細ページ（Task 12）で一貫して使用。RPC名（`submit_schedule_poll_response`／
  `decide_schedule_poll_candidate`／`is_notification_enabled`）はDB定義（Task 2・4・既存046）と
  呼び出し側（Task 11・12）で一致させた。

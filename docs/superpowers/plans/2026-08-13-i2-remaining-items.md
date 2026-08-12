# タスクI2残り3項目 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/task-board.md` タスクI2の残り3項目（`/signup`のclaim復帰・先行申請の再発行UI・middleware確認）を完了し、トークン第1バッチ送信のゲートを閉じる。

**Architecture:** 項目4はsessionStorageキーの共有定数化＋確認メール画面へのURL表示（DB変更なし）。項目5は新規マイグレーション040（`list_rejected_claims`・`reissue_claim_token`）＋`/admin/claims`への「却下済み」セクション追加。項目6はコード変更なし・ドキュメント確認のみ。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase (Postgres + PostgREST) / vitest

## Global Constraints

- 設計書：`docs/superpowers/specs/2026-08-13-i2-remaining-items-design.md`（このプランの全ての判断根拠）
- RLS/RPCを変更する場合、必ず `BEGIN; … ROLLBACK;` で検証してから本番適用の承認を得る（CLAUDE.md）
- ロジックは純粋関数に切り出し、テストを書く。UIコンポーネントに計算を埋め込まない（CLAUDE.md §5）
- 既存の`/admin/claims`のコード規約（RPC名・エラーコードの畳み方）に従う
- Supabaseプロジェクト：project_id `uhhofjcyotfyrlhaguvy`（`docs/accounts-inventory.md`）
- ブランチはmainに直接コミットする（オーナー承認済み・直近セッションと同じ運用）

---

### Task 1: マイグレーション040を書く（DB層）

**Files:**
- Create: `supabase/migrations/040_claim_reissue.sql`（既に作成・下記の内容で存在する）

**Interfaces:**
- Produces: `public.list_rejected_claims() RETURNS TABLE (id uuid, organization_id uuid, organization_name text, organization_university text, organization_claim_status text, channel text, channel_handle text, decision_note text, decided_at timestamptz)`
- Produces: `public.reissue_claim_token(p_claim_id uuid, p_reason text) RETURNS jsonb`（`{ok:true, token:uuid}` または `{ok:false, error:'forbidden'|'invalid'}`）

- [ ] **Step 1: マイグレーションファイルの内容を確認する**

`supabase/migrations/040_claim_reissue.sql` は既に以下の内容で作成済み。実装担当者はこのファイルを開いて、下記と一致していることを確認する（一致していれば以降のstepへ進む。一致しなければ下記の内容で上書きする）：

```sql
-- ============================================
-- 040 タスクI2項目5：先行申請による締め出しへの復旧（再発行）
--
--    設計 docs/superpowers/specs/2026-08-13-i2-remaining-items-design.md
--
--    apply_for_claim（029）は c.status NOT IN ('issued','applied') のとき invalid を
--    返す。却下（reject）は status を 'rejected' に落とすため、第三者が先に申請して
--    却下された場合、以後は正当な団体も含め誰もそのトークンで再申請できない。
--    organization_claims には INSERT/UPDATE ポリシーが無くRPC経由のみが出入口
--    （028参照）なので、運営が却下済みclaimに対して新しいトークンを発行できる
--    RPCを追加する。却下済みclaimの行自体は監査記録として一切変更しない。
-- ============================================


-- --------------------------------------------
-- 1. 却下済みclaimを一覧するRPC（「再発行」の対象）
--
--    list_pending_claims（031）・list_approved_claims（038）と同じ権限モデル。
--    organization_claim_status も返す。却下後に別の申請が承認されて既に解決済み
--    （'unclaimed' でない）なら、フロント側で再発行ボタンを無効化するために使う
--    （無駄な再発行トークンを作らない。トークン自体はapply_for_claimのo.claim_status
--    チェックで安全に弾かれるので、これは正しさではなくUXのための情報）。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.list_rejected_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, organization_university text,
  organization_claim_status text,
  channel text, channel_handle text, decision_note text, decided_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university,
         o.claim_status,
         c.channel, c.channel_handle, c.decision_note, c.decided_at
  FROM public.organization_claims c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE public.is_system_admin() AND c.status = 'rejected'
  ORDER BY c.decided_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_rejected_claims() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_rejected_claims() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_rejected_claims() TO authenticated;


-- --------------------------------------------
-- 2. 却下済みclaimに対して新しいトークンを発行するRPC
--
--    却下済みの行（c）はそのまま監査記録として残し、同じ団体・同じチャネル情報
--    （channel/channel_handle/channel_is_unique）で新しい行を作る。新しい行の
--    decision_note には再発行理由（任意）を、decided_by/decided_at には
--    発行した運営者を記録する（decide_claimが後で上書きする想定の列だが、
--    「誰が・いつ再発行したか」を残す場所として転用する。新しい列を増やさない）。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.reissue_claim_token(p_claim_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  new_token uuid;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id;
  IF NOT FOUND OR c.status <> 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  INSERT INTO public.organization_claims (
    organization_id, channel, channel_handle, channel_is_unique,
    expires_at, decision_note, decided_by, decided_at
  ) VALUES (
    c.organization_id, c.channel, c.channel_handle, c.channel_is_unique,
    now() + interval '90 days', p_reason, auth.uid(), now()
  )
  RETURNING token INTO new_token;

  RETURN jsonb_build_object('ok', true, 'token', new_token);
END;
$$;

REVOKE ALL ON FUNCTION public.reissue_claim_token(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reissue_claim_token(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reissue_claim_token(uuid, text) TO authenticated;
```

- [ ] **Step 2: commit（既にファイルがある場合はこのstepは不要。無ければ作成してcommit）**

```bash
git add supabase/migrations/040_claim_reissue.sql
git status --short
```

作成日時が既存でcommit済みなら`git status --short`に何も出ない。その場合はこのstepをスキップしてTask 2へ進む。まだcommitされていなければ：

```bash
git commit -m "$(cat <<'EOF'
feat(claims): 却下済みclaimの再発行RPCを追加

先行申請で却下されたトークンは誰も再申請できなくなる（タスクI2項目5）。
list_rejected_claims・reissue_claim_tokenを追加し、/admin/claimsから
同じチャネル情報で新しいトークンを発行できるようにする準備。

未適用（本番へは検証後に別途apply_migrationする）。
EOF
)"
```

---

### Task 2: マイグレーション040を本番でBEGIN…ROLLBACK検証する

**Files:** なし（本番Supabaseに対する読み取り専用の検証。書き込みは全てROLLBACKで消す）

**Interfaces:**
- Consumes: Task 1で書いた`supabase/migrations/040_claim_reissue.sql`の内容

- [ ] **Step 1: Supabase MCPで検証スクリプトを実行する**

`mcp__claude_ai_Supabase__execute_sql`（`project_id: "uhhofjcyotfyrlhaguvy"`）で以下を1回のクエリとして実行する。**過去のセッションでこの形の検証スクリプトを書いたとき、`SET LOCAL ROLE authenticated`に切り替えた後に自作の一時テーブルやRLSポリシー無しテーブルを直接読んで失敗したことが2回ある**（CLAUDE.mdの落とし穴に記載済み）。このスクリプトは最初からその対策を織り込んである：一時テーブルには`GRANT SELECT ... TO authenticated`を作成直後に付与し、`organization_claims`/`organizations`への直接SELECTは`RESET ROLE`で強いロールに戻してから行う。

現在の本番実測（2026-08-12時点）：admin権限を持つprofilesが1件、`organization_claims`に`status='rejected'`の行は0件、`organizations`は2,421件。

```sql
BEGIN;

-- ============================================================
-- Task 1 のマイグレーション本体をそのまま貼り付ける
-- （CREATE OR REPLACE FUNCTION public.list_rejected_claims ... 〜
--   GRANT EXECUTE ON FUNCTION public.reissue_claim_token(uuid, text) TO authenticated; まで）
-- ============================================================

-- ============================================================
-- ここから検証
-- ============================================================
CREATE TEMP TABLE _b19t3 (k text PRIMARY KEY, v uuid);
GRANT SELECT ON _b19t3 TO authenticated;

INSERT INTO _b19t3(k, v)
SELECT 'admin', id FROM public.profiles WHERE role = 'admin' LIMIT 1;

INSERT INTO _b19t3(k, v) VALUES
  ('orga', gen_random_uuid()), ('claima', gen_random_uuid()),
  ('orgb', gen_random_uuid()), ('claimb', gen_random_uuid()),
  ('claimc_issued', gen_random_uuid());

DO $$
BEGIN
  IF (SELECT count(*) FROM _b19t3 WHERE k = 'admin') < 1 THEN
    RAISE EXCEPTION 'setup failed: no admin profile found';
  END IF;
END $$;

-- ============================================================
-- フィクスチャA：却下済み・団体は未解決（unclaimed）→ 再発行が意味を持つケース
-- ============================================================
INSERT INTO public.organizations (id, name, university, category, is_approved, claim_status)
SELECT v, '再発行検証団体A', 'テスト大学', 'その他', true, 'unclaimed' FROM _b19t3 WHERE k='orga';

INSERT INTO public.organization_claims
  (id, organization_id, token, channel, channel_handle, channel_is_unique,
   expires_at, status, decided_by, decided_at, decision_note)
SELECT
  (SELECT v FROM _b19t3 WHERE k='claima'), (SELECT v FROM _b19t3 WHERE k='orga'),
  gen_random_uuid(), 'x', '@reissuetestA', true, now() + interval '90 days',
  'rejected', (SELECT v FROM _b19t3 WHERE k='admin'), now() - interval '1 day',
  'テスト却下理由A';

-- 却下済みでない claim（'issued'）。reissue_claim_token が invalid を返すことの確認用
INSERT INTO public.organization_claims
  (id, organization_id, token, channel, channel_handle, channel_is_unique,
   expires_at, status)
SELECT
  (SELECT v FROM _b19t3 WHERE k='claimc_issued'), (SELECT v FROM _b19t3 WHERE k='orga'),
  gen_random_uuid(), 'x', '@reissuetestC', true, now() + interval '90 days', 'issued';

-- ============================================================
-- フィクスチャB：却下済みだが団体は既に別claimで解決済み（claimed）
-- ============================================================
INSERT INTO public.organizations (id, name, university, category, is_approved, claim_status)
SELECT v, '再発行検証団体B', 'テスト大学', 'その他', true, 'claimed' FROM _b19t3 WHERE k='orgb';

INSERT INTO public.organization_claims
  (id, organization_id, token, channel, channel_handle, channel_is_unique,
   expires_at, status, decided_by, decided_at, decision_note)
SELECT
  (SELECT v FROM _b19t3 WHERE k='claimb'), (SELECT v FROM _b19t3 WHERE k='orgb'),
  gen_random_uuid(), 'instagram', 'reissuetestB', true, now() + interval '90 days',
  'rejected', (SELECT v FROM _b19t3 WHERE k='admin'), now() - interval '2 days',
  'テスト却下理由B';

-- ---- Q: 却下済み一覧（admin）。organization_claim_status が正しく出るか ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t3 WHERE k='admin')::text)::text, true);

DO $$
DECLARE ra record; rb record;
BEGIN
  SELECT * INTO ra FROM public.list_rejected_claims()
    WHERE id = (SELECT v FROM _b19t3 WHERE k='claima');
  IF NOT FOUND OR ra.organization_claim_status <> 'unclaimed' OR ra.decision_note <> 'テスト却下理由A' THEN
    RAISE EXCEPTION 'Q failed (A): unexpected row %', ra;
  END IF;

  SELECT * INTO rb FROM public.list_rejected_claims()
    WHERE id = (SELECT v FROM _b19t3 WHERE k='claimb');
  IF NOT FOUND OR rb.organization_claim_status <> 'claimed' THEN
    RAISE EXCEPTION 'Q failed (B): unexpected row %', rb;
  END IF;

  IF EXISTS (SELECT 1 FROM public.list_rejected_claims()
             WHERE id = (SELECT v FROM _b19t3 WHERE k='claimc_issued')) THEN
    RAISE EXCEPTION 'Q failed: issued claim (not rejected) leaked into list_rejected_claims';
  END IF;
END $$;

-- ---- R: 非adminからは0件 ----
SELECT set_config('request.jwt.claims',
  json_build_object('sub', gen_random_uuid()::text)::text, true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.list_rejected_claims()) THEN
    RAISE EXCEPTION 'R failed: non-admin can see rejected claims';
  END IF;
END $$;

RESET ROLE;

-- ---- S: reissue_claim_token（正常系）。新トークンが同じチャネル情報で発行されるか ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t3 WHERE k='admin')::text)::text, true);

DO $$
DECLARE
  rv jsonb;
BEGIN
  rv := public.reissue_claim_token((SELECT v FROM _b19t3 WHERE k='claima'), 'B19検証(S)');
  IF (rv->>'ok')::boolean IS NOT TRUE OR (rv->>'token') IS NULL THEN
    RAISE EXCEPTION 'S failed: reissue_claim_token returned %', rv;
  END IF;
  PERFORM set_config('b19t.new_token', rv->>'token', true);
END $$;

RESET ROLE;

DO $$
DECLARE
  new_row record;
  old_row record;
BEGIN
  SELECT * INTO new_row FROM public.organization_claims
    WHERE token = current_setting('b19t.new_token')::uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'S failed: no new organization_claims row for the returned token';
  END IF;
  IF new_row.organization_id <> (SELECT v FROM _b19t3 WHERE k='orga')
     OR new_row.channel <> 'x' OR new_row.channel_handle <> '@reissuetestA'
     OR new_row.channel_is_unique IS NOT TRUE OR new_row.status <> 'issued' THEN
    RAISE EXCEPTION 'S failed: new row has unexpected content %', new_row;
  END IF;

  -- 元の却下claimは一切変更されていないこと（監査記録の保全）
  SELECT * INTO old_row FROM public.organization_claims
    WHERE id = (SELECT v FROM _b19t3 WHERE k='claima');
  IF old_row.status <> 'rejected' OR old_row.decision_note <> 'テスト却下理由A' THEN
    RAISE EXCEPTION 'S failed: original rejected claim was mutated: %', old_row;
  END IF;
END $$;

-- ---- T: reissue_claim_token（対象が却下済みでない） ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t3 WHERE k='admin')::text)::text, true);

DO $$
DECLARE rv jsonb;
BEGIN
  rv := public.reissue_claim_token((SELECT v FROM _b19t3 WHERE k='claimc_issued'), null);
  IF (rv->>'ok')::boolean IS NOT FALSE OR rv->>'error' <> 'invalid' THEN
    RAISE EXCEPTION 'T failed: expected invalid, got %', rv;
  END IF;
END $$;

-- ---- U: reissue_claim_token（非admin） ----
SELECT set_config('request.jwt.claims',
  json_build_object('sub', gen_random_uuid()::text)::text, true);

DO $$
DECLARE rv jsonb;
BEGIN
  rv := public.reissue_claim_token((SELECT v FROM _b19t3 WHERE k='claima'), null);
  IF (rv->>'ok')::boolean IS NOT FALSE OR rv->>'error' <> 'forbidden' THEN
    RAISE EXCEPTION 'U failed: expected forbidden, got %', rv;
  END IF;
END $$;

RESET ROLE;

SELECT 'ALL 040 CHECKS PASSED (Q/R: listing, S: reissue creates correct row + preserves original, T: invalid target, U: forbidden)' AS result;

ROLLBACK;
```

Expected: 最後の`SELECT`が`ALL 040 CHECKS PASSED ...`を返す。`RAISE EXCEPTION`が発火した場合はどのフェーズ（Q/R/S/T/U）のどの条件で失敗したかを正確に示す。

- [ ] **Step 2: 結果を記録する**

`docs/superpowers/plans/2026-08-13-i2-verification-040.md` を新規作成し、実行結果を記録する（`2026-08-12-b19-verification-039.md`と同じ体裁）。

- [ ] **Step 3: commit**

```bash
git add docs/superpowers/plans/2026-08-13-i2-verification-040.md
git commit -m "docs: マイグレーション040の本番BEGIN…ROLLBACK検証結果を記録"
```

⚠️ **このTaskの完了後、Task 3（本番へのマイグレーション適用）に進む前に、検証結果をユーザーに提示し、明示的な適用の承認を得ること。**

---

### Task 3: マイグレーション040を本番に適用する

**Files:** なし（本番DBへの実書き込み）

**Interfaces:**
- Consumes: Task 1のファイル内容、Task 2で得た検証結果（ユーザー承認込み）

- [ ] **Step 1: ユーザーの明示的な承認を得る**

Task 2の検証結果（成功したこと）を提示し、「この内容で本番に適用してよいか」を確認する。承認が無い限りStep 2に進まない。

- [ ] **Step 2: 本番へ適用する**

`mcp__claude_ai_Supabase__apply_migration`（`project_id: "uhhofjcyotfyrlhaguvy"`、`name: "040_claim_reissue"`）に、`supabase/migrations/040_claim_reissue.sql`の全文を渡して実行する。

- [ ] **Step 3: 適用結果を確認する**

```sql
SELECT proname FROM pg_proc WHERE proname IN ('list_rejected_claims', 'reissue_claim_token') ORDER BY proname;
```

Expected: 2行返る。

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3;
```

Expected: 040系のバージョンが最新行に含まれる。

- [ ] **Step 4: 検証記録に適用結果を追記してcommit**

`docs/superpowers/plans/2026-08-13-i2-verification-040.md` に「本番適用済み（日時）」を追記する。

```bash
git add docs/superpowers/plans/2026-08-13-i2-verification-040.md
git commit -m "docs: マイグレーション040の本番適用完了を記録"
```

---

### Task 4: `lib/claims/types.ts` に `RejectedClaimRow` を追加し、`lib/claims/claimReissue.ts` を書く

**Files:**
- Modify: `lib/claims/types.ts`
- Create: `lib/claims/claimReissue.ts`
- Test: `lib/claims/claimReissue.test.ts`

**Interfaces:**
- Produces: `RejectedClaimRow`（`lib/claims/types.ts`）
- Produces: `claimUrlFromToken(token: string): string`
- Produces: `ReissueClaimTokenErrorCode = "forbidden" | "invalid"`
- Produces: `reissueClaimTokenErrorMessage(code: string | undefined): string`

- [ ] **Step 1: `lib/claims/types.ts` に型を追加する**

`lib/claims/types.ts`の先頭のimportに`ChannelKind`が既に無ければ追加し（`RawSignals`が既に使っている型なので既にimport済みのはず。無ければ`import type { ChannelKind } from "./channels";`を1行目に足す）、末尾（`ApprovedClaimRow`の後）に追記：

```ts
/** list_rejected_claims（040）の戻り値の1行。「再発行」の対象。 */
export type RejectedClaimRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_university: string | null;
  /** 'unclaimed' でなければ既に別のclaimで解決済み。再発行ボタンを無効化する */
  organization_claim_status: OrganizationClaimStatus;
  channel: ChannelKind;
  channel_handle: string | null;
  decision_note: string | null;
  decided_at: string | null;
};
```

- [ ] **Step 2: 失敗するテストを書く**

`lib/claims/claimReissue.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { claimUrlFromToken, reissueClaimTokenErrorMessage } from "./claimReissue";

describe("claimUrlFromToken", () => {
  it("SITE_URLと/claim/<token>を組み立てる", () => {
    expect(claimUrlFromToken("abc-123")).toBe("https://proofloop.jp/claim/abc-123");
  });
});

describe("reissueClaimTokenErrorMessage", () => {
  it("forbidden", () => {
    expect(reissueClaimTokenErrorMessage("forbidden")).toBe("権限がありません");
  });

  it("invalid（対象claimが却下済みでない・存在しない）", () => {
    expect(reissueClaimTokenErrorMessage("invalid")).toContain("却下済み");
  });

  it("未知のコードと undefined は既定の文言", () => {
    expect(reissueClaimTokenErrorMessage(undefined)).toBe("再発行に失敗しました");
    expect(reissueClaimTokenErrorMessage("who_knows")).toBe("再発行に失敗しました");
  });
});
```

- [ ] **Step 3: テストを実行して失敗を確認する**

Run: `npx vitest run lib/claims/claimReissue.test.ts`
Expected: FAIL（`Cannot find module './claimReissue'` またはそれに準ずるエラー）

- [ ] **Step 4: `lib/claims/claimReissue.ts` を実装する**

```ts
import { SITE_URL } from "@/lib/site-url";

/**
 * `reissue_claim_token`（040。却下済みclaimに新しいトークンを発行する）の
 * URL組み立て・エラーコード変換をまとめる純粋関数群。
 * `lib/claims/claimDecision.ts`・`lib/claims/claimRevocation.ts`と同じ形。
 */

export function claimUrlFromToken(token: string): string {
  return `${SITE_URL}/claim/${token}`;
}

export type ReissueClaimTokenErrorCode = "forbidden" | "invalid";

export function reissueClaimTokenErrorMessage(code: string | undefined): string {
  switch (code as ReissueClaimTokenErrorCode | undefined) {
    case "forbidden":
      return "権限がありません";
    case "invalid":
      return "この申請は却下済みではないか、既に見つかりません";
    default:
      return "再発行に失敗しました";
  }
}
```

- [ ] **Step 5: テストを実行して成功を確認する**

Run: `npx vitest run lib/claims/claimReissue.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 6: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 7: commit**

```bash
git add lib/claims/types.ts lib/claims/claimReissue.ts lib/claims/claimReissue.test.ts
git commit -m "feat(claims): 却下済みclaim再発行のURL組み立て・エラー文言を純粋関数化"
```

---

### Task 5: `/signup`のclaim復帰の最小対応（sessionStorageキーの共有定数化込み）

**Files:**
- Create: `lib/claims/returnUrl.ts`
- Modify: `app/claim/[token]/page.tsx`
- Modify: `app/login/page.tsx`
- Modify: `app/signup/page.tsx`

**Interfaces:**
- Produces: `CLAIM_RETURN_KEY`（`lib/claims/returnUrl.ts`）

- [ ] **Step 1: `lib/claims/returnUrl.ts` を作る**

```ts
/**
 * `/claim/[token]` からログイン・新規登録へ離脱した後、同じページへ戻るための
 * sessionStorage キー。3箇所（claim/[token]・login・signup）で同じ文字列を
 * 直接ベタ書きすると、綴りがずれた瞬間に戻れなくなる不具合が気づかれにくい形で起きる。
 */
export const CLAIM_RETURN_KEY = "proofloop.claim.returnTo";
```

- [ ] **Step 2: `app/claim/[token]/page.tsx` を共有定数に切り替える**

Before:
```tsx
import { resolveClaimView, claimErrorMessage, type ClaimPreview } from "@/lib/claims/claimView";

const RETURN_KEY = "proofloop.claim.returnTo";
```

After:
```tsx
import { resolveClaimView, claimErrorMessage, type ClaimPreview } from "@/lib/claims/claimView";
import { CLAIM_RETURN_KEY } from "@/lib/claims/returnUrl";
```

Before:
```tsx
  /** ログイン後にこのページへ戻れるよう、遷移前にトークンを控える */
  const rememberReturn = () => {
    try {
      sessionStorage.setItem(RETURN_KEY, `/claim/${token}`);
    } catch {
```

After:
```tsx
  /** ログイン後にこのページへ戻れるよう、遷移前にトークンを控える */
  const rememberReturn = () => {
    try {
      sessionStorage.setItem(CLAIM_RETURN_KEY, `/claim/${token}`);
    } catch {
```

- [ ] **Step 3: `app/login/page.tsx` を共有定数に切り替える**

Before:
```tsx
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
```

After:
```tsx
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { CLAIM_RETURN_KEY } from "@/lib/claims/returnUrl";
```

Before:
```tsx
        try {
          const back = sessionStorage.getItem("proofloop.claim.returnTo");
          if (back) {
            sessionStorage.removeItem("proofloop.claim.returnTo");
            router.replace(back);
            return;
          }
        } catch {
```

After:
```tsx
        try {
          const back = sessionStorage.getItem(CLAIM_RETURN_KEY);
          if (back) {
            sessionStorage.removeItem(CLAIM_RETURN_KEY);
            router.replace(back);
            return;
          }
        } catch {
```

- [ ] **Step 4: `app/signup/page.tsx` に確認メール送信画面のclaim復帰リンクを追加する**

Before:
```tsx
import { Mail, Repeat } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
```

After:
```tsx
import { Mail, Repeat } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { CLAIM_RETURN_KEY } from "@/lib/claims/returnUrl";
```

Before:
```tsx
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
```

After:
```tsx
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  // claim ページから登録に来た場合、確認メール送信画面で戻り先を案内する。
  // signup は本人確認メールを挟む非同期フローなので、/login のようにその場で
  // 消費して router.replace できない（メールのリンクは別タブで開き、
  // sessionStorage を共有しない）。読むだけで消費しない。
  const [claimReturnPath, setClaimReturnPath] = useState<string | null>(null);
```

Before:
```tsx
      setSignupSuccess(true);
      setSentEmail(uEmail);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (data: CompanySignupForm) => {
```

After:
```tsx
      try {
        setClaimReturnPath(sessionStorage.getItem(CLAIM_RETURN_KEY));
      } catch {
        // 参照できなくても登録自体は成功しているため致命ではない
      }
      setSignupSuccess(true);
      setSentEmail(uEmail);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanySubmit = async (data: CompanySignupForm) => {
```

Before:
```tsx
              <p className="text-graphite text-sm mt-3">
                本人確認のため、入力された大学のメールアドレス（{sentEmail}）に確認リンクを送信しました。リンクをクリックして本登録を完了してください。
              </p>
              <div className="mt-8">
                <Link href="/login" className="text-ink font-bold hover:underline">
                  ログインへ
                </Link>
              </div>
```

After:
```tsx
              <p className="text-graphite text-sm mt-3">
                本人確認のため、入力された大学のメールアドレス（{sentEmail}）に確認リンクを送信しました。リンクをクリックして本登録を完了してください。
              </p>
              {claimReturnPath && (
                <p className="text-graphite text-sm mt-4 leading-relaxed">
                  団体ページの引き取り申請から来られた方は、登録完了後に{" "}
                  <Link href={claimReturnPath} className="text-ink font-bold hover:underline">
                    こちらのリンク
                  </Link>
                  {" "}を開いて申請を続けてください（{claimReturnPath}）。
                </p>
              )}
              <div className="mt-8">
                <Link href="/login" className="text-ink font-bold hover:underline">
                  ログインへ
                </Link>
              </div>
```

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: commit**

```bash
git add lib/claims/returnUrl.ts app/claim/\[token\]/page.tsx app/login/page.tsx app/signup/page.tsx
git commit -m "feat(claim): /signupの確認メール画面にclaim復帰リンクを表示し、returnToキーを共有定数化"
```

---

### Task 6: `/admin/claims` に「却下済み（再発行可能）」セクションを追加する

**Files:**
- Modify: `app/admin/claims/page.tsx`

**Interfaces:**
- Consumes: `RejectedClaimRow`（Task 4）、`claimUrlFromToken`/`reissueClaimTokenErrorMessage`（Task 4）

- [ ] **Step 1: importを追加する**

Before:
```tsx
import {
  claimRevocationErrorMessage,
  canSubmitClaimRevocation,
  revokeClaimSuccessMessage,
} from "@/lib/claims/claimRevocation";
import type { RawSignals, SignalColor, ApprovedClaimRow } from "@/lib/claims/types";
```

After:
```tsx
import {
  claimRevocationErrorMessage,
  canSubmitClaimRevocation,
  revokeClaimSuccessMessage,
} from "@/lib/claims/claimRevocation";
import {
  claimUrlFromToken,
  reissueClaimTokenErrorMessage,
} from "@/lib/claims/claimReissue";
import type {
  RawSignals,
  SignalColor,
  ApprovedClaimRow,
  RejectedClaimRow,
} from "@/lib/claims/types";
```

- [ ] **Step 2: stateとloadRejectedを追加する**

Before:
```tsx
  const [approvedRows, setApprovedRows] = useState<ApprovedClaimRow[]>([]);
  const [openRevokeId, setOpenRevokeId] = useState<string | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [revokeBusyId, setRevokeBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_pending_claims");
    if (error) {
      toast.error("申請の取得に失敗しました");
      setRows([]);
      return;
    }
    setRows((data ?? []) as ClaimRow[]);
  }, []);

  const loadApproved = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_approved_claims");
    if (error) {
      toast.error("承認済み申請の取得に失敗しました");
      setApprovedRows([]);
      return;
    }
    setApprovedRows((data ?? []) as ApprovedClaimRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      const ok = (prof as { role?: string } | null)?.role === "admin";
      setIsAdmin(ok);
      if (!ok) {
        router.replace("/");
        return;
      }
      await Promise.all([load(), loadApproved()]);
    })();
  }, [router, load, loadApproved]);
```

After:
```tsx
  const [approvedRows, setApprovedRows] = useState<ApprovedClaimRow[]>([]);
  const [openRevokeId, setOpenRevokeId] = useState<string | null>(null);
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});
  const [revokeBusyId, setRevokeBusyId] = useState<string | null>(null);
  const [rejectedRows, setRejectedRows] = useState<RejectedClaimRow[]>([]);
  const [reissueBusyId, setReissueBusyId] = useState<string | null>(null);
  const [reissuedUrls, setReissuedUrls] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_pending_claims");
    if (error) {
      toast.error("申請の取得に失敗しました");
      setRows([]);
      return;
    }
    setRows((data ?? []) as ClaimRow[]);
  }, []);

  const loadApproved = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_approved_claims");
    if (error) {
      toast.error("承認済み申請の取得に失敗しました");
      setApprovedRows([]);
      return;
    }
    setApprovedRows((data ?? []) as ApprovedClaimRow[]);
  }, []);

  const loadRejected = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_rejected_claims");
    if (error) {
      toast.error("却下済み申請の取得に失敗しました");
      setRejectedRows([]);
      return;
    }
    setRejectedRows((data ?? []) as RejectedClaimRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles").select("role").eq("id", session.user.id).maybeSingle();
      const ok = (prof as { role?: string } | null)?.role === "admin";
      setIsAdmin(ok);
      if (!ok) {
        router.replace("/");
        return;
      }
      await Promise.all([load(), loadApproved(), loadRejected()]);
    })();
  }, [router, load, loadApproved, loadRejected]);
```

- [ ] **Step 3: `decide()`が却下時にも一覧を更新するようにする**

Before:
```tsx
      toast.success(decision === "approve" ? "承認しました" : "却下しました");
      // 承認（approve）は list_pending_claims から消え list_approved_claims に
      // 現れる。load() だけだと承認済み一覧が反映されず、直後に「発行の取消」が
      // 必要になっても画面に出てこない。
      await Promise.all([load(), loadApproved()]);
```

After:
```tsx
      toast.success(decision === "approve" ? "承認しました" : "却下しました");
      // 承認（approve）は list_approved_claims に、却下（reject）は
      // list_rejected_claims に現れる。load() だけだと反映されない。
      await Promise.all([load(), loadApproved(), loadRejected()]);
```

- [ ] **Step 4: `reissue`ハンドラーを追加する**

`revoke`関数の直後（`if (isAdmin === null)`の手前）に追加：

```tsx
  const reissue = async (row: RejectedClaimRow) => {
    setReissueBusyId(row.id);
    try {
      const { data, error } = await supabase.rpc("reissue_claim_token", {
        p_claim_id: row.id,
        p_reason: null,
      });
      if (error) {
        toast.error("一時的に処理できませんでした。繰り返すときはサーバログを確認してください");
        return;
      }
      const r = data as { ok?: boolean; error?: string; token?: string };
      if (!r?.ok || !r.token) {
        toast.error(reissueClaimTokenErrorMessage(r?.error));
        return;
      }
      setReissuedUrls((p) => ({ ...p, [row.id]: claimUrlFromToken(r.token as string) }));
      toast.success("新しいトークンを発行しました");
    } finally {
      setReissueBusyId(null);
    }
  };

```

- [ ] **Step 5: 「却下済み（再発行可能）」セクションのUIを追加する**

承認済みセクションを囲む`<div className="mt-10">`の閉じタグ直後、`</div></div>`（ページ全体の閉じタグ）の手前に追加：

Before:
```tsx
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

After:
```tsx
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold text-ink mb-1">却下済み（再発行可能）</h2>
          <p className="text-xs text-graphite/70 mb-4">
            先に別の第三者が申請し却下された場合、正当な団体は同じリンクで再申請できません。
            新しいトークンを発行してDMを再送してください。
          </p>

          {rejectedRows.length === 0 ? (
            <p className="text-graphite text-sm bg-paper border border-rule p-6">
              却下済みの申請はありません。
            </p>
          ) : (
            <div className="space-y-4">
              {rejectedRows.map((row) => {
                const resolved = row.organization_claim_status !== "unclaimed";
                const newUrl = reissuedUrls[row.id];
                return (
                  <div key={row.id} className="bg-paper border border-rule p-5">
                    <div className="mb-2">
                      <Link
                        href={`/organizations/${row.organization_id}`}
                        className="text-ink font-bold hover:underline"
                      >
                        {row.organization_name || "（名称なし）"}
                      </Link>
                      <p className="text-xs text-graphite/70 mt-0.5">
                        {row.organization_university} ／ {row.channel}:{row.channel_handle}
                      </p>
                      <p className="text-xs text-graphite/50 mt-0.5">
                        {row.decided_at
                          ? `${new Date(row.decided_at).toLocaleString("ja-JP")} 却下`
                          : ""}
                      </p>
                    </div>

                    {row.decision_note && (
                      <p className="text-sm text-graphite bg-mist p-3 mb-3">
                        却下理由：{row.decision_note}
                      </p>
                    )}

                    {resolved ? (
                      <p className="text-xs text-graphite/70">
                        既に別の方が引き取り済みです。再発行の必要はありません。
                      </p>
                    ) : newUrl ? (
                      <div className="bg-mist border border-rule p-3">
                        <p className="text-xs font-bold text-ink mb-1">
                          新しいトークンを発行しました
                        </p>
                        <p className="text-xs text-graphite break-all">{newUrl}</p>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outlineMuted"
                        disabled={reissueBusyId === row.id}
                        onClick={() => reissue(row)}
                      >
                        再発行
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 7: commit**

```bash
git add app/admin/claims/page.tsx
git commit -m "feat(admin): /admin/claims に却下済み一覧と再発行UIを追加"
```

---

### Task 7: 項目6の確認・最終検証・ドキュメント更新・デプロイ判断

**Files:**
- Modify: `docs/risk-register.md`
- Modify: `docs/task-board.md`
- Modify: `docs/models/ProofLoop_タスクシート_2026-08-07.xlsx`（再生成）

- [ ] **Step 1: middleware.tsのmatcherを確認する（項目6）**

`middleware.ts`を開き、`export const config = { matcher: [...] }`が`["/admin", "/admin/:path*"]`のままであることを確認する（パスベースの網羅なので`/admin/disputes`・`/admin/claims`の新セクションも自動的に対象）。変更があれば`/admin/disputes`が対象から漏れていないかを個別に確認し、漏れていれば報告してこのステップで止める（コード変更が必要になるため）。

- [ ] **Step 2: `docs/risk-register.md`のS1行に確認結果を追記する**

S1の行（`| S1 | ...`）の末尾、既存の「✅ 対応済み（環境変数の設定待ち）」の直前または直後に、以下を追記する：
「`/admin/disputes`・`/admin/claims`の新セクション（承認済み・却下済み一覧）を含め、`matcher`のパスベース網羅により追加対応不要と確認済み（2026-08-13）。」

- [ ] **Step 3: 全体テストを実行する**

Run: `npm test`
Expected: 全ファイルPASS（Task 4で追加した5テスト分を含む）

- [ ] **Step 4: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 5: ビルド確認**

⚠️ 開発サーバー（`npm run dev`）が起動中なら先に停止すること。

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 6: `docs/task-board.md`を更新する**

タスクI2の項目4・5・6（`docs/task-board.md`の該当箇所）を実装済みとして更新し、実際のcommitハッシュ・マイグレーション040の適用日時を記載する。項目4は「最小対応（URL表示）のみ。emailRedirectToによる本格対応は見送り」であることを明記する。全3項目が完了したら、I2行のサマリー（冒頭の表の行）も更新する。

- [ ] **Step 7: タスクシートを再生成する**

⚠️ Excelでファイルを開いていると`EBUSY`で失敗する。事前にユーザーに確認する。

Run: `node docs/models/build-task-sheet.mjs "ProofLoop_タスクシート_2026-08-07.xlsx"`
Expected: 正常終了

- [ ] **Step 8: commit**

```bash
git add docs/risk-register.md docs/task-board.md docs/models/ProofLoop_タスクシート_2026-08-07.xlsx
git commit -m "docs: タスクI2残り3項目の完了をタスクボード・リスク台帳・タスクシートに反映"
```

- [ ] **Step 9: 本番デプロイの要否をユーザーに確認する**

Task 3で既にDBは本番適用済み。**コード側の変更（Task 4〜6）は`git push origin main`しないとVercelに反映されない。** ユーザーに確認してから実行する。

```bash
git push origin main
```

- [ ] **Step 10: push後の実機確認をユーザーに依頼する**

`/signup`の確認メール画面（claim経由で来た場合のURL表示）と`/admin/claims`の「却下済み」セクションは、いずれも本セッションのブラウザツールで実機確認できない可能性がある（本番proofloop.jpへ到達できなかった前例があるため）。到達できない場合は`docs/owner-todo.md`に確認依頼を追記する。却下済みclaimが現時点で0件のため、「却下済みの申請はありません。」という空状態の表示確認で十分である旨も明記する。

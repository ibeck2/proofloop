# B19（運営が単独でclaimを剥奪できるUI） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/claims` に承認済みclaimの一覧と「発行の取消」ボタンを追加し、第三者の異議申立てを待たずに運営が単独で乗っ取りを剥奪できるようにする。

**Architecture:** `revoke_claim` RPCに掲載内容の復元を統合し（`resolve_dispute`側の重複コードは削除）、承認済みclaimを一覧する新規RPC `list_approved_claims()` を追加する。フロントは`/admin/disputes`と同型（一覧 → Route Handler → RPC → ISR再検証）のパターンを踏襲する。

**Tech Stack:** Next.js 15 App Router / TypeScript / Supabase (Postgres + PostgREST) / vitest

## Global Constraints

- 設計書：`docs/superpowers/specs/2026-08-12-b19-claim-revocation-design.md`（このプランの全ての判断根拠）
- RLS/RPCを変更する場合、必ず `BEGIN; … ROLLBACK;` で検証してから本番適用の承認を得る（CLAUDE.md）
- ロジックは純粋関数に切り出し、テストを書く。UIコンポーネントに計算を埋め込まない（CLAUDE.md §5）
- 深紅（seal）は`/admin`配下では「危険信号」として使ってよい（CLAUDE.md §3）
- 既存の`/admin/claims`・`/admin/disputes`のコード規約（RPC名・エラーコードの畳み方・Route Handler経由の再検証）に従う
- Supabaseプロジェクト：project_id `uhhofjcyotfyrlhaguvy`（`docs/accounts-inventory.md`）

---

### Task 1: マイグレーション038を書く（DB層）

**Files:**
- Create: `supabase/migrations/038_claim_revocation.sql`

**Interfaces:**
- Produces: `public.revoke_claim(p_claim_id uuid, p_reason text) RETURNS jsonb`（シグネチャ不変、掲載内容の復元を内部に統合）
- Produces: `public.resolve_dispute(p_dispute_id uuid, p_resolution text, p_note text) RETURNS jsonb`（シグネチャ不変、uphold分岐の重複復元コードを削除）
- Produces: `public.list_approved_claims() RETURNS TABLE (id uuid, organization_id uuid, organization_name text, organization_university text, organization_claim_status text, applicant_user_id uuid, applicant_name text, applicant_email text, granted_level text, decided_at timestamptz)`

- [ ] **Step 1: マイグレーションファイルを書く**

```sql
-- ============================================
-- 038 B19：運営が単独でclaimを剥奪できるUI
--
--    設計 docs/superpowers/specs/2026-08-12-b19-claim-revocation-design.md
--
--    revoke_claim（033）は organization_members / organization_invitations の掃除しか
--    しておらず、organizations の掲載列を戻す処理を持っていなかった。「掲載内容を戻す」
--    ロジックは resolve_dispute（032）のuphold分岐にだけ存在し、froze_organizationが
--    偽のときだけ手動で restore_organization_columns を呼んでいた。
--    revoke_claim を直接呼ぶ経路（B19で追加する /admin/claims の「発行の取消」）を
--    作ると、メンバー・招待は消えるが乗っ取り犯が書き換えた掲載内容は公開され続ける。
--
--    revoke_claim 自体に復元処理を統合し、resolve_dispute 側の重複コードを削除する。
--    あわせて、承認済みclaim（＝「発行の取消」の対象）を一覧するRPCを追加する
--    （list_pending_claims は status='applied' のみを返し、承認済みを一覧する経路が
--    今は無い）。
-- ============================================


-- --------------------------------------------
-- 1. revoke_claim に掲載内容の復元を統合する
--
--    org_status を FOR UPDATE で読み、'claimed' のときだけ pre_claim スナップショットで
--    復元してから unclaimed に書き換える（decide_claim と同じロック順序：
--    organization_claims 行 → organizations 行）。
--    'frozen' のときは何もしない。submit_dispute が凍結時に既に pre_claim まで戻し
--    切っている前提を維持し、凍結解除の判断は引き続き resolve_dispute が持つ。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_claim(p_claim_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  removed_members int := 0;
  removed_invites int := 0;
  removed_step int := 0;
  org_status text;
  snap jsonb;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF c.status = 'approved' AND c.applicant_user_id IS NOT NULL THEN
    -- (a) 申請者本人。claim 前から在籍していた場合も消す（033と同じ）
    DELETE FROM public.organization_members
      WHERE organization_id = c.organization_id AND user_id = c.applicant_user_id;
    GET DIAGNOSTICS removed_members = ROW_COUNT;

    -- (b) この claim の権限で追加されたメンバー（033と同じ）
    IF c.decided_at IS NOT NULL THEN
      DELETE FROM public.organization_members
        WHERE organization_id = c.organization_id
          AND created_at >= c.decided_at;
      GET DIAGNOSTICS removed_step = ROW_COUNT;
      removed_members := removed_members + removed_step;
    END IF;

    -- (c) 未受諾の招待（033と同じ）
    DELETE FROM public.organization_invitations
      WHERE organization_id = c.organization_id;
    GET DIAGNOSTICS removed_invites = ROW_COUNT;

    -- (d) 038で追加：掲載内容の復元。org_status を読んだ時点で 'claimed' のときだけ
    --     戻す。resolve_dispute のuphold分岐（凍結していない申立て）が revoke_claim を
    --     呼ぶときも、この時点では organizations.claim_status はまだ 'claimed' のままなので
    --     （submit_dispute が凍結していない限り）、ここで自動的に復元される。
    --     resolve_dispute 側の手動 restore_organization_columns 呼び出しは本マイグレーション
    --     の2番で削除する（重複コードを1箇所に統合する）。
    SELECT o.claim_status INTO org_status
      FROM public.organizations o WHERE o.id = c.organization_id FOR UPDATE;

    IF org_status = 'claimed' THEN
      SELECT s.snapshot INTO snap FROM public.organization_snapshots s
        WHERE s.organization_id = c.organization_id AND s.reason = 'pre_claim'
        ORDER BY s.created_at DESC LIMIT 1;
      PERFORM public.restore_organization_columns(c.organization_id, snap);

      UPDATE public.organizations SET claim_status='unclaimed'
        WHERE id = c.organization_id;
    END IF;
    -- org_status = 'frozen' のときは何もしない。凍結解除の判断は resolve_dispute が持つ。
  END IF;

  UPDATE public.organization_claims
    SET status='revoked', revoked_at=now(), decision_note=p_reason,
        decided_by=auth.uid(), decided_at=now()
    WHERE id = c.id;

  RETURN jsonb_build_object(
    'ok', true,
    'removed_members', removed_members,
    'removed_invitations', removed_invites
  );
END;
$$;


-- --------------------------------------------
-- 2. resolve_dispute から、1で revoke_claim に統合した重複コードを削除する
--
--    uphold分岐は revoke_claim を呼んだ「あと」に、froze_organization が偽のときだけ
--    手動で restore_organization_columns を呼んでいた。1の変更により revoke_claim が
--    同じ条件（org_status='claimed'）で自動的に復元するため、この手動呼び出しを
--    残すと同じ復元が2回走るだけの無駄になる（実害は無いが意図が不明瞭になる）。
--    削除して revoke_claim 側に一本化する。
--
--    それ以外のロジック（却下分岐・has_approved 判定など）は032から変更しない。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id uuid, p_resolution text, p_note text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d public.organization_disputes%ROWTYPE;
  snap jsonb;
  target_claim uuid;
  rv jsonb;
  has_approved boolean;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_resolution NOT IN ('uphold','dismiss') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_resolution');
  END IF;

  SELECT * INTO d FROM public.organization_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND OR d.status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF p_resolution = 'uphold' THEN
    -- 乗っ取りだった。オーナーを剥奪し、掲載は claim 前の状態にする（復元は
    -- revoke_claim が038で統合済み。ここでは手動の restore_organization_columns
    -- 呼び出しをしない）。
    SELECT oc.id INTO target_claim FROM public.organization_claims oc
      WHERE oc.organization_id = d.organization_id AND oc.status = 'approved' LIMIT 1;
    IF target_claim IS NULL THEN
      target_claim := d.claim_id;
    END IF;

    IF target_claim IS NOT NULL THEN
      -- 戻り値を捨てると、剥奪に失敗しても申立てが upheld になる
      rv := public.revoke_claim(target_claim, COALESCE(p_note, '異議申立てにより剥奪'));
      IF NOT COALESCE((rv->>'ok')::boolean, false) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'revoke_failed');
      END IF;
    END IF;

    UPDATE public.organizations SET claim_status='unclaimed' WHERE id = d.organization_id;
    UPDATE public.organization_disputes
      SET status='upheld', resolved_by=auth.uid(), resolved_at=now(), resolution_note=p_note
      WHERE id = d.id;
    RETURN jsonb_build_object('ok', true, 'resolution', 'upheld');
  END IF;

  -- 申立ては退けられた。（却下分岐は032から変更なし）
  IF d.froze_organization THEN
    SELECT s.snapshot INTO snap FROM public.organization_snapshots s
      WHERE s.organization_id = d.organization_id AND s.reason = 'pre_freeze'
        AND s.created_at >= d.created_at
      ORDER BY s.created_at DESC LIMIT 1;
    PERFORM public.restore_organization_columns(d.organization_id, snap);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_claims oc
    WHERE oc.organization_id = d.organization_id AND oc.status = 'approved'
  ) INTO has_approved;

  UPDATE public.organizations
    SET claim_status = CASE WHEN has_approved THEN 'claimed' ELSE 'unclaimed' END
    WHERE id = d.organization_id;

  UPDATE public.organization_disputes
    SET status='dismissed', resolved_by=auth.uid(), resolved_at=now(), resolution_note=p_note
    WHERE id = d.id;

  RETURN jsonb_build_object(
    'ok', true, 'resolution', 'dismissed',
    'claim_status', CASE WHEN has_approved THEN 'claimed' ELSE 'unclaimed' END
  );
END;
$$;

-- 関数のシグネチャは変わらないため、029/032で設定したGRANTはそのまま引き継がれる。


-- --------------------------------------------
-- 3. 承認済みclaimを一覧するRPC（「発行の取消」の対象）
--
--    list_pending_claims（031）は status='applied' のみを返す。承認済み（approved）
--    claimを一覧する経路が今は存在しない。organization_claims.status='approved' を
--    organizations・profiles（申請者名・連絡先）とJOINして返す。
--
--    organization_claim_status も返す。フロント側で 'frozen' の行を検知して
--    「発行の取消」ボタンを無効化し、/admin/disputes への案内を出すために使う
--    （凍結中の団体は異議申立てフローが既に進行中で、二重に操作すると
--    状態が読みにくくなるため）。
--
--    applicant_name/applicant_email は clubsettings/members 画面と同じ
--    フォールバック順（full_name → display_name、contact_email → email）にする。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.list_approved_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, organization_university text,
  organization_claim_status text,
  applicant_user_id uuid, applicant_name text, applicant_email text,
  granted_level text, decided_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university,
         o.claim_status,
         c.applicant_user_id,
         COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(p.display_name), '')),
         COALESCE(NULLIF(TRIM(p.contact_email), ''), NULLIF(TRIM(p.email), '')),
         c.granted_level, c.decided_at
  FROM public.organization_claims c
  JOIN public.organizations o ON o.id = c.organization_id
  LEFT JOIN public.profiles p ON p.id = c.applicant_user_id
  WHERE public.is_system_admin() AND c.status = 'approved'
  ORDER BY c.decided_at DESC;
$$;

-- list_pending_claims（031）と同じ権限モデル。Supabaseでは REVOKE ALL ... FROM PUBLIC が
-- 効かない（pg_default_aclでanon/authenticatedへ直接EXECUTEが付くため）。anonから明示REVOKE。
REVOKE ALL ON FUNCTION public.list_approved_claims() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_approved_claims() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_approved_claims() TO authenticated;
```

- [ ] **Step 2: SQLの構文だけをローカルで軽くセルフチェックする**

このプロジェクトにはローカルSupabase環境が無いため、構文エラーの主な発見場所はTask 2の本番`BEGIN...ROLLBACK`検証になる。ここでは目視で以下を確認する：
- 3つの`CREATE OR REPLACE FUNCTION`のシグネチャ（引数の型と順序）が既存（032/033）と一致している
- `$$`のペアが崩れていない
- 末尾の`REVOKE`/`GRANT`が`list_approved_claims`のシグネチャ（引数無し）と一致している

- [ ] **Step 3: commit（本番適用はまだしない）**

```bash
git add supabase/migrations/038_claim_revocation.sql
git commit -m "$(cat <<'EOF'
feat(claims): revoke_claimに掲載内容の復元を統合し、承認済み一覧RPCを追加

B19（運営単独での剥奪UI）の準備。revoke_claim単独呼び出しでは掲載内容が
巻き戻らなかった実装ギャップを解消し、resolve_dispute側の重複コードを削除する。
list_approved_claims()で「発行の取消」の対象を一覧できるようにする。

未適用（本番へは検証後に別途apply_migrationする）。
EOF
)"
```

---

### Task 2: マイグレーション038を本番でBEGIN…ROLLBACK検証する

**Files:** なし（本番Supabaseに対する読み取り専用の検証。書き込みは全てROLLBACKで消す）

**Interfaces:**
- Consumes: Task 1で書いた`supabase/migrations/038_claim_revocation.sql`の内容
- Produces: 検証結果（Task 3の本番適用可否をユーザーに確認する材料）

- [ ] **Step 1: Supabase MCPで検証スクリプトを実行する**

`mcp__claude_ai_Supabase__execute_sql`（`project_id: "uhhofjcyotfyrlhaguvy"`）で以下を1回のクエリとして実行する。Task 1のマイグレーション本体を先頭に貼り付けた上で、使い捨てのフィクスチャを作り、admin権限で3つの関数を呼び、結果をアサートし、最後に`ROLLBACK`する（本番データへの実害はゼロ）。

現在の本番実測（2026-08-12時点）：admin権限を持つprofilesが1件、auth.usersが3件（うち非admin2件）、承認済みclaimは0件。この前提でフィクスチャのuser_idを本物の3ユーザーから借りる。

```sql
BEGIN;

-- ============================================================
-- Task 1 のマイグレーション本体をそのまま貼り付ける
-- （CREATE OR REPLACE FUNCTION public.revoke_claim ... 〜
--   GRANT EXECUTE ON FUNCTION public.list_approved_claims() TO authenticated; まで）
-- ============================================================

-- ============================================================
-- ここから検証
-- ============================================================
CREATE TEMP TABLE _b19t (k text PRIMARY KEY, v uuid);
-- 検証本体は SET LOCAL ROLE authenticated に切り替えて RPC を呼ぶため、
-- 作成者ロール（このセッションの既定ロール）だけが読めるままだと
-- 42501 permission denied for table _b19t になる。authenticated にも許可する。
GRANT SELECT ON _b19t TO authenticated;

INSERT INTO _b19t(k, v)
SELECT 'admin', id FROM public.profiles WHERE role = 'admin' LIMIT 1;

INSERT INTO _b19t(k, v)
SELECT 'applicant', id FROM auth.users
WHERE id NOT IN (SELECT v FROM _b19t) LIMIT 1;

INSERT INTO _b19t(k, v)
SELECT 'conspirator', id FROM auth.users
WHERE id NOT IN (SELECT v FROM _b19t) LIMIT 1;

INSERT INTO _b19t(k, v) VALUES
  ('org1', gen_random_uuid()), ('claim1', gen_random_uuid()),
  ('org2', gen_random_uuid()), ('claim2', gen_random_uuid()),
  ('org3', gen_random_uuid()), ('claim3', gen_random_uuid()), ('dispute3', gen_random_uuid());

DO $$
BEGIN
  IF (SELECT count(*) FROM _b19t WHERE k IN ('admin','applicant','conspirator')) < 3 THEN
    RAISE EXCEPTION 'setup failed: need 1 admin profile + 2 other auth users, found fewer';
  END IF;
END $$;

-- ============================================================
-- フィクスチャ1：claimed団体（乗っ取り後の内容・共犯者が追加された想定）
-- ============================================================
INSERT INTO public.organizations (id, name, university, category, is_approved, claim_status)
SELECT v, '乗っ取り後の名称1', 'テスト大学', 'その他', true, 'claimed' FROM _b19t WHERE k='org1';

INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
SELECT
  (SELECT v FROM _b19t WHERE k='org1'),
  jsonb_build_object('name','claim前の名称1','university','テスト大学','category','その他',
    'description',null,'x_id',null,'instagram_id',null,'line_url',null,'website_url',null,
    'logo_url',null,'member_count',null,'activity_frequency',null,'is_intercollege',false,
    'target_grades',null,'selection_process',null,'selection_flow','[]'::jsonb,
    'gender_ratio',null,'grade_composition',null,'location_detail',null,'fee_entry',null,
    'fee_annual',null,'planned_hire_count',0,'step_target_rates','{}'::jsonb),
  'pre_claim', (SELECT v FROM _b19t WHERE k='admin');

INSERT INTO public.organization_claims
  (id, organization_id, token, channel, channel_handle, channel_is_unique, expires_at,
   status, applicant_user_id, applied_at, decided_at, decided_by, granted_level, signal_verdict)
SELECT
  (SELECT v FROM _b19t WHERE k='claim1'), (SELECT v FROM _b19t WHERE k='org1'),
  gen_random_uuid(), 'x', '@b19t1', true, now() + interval '1 day',
  'approved', (SELECT v FROM _b19t WHERE k='applicant'),
  now() - interval '1 hour', now() - interval '50 minutes', (SELECT v FROM _b19t WHERE k='admin'),
  'full', 'green';

INSERT INTO public.organization_members
  (organization_id, user_id, role, can_edit_profile, can_manage_posts, can_manage_finance,
   can_manage_members, can_manage_applications, created_at)
SELECT (SELECT v FROM _b19t WHERE k='org1'), (SELECT v FROM _b19t WHERE k='applicant'),
  'owner', true, true, true, true, true,
  (SELECT decided_at FROM public.organization_claims WHERE id=(SELECT v FROM _b19t WHERE k='claim1'));

INSERT INTO public.organization_members
  (organization_id, user_id, role, can_edit_profile, can_manage_posts, can_manage_finance,
   can_manage_members, can_manage_applications, created_at)
SELECT (SELECT v FROM _b19t WHERE k='org1'), (SELECT v FROM _b19t WHERE k='conspirator'),
  'owner', true, true, true, true, true, now() - interval '30 minutes';

-- ---- G1: 承認済み一覧に出るか（adminとして） ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t WHERE k='admin')::text)::text, true);

DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.list_approved_claims()
    WHERE id = (SELECT v FROM _b19t WHERE k='claim1');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'G1 failed: claim1 not listed by list_approved_claims for admin';
  END IF;
  IF r.organization_claim_status <> 'claimed' OR r.granted_level <> 'full' THEN
    RAISE EXCEPTION 'G1 failed: unexpected row %', r;
  END IF;
END $$;

-- ---- G2: 非adminからは見えない ----
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t WHERE k='applicant')::text)::text, true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.list_approved_claims()) THEN
    RAISE EXCEPTION 'G2 failed: non-admin can see approved claims';
  END IF;
END $$;

RESET ROLE;

-- ---- B: revoke_claim（org1はclaimed → 復元されるはず） ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t WHERE k='admin')::text)::text, true);

DO $$
DECLARE
  rv jsonb;
  org record;
  claim record;
BEGIN
  rv := public.revoke_claim((SELECT v FROM _b19t WHERE k='claim1'), 'B19検証');
  IF (rv->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'B failed: revoke_claim returned %', rv;
  END IF;
  IF (rv->>'removed_members')::int <> 2 THEN
    RAISE EXCEPTION 'B failed: expected removed_members=2, got %', rv->>'removed_members';
  END IF;

  SELECT * INTO org FROM public.organizations WHERE id = (SELECT v FROM _b19t WHERE k='org1');
  IF org.name <> 'claim前の名称1' OR org.claim_status <> 'unclaimed' THEN
    RAISE EXCEPTION 'B failed: org1 not restored, got name=% claim_status=%', org.name, org.claim_status;
  END IF;

  SELECT * INTO claim FROM public.organization_claims WHERE id = (SELECT v FROM _b19t WHERE k='claim1');
  IF claim.status <> 'revoked' THEN
    RAISE EXCEPTION 'B failed: claim1 status is %, expected revoked', claim.status;
  END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = (SELECT v FROM _b19t WHERE k='org1')) THEN
    RAISE EXCEPTION 'B failed: org1 still has member rows';
  END IF;
END $$;

RESET ROLE;

-- ============================================================
-- フィクスチャ2：frozen団体（申立て対応中）に対する revoke_claim は掲載列に触れない
-- ============================================================
INSERT INTO public.organizations (id, name, university, category, is_approved, claim_status)
SELECT v, '凍結中の名称2', 'テスト大学', 'その他', true, 'frozen' FROM _b19t WHERE k='org2';

INSERT INTO public.organization_claims
  (id, organization_id, token, channel, channel_handle, channel_is_unique, expires_at,
   status, applicant_user_id, applied_at, decided_at, decided_by, granted_level, signal_verdict)
SELECT
  (SELECT v FROM _b19t WHERE k='claim2'), (SELECT v FROM _b19t WHERE k='org2'),
  gen_random_uuid(), 'x', '@b19t2', true, now() + interval '1 day',
  'approved', (SELECT v FROM _b19t WHERE k='applicant'),
  now() - interval '1 hour', now() - interval '50 minutes', (SELECT v FROM _b19t WHERE k='admin'),
  'full', 'green';

INSERT INTO public.organization_members
  (organization_id, user_id, role, can_edit_profile, can_manage_posts, can_manage_finance,
   can_manage_members, can_manage_applications, created_at)
SELECT (SELECT v FROM _b19t WHERE k='org2'), (SELECT v FROM _b19t WHERE k='applicant'),
  'owner', true, true, true, true, true, now() - interval '49 minutes';

-- ---- D: revoke_claim（frozenなので掲載列は変わらない） ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t WHERE k='admin')::text)::text, true);

DO $$
DECLARE
  rv jsonb;
  org record;
  claim record;
BEGIN
  rv := public.revoke_claim((SELECT v FROM _b19t WHERE k='claim2'), 'B19検証（frozen）');
  IF (rv->>'ok')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'D failed: revoke_claim returned %', rv;
  END IF;

  SELECT * INTO org FROM public.organizations WHERE id = (SELECT v FROM _b19t WHERE k='org2');
  IF org.name <> '凍結中の名称2' OR org.claim_status <> 'frozen' THEN
    RAISE EXCEPTION 'D failed: org2 was touched while frozen, got name=% claim_status=%', org.name, org.claim_status;
  END IF;

  SELECT * INTO claim FROM public.organization_claims WHERE id = (SELECT v FROM _b19t WHERE k='claim2');
  IF claim.status <> 'revoked' THEN
    RAISE EXCEPTION 'D failed: claim2 status is %, expected revoked', claim.status;
  END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = (SELECT v FROM _b19t WHERE k='org2')) THEN
    RAISE EXCEPTION 'D failed: org2 still has member rows (member cleanup must still happen even when frozen)';
  END IF;
END $$;

RESET ROLE;

-- ============================================================
-- フィクスチャ3：resolve_dispute の uphold（未凍結の申立て）が
--   revoke_claim への統合後も掲載内容を正しく戻すか
-- ============================================================
INSERT INTO public.organizations (id, name, university, category, is_approved, claim_status)
SELECT v, '乗っ取り後の名称3', 'テスト大学', 'その他', true, 'claimed' FROM _b19t WHERE k='org3';

INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
SELECT
  (SELECT v FROM _b19t WHERE k='org3'),
  jsonb_build_object('name','claim前の名称3','university','テスト大学','category','その他',
    'description',null,'x_id',null,'instagram_id',null,'line_url',null,'website_url',null,
    'logo_url',null,'member_count',null,'activity_frequency',null,'is_intercollege',false,
    'target_grades',null,'selection_process',null,'selection_flow','[]'::jsonb,
    'gender_ratio',null,'grade_composition',null,'location_detail',null,'fee_entry',null,
    'fee_annual',null,'planned_hire_count',0,'step_target_rates','{}'::jsonb),
  'pre_claim', (SELECT v FROM _b19t WHERE k='admin');

INSERT INTO public.organization_claims
  (id, organization_id, token, channel, channel_handle, channel_is_unique, expires_at,
   status, applicant_user_id, applied_at, decided_at, decided_by, granted_level, signal_verdict)
SELECT
  (SELECT v FROM _b19t WHERE k='claim3'), (SELECT v FROM _b19t WHERE k='org3'),
  gen_random_uuid(), 'x', '@b19t3', true, now() + interval '1 day',
  'approved', (SELECT v FROM _b19t WHERE k='applicant'),
  now() - interval '1 hour', now() - interval '50 minutes', (SELECT v FROM _b19t WHERE k='admin'),
  'full', 'green';

INSERT INTO public.organization_members
  (organization_id, user_id, role, can_edit_profile, can_manage_posts, can_manage_finance,
   can_manage_members, can_manage_applications, created_at)
SELECT (SELECT v FROM _b19t WHERE k='org3'), (SELECT v FROM _b19t WHERE k='applicant'),
  'owner', true, true, true, true, true, now() - interval '49 minutes';

INSERT INTO public.organization_disputes
  (id, organization_id, claim_id, reporter_name, reporter_contact, body, status,
   created_at, froze_organization)
SELECT (SELECT v FROM _b19t WHERE k='dispute3'), (SELECT v FROM _b19t WHERE k='org3'),
  (SELECT v FROM _b19t WHERE k='claim3'), 'テスト通報者', 'test@example.com',
  'B19検証用の申立て', 'open', now() - interval '10 minutes', false;

-- ---- F: resolve_dispute uphold（未凍結）が revoke_claim 経由で掲載内容を戻すか ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t WHERE k='admin')::text)::text, true);

DO $$
DECLARE
  rv jsonb;
  org record;
  claim record;
  dispute record;
BEGIN
  rv := public.resolve_dispute((SELECT v FROM _b19t WHERE k='dispute3'), 'uphold', 'B19検証(F)');
  IF (rv->>'ok')::boolean IS NOT TRUE OR rv->>'resolution' <> 'upheld' THEN
    RAISE EXCEPTION 'F failed: resolve_dispute returned %', rv;
  END IF;

  SELECT * INTO org FROM public.organizations WHERE id = (SELECT v FROM _b19t WHERE k='org3');
  IF org.name <> 'claim前の名称3' OR org.claim_status <> 'unclaimed' THEN
    RAISE EXCEPTION 'F failed: org3 not restored via resolve_dispute->revoke_claim, got name=% claim_status=%', org.name, org.claim_status;
  END IF;

  SELECT * INTO claim FROM public.organization_claims WHERE id = (SELECT v FROM _b19t WHERE k='claim3');
  IF claim.status <> 'revoked' THEN
    RAISE EXCEPTION 'F failed: claim3 status is %, expected revoked', claim.status;
  END IF;

  SELECT * INTO dispute FROM public.organization_disputes WHERE id = (SELECT v FROM _b19t WHERE k='dispute3');
  IF dispute.status <> 'upheld' THEN
    RAISE EXCEPTION 'F failed: dispute3 status is %, expected upheld', dispute.status;
  END IF;
END $$;

RESET ROLE;

-- ---- G3: revoke後は一覧から消える ----
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  json_build_object('sub', (SELECT v FROM _b19t WHERE k='admin')::text)::text, true);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.list_approved_claims()
    WHERE id IN (SELECT v FROM _b19t WHERE k IN ('claim1','claim2','claim3'))
  ) THEN
    RAISE EXCEPTION 'G3 failed: revoked claims still appear in list_approved_claims';
  END IF;
END $$;

RESET ROLE;

SELECT 'ALL CHECKS PASSED (org1 restored, org2 frozen-skip, org3 via resolve_dispute, listing visibility)' AS result;

ROLLBACK;
```

Expected: 最後の`SELECT`が`ALL CHECKS PASSED ...`を返す。途中で`RAISE EXCEPTION`が発火した場合はそのメッセージがどのフェーズ（G1/G2/B/D/F/G3）のどの条件で失敗したかを正確に示す。

- [ ] **Step 2: 結果を記録する**

`docs/superpowers/plans/2026-08-12-b19-verification.md` を新規作成し、実行結果（成功メッセージ、または失敗時の詳細と対処）を記録する（`2026-08-12-d9-d10-verification.md`と同じ体裁）。

- [ ] **Step 3: commit**

```bash
git add docs/superpowers/plans/2026-08-12-b19-verification.md
git commit -m "$(cat <<'EOF'
docs: マイグレーション038の本番BEGIN…ROLLBACK検証結果を記録

revoke_claimの復元統合・resolve_disputeの重複削除・list_approved_claimsの
可視性を、使い捨てフィクスチャで検証（本番データへの書き込みなし）。
EOF
)"
```

⚠️ **このTaskの完了後、Task 3（本番へのマイグレーション適用）に進む前に、検証結果をユーザーに提示し、明示的な適用の承認を得ること。** CLAUDE.mdの「Supabaseのスキーマ変更・RLS・認証設定の変更は必ず計画提示と承認を経てから行う」に基づく。

---

### Task 3: マイグレーション038を本番に適用する

**Files:** なし（本番DBへの実書き込み）

**Interfaces:**
- Consumes: Task 1のファイル内容、Task 2で得た検証結果（ユーザー承認込み）
- Produces: 本番で`revoke_claim`/`resolve_dispute`が更新され、`list_approved_claims`が呼び出し可能になる

- [ ] **Step 1: ユーザーの明示的な承認を得る**

Task 2の検証結果（成功したこと）を提示し、「この内容で本番に適用してよいか」を確認する。承認が無い限りStep 2に進まない。

- [ ] **Step 2: 本番へ適用する**

`mcp__claude_ai_Supabase__apply_migration`（`project_id: "uhhofjcyotfyrlhaguvy"`、`name: "038_claim_revocation"`）に、Task 1で書いた`supabase/migrations/038_claim_revocation.sql`の全文を渡して実行する。

- [ ] **Step 3: 適用結果を確認する**

```sql
SELECT proname FROM pg_proc WHERE proname = 'list_approved_claims';
```

Expected: 1行返る（`list_approved_claims`）。

```sql
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3;
```

Expected: 038系のバージョンが最新行に含まれる。

- [ ] **Step 4: 検証記録に適用結果を追記してcommit**

`docs/superpowers/plans/2026-08-12-b19-verification.md` に「本番適用済み（日時）」を追記する。

```bash
git add docs/superpowers/plans/2026-08-12-b19-verification.md
git commit -m "docs: マイグレーション038の本番適用完了を記録"
```

---

### Task 4: `lib/claims/types.ts` に `ApprovedClaimRow` を追加し、`lib/claims/claimRevocation.ts` を書く

**Files:**
- Modify: `lib/claims/types.ts`
- Create: `lib/claims/claimRevocation.ts`
- Test: `lib/claims/claimRevocation.test.ts`

**Interfaces:**
- Consumes: なし（DBに依存しない純粋関数）
- Produces:
  - `ApprovedClaimRow`（`lib/claims/types.ts`）— `list_approved_claims()`の戻り値1行の型
  - `claimRevocationErrorMessage(code: string | undefined): string`
  - `canSubmitClaimRevocation(reason: string): boolean`
  - `type RevokeClaimSuccess = { ok: true; removed_members: number; removed_invitations: number }`
  - `revokeClaimSuccessMessage(result: RevokeClaimSuccess): string`

- [ ] **Step 1: `lib/claims/types.ts` に型を追加する**

`lib/claims/types.ts`の末尾（`DisputeRow`の後）に追記：

```ts
/** list_approved_claims（038）の戻り値の1行。「発行の取消」の対象。 */
export type ApprovedClaimRow = {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_university: string | null;
  /** 'frozen' のときは異議申立て対応中。取消ボタンを無効化し /admin/disputes へ誘導する */
  organization_claim_status: OrganizationClaimStatus;
  applicant_user_id: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  granted_level: GrantLevel | null;
  decided_at: string | null;
};
```

- [ ] **Step 2: 失敗するテストを書く**

`lib/claims/claimRevocation.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  claimRevocationErrorMessage,
  canSubmitClaimRevocation,
  revokeClaimSuccessMessage,
} from "./claimRevocation";

describe("claimRevocationErrorMessage", () => {
  it("forbidden", () => {
    expect(claimRevocationErrorMessage("forbidden")).toBe("権限がありません");
  });

  it("not_found", () => {
    expect(claimRevocationErrorMessage("not_found")).toContain("見つかりません");
  });

  it("rpc_error は既定と区別し、サーバログを見る先を示す", () => {
    const msg = claimRevocationErrorMessage("rpc_error");
    expect(msg).not.toBe(claimRevocationErrorMessage(undefined));
    expect(msg).toContain("サーバログ");
  });

  it("未知のコードと undefined は既定の文言", () => {
    expect(claimRevocationErrorMessage(undefined)).toBe("取り消しに失敗しました");
    expect(claimRevocationErrorMessage("who_knows")).toBe("取り消しに失敗しました");
  });
});

describe("canSubmitClaimRevocation", () => {
  it("空文字は不可", () => {
    expect(canSubmitClaimRevocation("")).toBe(false);
  });

  it("空白のみは不可（誤ってスペースだけ入力したケースを弾く）", () => {
    expect(canSubmitClaimRevocation("   ")).toBe(false);
  });

  it("前後に空白があっても中身があれば可", () => {
    expect(canSubmitClaimRevocation("  乗っ取りを確認したため  ")).toBe(true);
  });
});

describe("revokeClaimSuccessMessage", () => {
  it("削除件数を文言に含める", () => {
    const msg = revokeClaimSuccessMessage({
      ok: true,
      removed_members: 2,
      removed_invitations: 1,
    });
    expect(msg).toContain("メンバー2件");
    expect(msg).toContain("招待1件");
  });

  it("0件のときも0件と明示する（省略すると何も削除されていないように見える）", () => {
    const msg = revokeClaimSuccessMessage({
      ok: true,
      removed_members: 0,
      removed_invitations: 0,
    });
    expect(msg).toContain("メンバー0件");
    expect(msg).toContain("招待0件");
  });
});
```

- [ ] **Step 3: テストを実行して失敗を確認する**

Run: `npx vitest run lib/claims/claimRevocation.test.ts`
Expected: FAIL（`Cannot find module './claimRevocation'` またはそれに準ずるエラー）

- [ ] **Step 4: `lib/claims/claimRevocation.ts` を実装する**

```ts
/**
 * `revoke_claim`（038で掲載内容の復元を統合済み。B19の「発行の取消」から呼ぶ）の
 * エラーコード変換・入力検証・成功文言をまとめる純粋関数群。
 *
 * `lib/claims/claimDecision.ts`・`lib/claims/disputeResolution.ts`と同じ形。
 * この分岐をUIコンポーネントに埋め込まない（CLAUDE.md §5）。
 */

export type RevokeClaimErrorCode = "forbidden" | "not_found" | "rpc_error";

export function claimRevocationErrorMessage(code: string | undefined): string {
  switch (code as RevokeClaimErrorCode | undefined) {
    case "forbidden":
      return "権限がありません";
    case "not_found":
      return "この申請は見つかりませんでした。画面を再読み込みしてください";
    case "rpc_error":
      return "一時的に処理できませんでした。繰り返すときはサーバログを確認してください";
    default:
      return "取り消しに失敗しました";
  }
}

/**
 * 取消理由の入力チェック。運営が理由なしで一存の剥奪を実行できないようにする
 * （破壊的操作のため、ブレインストーミングで理由入力を必須にする方針で合意済み）。
 */
export function canSubmitClaimRevocation(reason: string): boolean {
  return reason.trim().length > 0;
}

export type RevokeClaimSuccess = {
  ok: true;
  removed_members: number;
  removed_invitations: number;
};

export function revokeClaimSuccessMessage(result: RevokeClaimSuccess): string {
  return `発行を取り消しました。メンバー${result.removed_members}件・招待${result.removed_invitations}件を削除しました。`;
}
```

- [ ] **Step 5: テストを実行して成功を確認する**

Run: `npx vitest run lib/claims/claimRevocation.test.ts`
Expected: PASS（9 tests）

- [ ] **Step 6: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 7: commit**

```bash
git add lib/claims/types.ts lib/claims/claimRevocation.ts lib/claims/claimRevocation.test.ts
git commit -m "feat(claims): 発行の取消（revoke_claim）のエラー文言・検証・成功文言を純粋関数化"
```

---

### Task 5: `lib/organizations/revalidationTriggers.ts` に `shouldRevalidateAfterClaimRevocation` を追加する

**Files:**
- Modify: `lib/organizations/revalidationTriggers.ts`
- Test: `lib/organizations/revalidationTriggers.test.ts`

**Interfaces:**
- Consumes: なし
- Produces: `shouldRevalidateAfterClaimRevocation(result: { ok?: boolean } | null | undefined): boolean`

- [ ] **Step 1: 失敗するテストを追記する**

`lib/organizations/revalidationTriggers.test.ts` の末尾に追記：

```ts
import { shouldRevalidateAfterClaimRevocation } from "./revalidationTriggers";

describe("shouldRevalidateAfterClaimRevocation", () => {
  it("成功したら常に捨てる（frozen以外は必ず掲載列を書き換えるため）", () => {
    expect(shouldRevalidateAfterClaimRevocation({ ok: true })).toBe(true);
  });

  it("失敗したら捨てない", () => {
    expect(shouldRevalidateAfterClaimRevocation({ ok: false })).toBe(false);
    expect(shouldRevalidateAfterClaimRevocation(null)).toBe(false);
    expect(shouldRevalidateAfterClaimRevocation(undefined)).toBe(false);
  });
});
```

冒頭の`import`はファイル先頭の既存importブロックに追加する（`shouldRevalidateAfterDisputeResolution`と同じ行に並べてよい）。

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npx vitest run lib/organizations/revalidationTriggers.test.ts`
Expected: FAIL（`shouldRevalidateAfterClaimRevocation is not a function` またはimportエラー）

- [ ] **Step 3: `lib/organizations/revalidationTriggers.ts` に実装を追加する**

ファイル末尾に追記：

```ts
/** revoke_claim（038）の応答 */
export type ClaimRevocationResult = { ok?: boolean } | null | undefined;

/**
 * 発行の取消：成功したら claim_status が unclaimed に変わる
 * （frozen 中は revoke_claim が claim_status を書き換えないが、UI側で frozen の
 * 行はボタンを無効化しているため、成功応答が返る時点で常に claimed だったと
 * 見なせる。よって resolve_dispute と同じく「成功なら常に捨てる」でよい）。
 */
export function shouldRevalidateAfterClaimRevocation(
  result: ClaimRevocationResult
): boolean {
  return result?.ok === true;
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npx vitest run lib/organizations/revalidationTriggers.test.ts`
Expected: PASS

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: commit**

```bash
git add lib/organizations/revalidationTriggers.ts lib/organizations/revalidationTriggers.test.ts
git commit -m "feat(organizations): 発行の取消後は常に団体ページを再検証する判定を追加"
```

---

### Task 6: `app/api/claims/revoke/route.ts` を書く

**Files:**
- Create: `app/api/claims/revoke/route.ts`

**Interfaces:**
- Consumes: `createSupabaseWithBearer`/`getBearerToken`（`@/lib/supabaseRoute`）、`revalidateOrganizationPage`（`@/lib/organizations/revalidatePage`）、`organizationPagePath`（`@/lib/organizations/paths`）、`shouldRevalidateAfterClaimRevocation`（`@/lib/organizations/revalidationTriggers`、Task 5）
- Produces: `POST /api/claims/revoke`（body: `{ claimId, organizationId, reason }` → `revoke_claim` RPCを呼び、成功時は団体ページを再検証）

- [ ] **Step 1: Route Handlerを書く**

```ts
import { NextResponse } from "next/server";
import { createSupabaseWithBearer, getBearerToken } from "@/lib/supabaseRoute";
import { revalidateOrganizationPage } from "@/lib/organizations/revalidatePage";
import { organizationPagePath } from "@/lib/organizations/paths";
import { shouldRevalidateAfterClaimRevocation } from "@/lib/organizations/revalidationTriggers";

/**
 * 運営単独での「発行の取消」（revoke_claim、038で掲載内容の復元を統合済み）。
 *
 * 認可は revoke_claim 自身の `is_system_admin()` が持つ（このルートは `/admin` 配下
 * ではないので middleware の Basic 認証は掛からない。既存の decide・resolve と同じ設計）。
 * 成功すれば常に claim_status が変わるので、常に対象ページを再検証する。
 *
 * ⚠️ `organizationId` の扱いは app/api/claims/decide/route.ts と同じ理由・同じ形。
 * `organization_claims` にはSELECTポリシーが無く、サーバ側でトークンから引き直せない。
 */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  let body: {
    claimId?: string;
    organizationId?: string;
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!organizationPagePath(body.organizationId)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const supabase = createSupabaseWithBearer(token);
  const { data, error } = await supabase.rpc("revoke_claim", {
    p_claim_id: body.claimId,
    p_reason: body.reason ?? null,
  });

  if (error) {
    console.error("revoke_claim failed:", error.message);
    return NextResponse.json({ ok: false, error: "rpc_error" }, { status: 502 });
  }

  const result = data as { ok: boolean; error?: string };
  if (shouldRevalidateAfterClaimRevocation(result)) {
    revalidateOrganizationPage(body.organizationId);
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: commit**

```bash
git add app/api/claims/revoke/route.ts
git commit -m "feat(api): /api/claims/revoke を追加（発行の取消、ISR再検証込み）"
```

---

### Task 7: `/admin/claims` に承認済み一覧と「発行の取消」を追加する

**Files:**
- Modify: `app/admin/claims/page.tsx`

**Interfaces:**
- Consumes: `ApprovedClaimRow`（Task 4）、`claimRevocationErrorMessage`/`canSubmitClaimRevocation`/`revokeClaimSuccessMessage`（Task 4）、`POST /api/claims/revoke`（Task 6）、`Textarea`（`@/components/ui`）

- [ ] **Step 1: importを追加する**

`app/admin/claims/page.tsx`冒頭のimportブロックを変更：

Before:
```tsx
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { evaluateSignals, resolveVerdict } from "@/lib/claims/signals";
import { claimDecisionErrorMessage } from "@/lib/claims/claimDecision";
import type { RawSignals, SignalColor } from "@/lib/claims/types";
```

After:
```tsx
import { supabase } from "@/lib/supabase";
import { Button, Textarea } from "@/components/ui";
import { evaluateSignals, resolveVerdict } from "@/lib/claims/signals";
import { claimDecisionErrorMessage } from "@/lib/claims/claimDecision";
import {
  claimRevocationErrorMessage,
  canSubmitClaimRevocation,
  revokeClaimSuccessMessage,
} from "@/lib/claims/claimRevocation";
import type { RawSignals, SignalColor, ApprovedClaimRow } from "@/lib/claims/types";
```

- [ ] **Step 2: stateとloadApprovedを追加する**

Before:
```tsx
export default function AdminClaimsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_pending_claims");
    if (error) {
      toast.error("申請の取得に失敗しました");
      setRows([]);
      return;
    }
    setRows((data ?? []) as ClaimRow[]);
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
      await load();
    })();
  }, [router, load]);
```

After:
```tsx
export default function AdminClaimsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
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

- [ ] **Step 3: `revoke`ハンドラーを追加する**

`decide`関数の直後（`if (isAdmin === null)`の手前）に追加：

```tsx
  const revoke = async (row: ApprovedClaimRow) => {
    const reason = revokeReasons[row.id] ?? "";
    if (!canSubmitClaimRevocation(reason)) return;
    setRevokeBusyId(row.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/claims/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          claimId: row.id,
          organizationId: row.organization_id,
          reason: reason.trim(),
        }),
      });
      const r = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        removed_members?: number;
        removed_invitations?: number;
      };
      if (!r?.ok) {
        toast.error(
          claimRevocationErrorMessage(r?.error ?? (res.ok ? undefined : "rpc_error"))
        );
        return;
      }
      toast.success(
        revokeClaimSuccessMessage({
          ok: true,
          removed_members: r.removed_members ?? 0,
          removed_invitations: r.removed_invitations ?? 0,
        })
      );
      setOpenRevokeId(null);
      setRevokeReasons((p) => ({ ...p, [row.id]: "" }));
      await loadApproved();
    } finally {
      setRevokeBusyId(null);
    }
  };

```

- [ ] **Step 4: 承認済みセクションのUIを追加する**

既存の申請一覧を囲む`<div className="max-w-[1100px] mx-auto">`の閉じタグ直前（rowsの`.map`ブロックの後、`</div>`が2つ並ぶ手前）に追加：

Before:
```tsx
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

After:
```tsx
            })}
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-xl font-bold text-ink mb-1">承認済み（発行の取消）</h2>
          <p className="text-xs text-graphite/70 mb-4">
            第三者からの異議申立てを待たずに、運営の判断で管理権限を取り消せます。
            取り消すとメンバー・招待が削除され、掲載内容は引き取り前の状態に戻ります。
          </p>

          {approvedRows.length === 0 ? (
            <p className="text-graphite text-sm bg-paper border border-rule p-6">
              承認済みの申請はありません。
            </p>
          ) : (
            <div className="space-y-4">
              {approvedRows.map((row) => {
                const frozen = row.organization_claim_status === "frozen";
                const isOpen = openRevokeId === row.id;
                return (
                  <div key={row.id} className="bg-paper border border-rule p-5">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <Link
                          href={`/organizations/${row.organization_id}`}
                          className="text-ink font-bold hover:underline"
                        >
                          {row.organization_name || "（名称なし）"}
                        </Link>
                        <p className="text-xs text-graphite/70 mt-0.5">
                          {row.organization_university} ／ {row.applicant_name || "（氏名不明）"}
                          {row.applicant_email ? ` ・ ${row.applicant_email}` : ""}
                        </p>
                        <p className="text-xs text-graphite/50 mt-0.5">
                          {row.decided_at
                            ? `${new Date(row.decided_at).toLocaleString("ja-JP")} 承認`
                            : ""}
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-mist text-ink">
                        {row.granted_level === "full" ? "フル権限" : "限定権限"}
                      </span>
                    </div>

                    {frozen ? (
                      <div className="bg-seal/10 border border-seal p-3 mt-3">
                        <p className="text-xs font-bold text-seal mb-1">
                          異議申立て対応中です
                        </p>
                        <p className="text-xs text-graphite">
                          この団体は現在凍結中です。取消は{" "}
                          <Link href="/admin/disputes" className="underline">
                            /admin/disputes
                          </Link>{" "}
                          から対応してください。
                        </p>
                      </div>
                    ) : isOpen ? (
                      <div className="bg-mist border border-seal p-3 mt-3">
                        <p className="text-xs font-bold text-seal mb-2">
                          この操作は取り消せません。メンバー・招待が削除され、掲載内容は引き取り前の状態に戻ります。
                        </p>
                        <Textarea
                          value={revokeReasons[row.id] ?? ""}
                          onChange={(e) =>
                            setRevokeReasons((p) => ({ ...p, [row.id]: e.target.value }))
                          }
                          placeholder="取消理由（必須・監査に残ります）"
                          rows={2}
                          className="mb-2"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              revokeBusyId === row.id ||
                              !canSubmitClaimRevocation(revokeReasons[row.id] ?? "")
                            }
                            onClick={() => revoke(row)}
                          >
                            取り消しを実行
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={revokeBusyId === row.id}
                            onClick={() => setOpenRevokeId(null)}
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outlineMuted"
                        onClick={() => setOpenRevokeId(row.id)}
                      >
                        発行の取消
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

- [ ] **Step 5: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 6: commit**

```bash
git add app/admin/claims/page.tsx
git commit -m "feat(admin): /admin/claims に承認済み一覧と発行の取消UIを追加"
```

---

### Task 8: 最終検証・ドキュメント更新・デプロイ判断

**Files:**
- Modify: `docs/task-board.md`
- Modify: `.superpowers/sdd/progress.md`（存在すれば。B19用のledgerが無ければ新規追記でよい）
- Modify: `docs/models/ProofLoop_タスクシート_2026-08-07.xlsx`（再生成）

**Interfaces:**
- Consumes: Task 1〜7の全成果物

- [ ] **Step 1: 全体テストを実行する**

Run: `npm test`
Expected: 全ファイルPASS（既存44ファイル399テスト＋Task4・5で追加した分）

- [ ] **Step 2: 型チェック**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: ビルド確認**

⚠️ 開発サーバー（`npm run dev`）が起動中なら先に停止すること（CLAUDE.mdの落とし穴：同時実行で`.next`が壊れる）。

Run: `npm run build`
Expected: ビルド成功

- [ ] **Step 4: ブラウザで空状態のレンダリングを確認する**

本番には承認済みclaimがまだ0件（トークン未発行のため）。`npm run build && npm start`（またはローカルdevサーバー）で管理者アカウントにログインし`/admin/claims`を開き、追加した「承認済み（発行の取消）」セクションが「承認済みの申請はありません。」を表示してエラーなくレンダリングされることを確認する。承認済みclaimが実在しないため、ボタン押下の実クリックフローはこの時点では確認できない（本番でトークン発行・承認が進んだ後にあらためて確認する）。

- [ ] **Step 5: `docs/task-board.md` を更新する**

`docs/task-board.md`のタスクI2の該当箇所（`revoke_claim`のUIの項目）を、実装済みである旨と実際のcommitハッシュに更新する。

- [ ] **Step 6: タスクシートを再生成する**

Run: `node docs/models/build-task-sheet.mjs "ProofLoop_タスクシート_2026-08-07.xlsx"`
Expected: 正常終了

- [ ] **Step 7: commit**

```bash
git add docs/task-board.md docs/models/ProofLoop_タスクシート_2026-08-07.xlsx
git commit -m "docs: B19（発行の取消UI）実装完了をタスクボード・タスクシートに反映"
```

- [ ] **Step 8: 本番デプロイの要否をユーザーに確認する**

このプランのTask 4〜7はコード変更のみで、Task 3で既にDBは本番適用済み。**コード側の変更（UI・APIルート）は`git push origin main`しないとVercelに反映されない。** 前回セッションでpushし忘れて本番が古いままになった事故があるため、ここで必ずユーザーに「`git push origin main`を実行してよいか」を確認し、承認を得てから実行する。

```bash
git push origin main
```

- [ ] **Step 9: push後、Vercelの新デプロイ反映を確認する**

デプロイ完了後、本番の`/admin/claims`を実プロパティで開き、「承認済み（発行の取消）」セクションが表示されることを確認する（Task 4のブラウザ確認と同様、0件表示になる想定）。

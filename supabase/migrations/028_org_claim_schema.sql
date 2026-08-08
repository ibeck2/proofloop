-- ============================================
-- 028 掲載団体の claim 動線 v1（スキーマ）
-- 設計: docs/superpowers/specs/2026-08-08-org-claim-design.md
-- ============================================

-- --------------------------------------------
-- 0. organizations に claim 状態を持たせる
--    導出可能だが、凍結は「RLSのUPDATEポリシーで書き込みを止める」ことなので
--    ポリシーから参照できる場所に無いと実装できない
-- --------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS claim_status text NOT NULL DEFAULT 'unclaimed';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_claim_status_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_claim_status_check
  CHECK (claim_status IN ('unclaimed', 'claimed', 'frozen'));

-- 凍結中は団体側からの更新を止める（運営の SECURITY DEFINER RPC は影響を受けない）
DROP POLICY IF EXISTS organizations_update_by_members ON public.organizations;
CREATE POLICY organizations_update_by_members ON public.organizations
  FOR UPDATE
  USING (
    id IN (SELECT get_user_organization_ids(auth.uid()))
    AND claim_status <> 'frozen'
  )
  WITH CHECK (
    id IN (SELECT get_user_organization_ids(auth.uid()))
    AND claim_status <> 'frozen'
  );

-- --------------------------------------------
-- 1. claim（1発行1行）
-- --------------------------------------------
CREATE TABLE public.organization_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  -- どこに送ったか。データは後から変わるので発行時点のスナップショットとして持つ
  channel text NOT NULL CHECK (channel IN ('x', 'instagram', 'website', 'line')),
  channel_handle text,
  channel_is_unique boolean NOT NULL,

  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,

  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued','applied','approved','rejected','revoked','expired')),

  applicant_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  applicant_role text,
  applicant_note text,
  applied_at timestamptz,

  -- 判定時のシグナルを固めて保存する。無いと判定根拠を後で再現できない
  signals jsonb,
  signal_verdict text CHECK (signal_verdict IN ('green','red')),
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_note text,
  granted_level text CHECK (granted_level IN ('full','limited'))
);

CREATE INDEX idx_org_claims_org ON public.organization_claims (organization_id);
CREATE INDEX idx_org_claims_status ON public.organization_claims (status);

-- 承認済みは1団体につき1件まで
CREATE UNIQUE INDEX uniq_org_claims_approved
  ON public.organization_claims (organization_id)
  WHERE status = 'approved';

-- ★ SELECT ポリシーを1本も張らない。RLSは有効にするがポリシーが無い＝誰も直接読めない。
--    照合は SECURITY DEFINER の RPC だけが行う（029）。
ALTER TABLE public.organization_claims ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- 2. 掲載内容のスナップショット（巻き戻しの土台）
-- --------------------------------------------
CREATE TABLE public.organization_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  reason text NOT NULL CHECK (reason IN ('pre_claim','pre_freeze')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_snapshots_org_reason
  ON public.organization_snapshots (organization_id, reason, created_at DESC);

ALTER TABLE public.organization_snapshots ENABLE ROW LEVEL SECURITY;
-- ポリシーなし＝RPC 経由のみ

-- --------------------------------------------
-- 3. 異議申立て
-- --------------------------------------------
CREATE TABLE public.organization_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.organization_claims(id) ON DELETE SET NULL,
  reporter_name text NOT NULL,
  -- 匿名申立てを許すと妨害のコストがゼロになるので必須にする
  reporter_contact text NOT NULL,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','upheld','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_note text
);

-- 同一団体に open な申立ては1件まで。
-- アプリ側チェックだけだと同時送信をすり抜ける（027 で費目の重複を防いだのと同じ手）
CREATE UNIQUE INDEX uniq_org_disputes_open
  ON public.organization_disputes (organization_id)
  WHERE status = 'open';

ALTER TABLE public.organization_disputes ENABLE ROW LEVEL SECURITY;
-- ポリシーなし＝RPC 経由のみ

-- --------------------------------------------
-- 4. 既存の穴を塞ぐ
--    organization_invitations の SELECT が qual:true で、未認証でも全行読めていた。
--    現在0件なので実害は出ていないが、団体が招待を使い始めた瞬間に全トークンが漏れる。
--    受諾ページは RPC get_invitation_preview 経由なので影響しない。
--    members画面の一覧と招待APIの insert().select(token) は
--    organization_invitations_select_org_admins で通ることを確認済み。
-- --------------------------------------------
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.organization_invitations;

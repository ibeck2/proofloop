-- ============================================
-- 031 運営が申請と申立てを一覧するための RPC
-- organization_claims / organization_disputes は SELECT ポリシーが無いため、
-- admin 向けの読み取りも RPC 経由にする
-- ============================================

CREATE OR REPLACE FUNCTION public.list_pending_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text,
  organization_university text, channel text, channel_handle text,
  applicant_user_id uuid, applicant_role text, applicant_note text,
  applied_at timestamptz, signals jsonb
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university,
         c.channel, c.channel_handle,
         c.applicant_user_id, c.applicant_role, c.applicant_note,
         c.applied_at, c.signals
  FROM public.organization_claims c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE public.is_system_admin() AND c.status = 'applied'
  ORDER BY c.applied_at ASC;
$$;

-- froze_organization は概念としては 032（自動凍結のレート制限）の列だが、
-- 列を追加するのは 032 なのに参照するのは 031 という前後関係になると、
-- 番号順に適用したときに 031 が
-- "column d.froze_organization does not exist" で落ちる
-- （LANGUAGE sql の関数本体は CREATE 時に解決されるため）。
-- IF NOT EXISTS にしてあるので、032 側の同じ ALTER は no-op になる。
ALTER TABLE public.organization_disputes
  ADD COLUMN IF NOT EXISTS froze_organization boolean NOT NULL DEFAULT false;

-- 戻り値の列を増やすため CREATE OR REPLACE では差し替えられない（旧定義が
-- 残っている環境で "cannot change return type of existing function" になる）。
DROP FUNCTION IF EXISTS public.list_open_disputes();

CREATE OR REPLACE FUNCTION public.list_open_disputes()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, claim_id uuid,
  reporter_name text, reporter_contact text, body text, created_at timestamptz,
  froze_organization boolean
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  -- froze_organization は 032 で追加。これが無いと運営は「この申立ては
  -- 実際に団体を凍結したのか、レート制限で記録だけされたのか」を判別できず、
  -- 凍結されていない団体を凍結中だと思い込んで対応してしまう。
  SELECT d.id, d.organization_id, o.name, d.claim_id,
         d.reporter_name, d.reporter_contact, d.body, d.created_at,
         d.froze_organization
  FROM public.organization_disputes d
  JOIN public.organizations o ON o.id = d.organization_id
  WHERE public.is_system_admin() AND d.status = 'open'
  ORDER BY d.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_pending_claims() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_open_disputes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_claims() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_open_disputes() TO authenticated;

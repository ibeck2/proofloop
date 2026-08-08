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

CREATE OR REPLACE FUNCTION public.list_open_disputes()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, claim_id uuid,
  reporter_name text, reporter_contact text, body text, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT d.id, d.organization_id, o.name, d.claim_id,
         d.reporter_name, d.reporter_contact, d.body, d.created_at
  FROM public.organization_disputes d
  JOIN public.organizations o ON o.id = d.organization_id
  WHERE public.is_system_admin() AND d.status = 'open'
  ORDER BY d.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.list_pending_claims() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_open_disputes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_pending_claims() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_open_disputes() TO authenticated;

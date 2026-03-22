-- 団体招待・メンバー一覧用（organization_invitations + RPC + RLS）
-- organization_members は既存前提。未作成環境向けに IF NOT EXISTS を併記

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin')),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_org_email_uidx
  ON public.organization_invitations (organization_id, lower(trim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_uidx
  ON public.organization_members (organization_id, user_id);

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_invitations_select_org_admins" ON public.organization_invitations;
DROP POLICY IF EXISTS "organization_invitations_insert_org_admins" ON public.organization_invitations;
DROP POLICY IF EXISTS "organization_invitations_delete_org_admins" ON public.organization_invitations;

CREATE POLICY "organization_invitations_select_org_admins"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "organization_invitations_insert_org_admins"
  ON public.organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "organization_invitations_delete_org_admins"
  ON public.organization_invitations
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- 同一団体内のメンバー同士がプロフィール（氏名表示用）を参照できるようにする
DROP POLICY IF EXISTS "Organization members can view coworker profiles" ON public.profiles;

CREATE POLICY "Organization members can view coworker profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT om2.user_id
      FROM public.organization_members om1
      INNER JOIN public.organization_members om2
        ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
    )
  );

-- トークンを知る人のみプレビュー可能（リンクの秘密性に依存）
-- token カラムが uuid 型のため引数も uuid（旧 text 版は削除）
DROP FUNCTION IF EXISTS public.get_invitation_preview(text);
DROP FUNCTION IF EXISTS public.accept_organization_invitation(text);

CREATE OR REPLACE FUNCTION public.get_invitation_preview(p_token uuid)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  invitation_email text,
  invitation_role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, i.email, i.role
  FROM public.organization_invitations i
  INNER JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_preview(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(uuid) TO authenticated;

-- 招待受諾（メール一致・メンバー INSERT・招待 DELETE）
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.organization_invitations%ROWTYPE;
  uemail text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO inv
  FROM public.organization_invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = auth.uid();
  IF uemail IS NULL OR lower(trim(uemail)) <> lower(trim(inv.email)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'email_mismatch');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = inv.organization_id AND user_id = auth.uid()
  ) THEN
    DELETE FROM public.organization_invitations WHERE token = p_token;
    RETURN jsonb_build_object('ok', true, 'already_member', true);
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (inv.organization_id, auth.uid(), inv.role);

  DELETE FROM public.organization_invitations WHERE token = p_token;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;

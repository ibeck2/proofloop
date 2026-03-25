-- メンバー詳細権限フラグ（招待時に指定し、受諾時に organization_members へ反映）

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS can_edit_profile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_posts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_members boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_applications boolean NOT NULL DEFAULT true;

ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS can_edit_profile boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_posts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_members boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_applications boolean NOT NULL DEFAULT true;

-- 招待受諾 RPC を権限フラグ込みで更新（列が無い環境でも既存挙動を維持）
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

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    can_edit_profile,
    can_manage_posts,
    can_manage_members,
    can_manage_applications
  )
  VALUES (
    inv.organization_id,
    auth.uid(),
    inv.role,
    COALESCE(inv.can_edit_profile, false),
    COALESCE(inv.can_manage_posts, true),
    COALESCE(inv.can_manage_members, false),
    COALESCE(inv.can_manage_applications, true)
  );

  DELETE FROM public.organization_invitations WHERE token = p_token;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(uuid) TO authenticated;


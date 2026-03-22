-- RLS 無限再帰（42P17）対策: organization_members をポリシー内で直接 SELECT すると
-- organization_members 自身の RLS と循環することがある。
-- SECURITY DEFINER ヘルパーでテーブル所有者権限の読み取りを行い、循環を断つ。

-- ---------------------------------------------------------------------------
-- 1) ヘルパー関数（RLS バイパス・search_path 固定）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_user_organization_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = p_user_id;
$$;

COMMENT ON FUNCTION public.get_user_organization_ids(uuid) IS
  '所属 organization_id の一覧（RLS 再帰回避用）。ポリシー内で使用。';

CREATE OR REPLACE FUNCTION public.get_user_admin_organization_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = p_user_id
    AND role IN ('owner', 'admin');
$$;

COMMENT ON FUNCTION public.get_user_admin_organization_ids(uuid) IS
  'owner/admin として所属する organization_id（招待・ページビュー集計等）。';

CREATE OR REPLACE FUNCTION public.get_coworker_profile_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om2.user_id
  FROM public.organization_members om1
  INNER JOIN public.organization_members om2
    ON om1.organization_id = om2.organization_id
  WHERE om1.user_id = p_user_id;
$$;

COMMENT ON FUNCTION public.get_coworker_profile_ids(uuid) IS
  '同一団体内メンバーの user_id（profiles 参照ポリシー用）。';

CREATE OR REPLACE FUNCTION public.get_owner_user_ids_for_applied_orgs(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.user_id
  FROM public.organization_members om
  WHERE om.role = 'owner'
    AND om.organization_id IN (
      SELECT organization_id
      FROM public.applications
      WHERE user_id = p_user_id
    );
$$;

COMMENT ON FUNCTION public.get_owner_user_ids_for_applied_orgs(uuid) IS
  '応募先団体の owner の user_id（応募者がオーナープロフィールを見る用）。';

-- Supabase ドキュメントでよくあるエイリアス（引数なし = 現在ユーザー）
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_organization_ids(auth.uid());
$$;

COMMENT ON FUNCTION public.get_user_organizations() IS
  'auth.uid() の所属 organization_id。get_user_organization_ids のショートカット。';

REVOKE ALL ON FUNCTION public.get_user_organization_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_organization_ids(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_admin_organization_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_admin_organization_ids(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_coworker_profile_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coworker_profile_ids(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_owner_user_ids_for_applied_orgs(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_user_ids_for_applied_orgs(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) organization_members: 既存ポリシーをすべて削除し、ヘルパーで再定義
--    （儀式名が環境ごとに異なるため動的 DROP）
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.organization_members') IS NULL THEN
    RAISE NOTICE 'public.organization_members が無いため organization_members のポリシー再作成をスキップします';
    RETURN;
  END IF;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organization_members'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.organization_members',
      pol.policyname
    );
  END LOOP;
END;
$$;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 自分が所属する団体のメンバー行をすべて参照可能（メンバー一覧・同僚判定の土台）
CREATE POLICY "organization_members_select_same_org"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- owner/admin がメンバー追加（招待受諾は SECURITY DEFINER RPC で別途挿入可）
CREATE POLICY "organization_members_insert_org_admins"
  ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_admin_organization_ids(auth.uid())
    )
  );

CREATE POLICY "organization_members_update_org_admins"
  ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_admin_organization_ids(auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_admin_organization_ids(auth.uid())
    )
  );

CREATE POLICY "organization_members_delete_self_or_admin"
  ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR organization_id IN (
      SELECT public.get_user_admin_organization_ids(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3) profiles: organization_members を直接読まないよう差し替え
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Clubs can view applicant profiles" ON public.profiles;
CREATE POLICY "Clubs can view applicant profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT a.user_id
      FROM public.applications a
      WHERE a.organization_id IN (
        SELECT public.get_user_organization_ids(auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Applicants can view club admin profiles" ON public.profiles;
CREATE POLICY "Applicants can view club admin profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT public.get_owner_user_ids_for_applied_orgs(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Organization members can view coworker profiles" ON public.profiles;
CREATE POLICY "Organization members can view coworker profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT public.get_coworker_profile_ids(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 4) tasks（013）
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "tasks_select_own_org" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own_org" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own_org" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own_org" ON public.tasks;

CREATE POLICY "tasks_select_own_org"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "tasks_insert_own_org"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "tasks_update_own_org"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "tasks_delete_own_org"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 5) organization_invitations（014）
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "organization_invitations_select_org_admins" ON public.organization_invitations;
DROP POLICY IF EXISTS "organization_invitations_insert_org_admins" ON public.organization_invitations;
DROP POLICY IF EXISTS "organization_invitations_delete_org_admins" ON public.organization_invitations;

CREATE POLICY "organization_invitations_select_org_admins"
  ON public.organization_invitations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_admin_organization_ids(auth.uid())
    )
  );

CREATE POLICY "organization_invitations_insert_org_admins"
  ON public.organization_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_admin_organization_ids(auth.uid())
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "organization_invitations_delete_org_admins"
  ON public.organization_invitations
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_admin_organization_ids(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 6) organization_page_views（015）— テーブル未作成環境ではスキップ
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.organization_page_views') IS NULL THEN
    RAISE NOTICE 'organization_page_views が無いため select_org_staff ポリシーをスキップ';
    RETURN;
  END IF;
  EXECUTE
    'DROP POLICY IF EXISTS "organization_page_views_select_org_staff" ON public.organization_page_views';
  EXECUTE
    'CREATE POLICY "organization_page_views_select_org_staff"
       ON public.organization_page_views
       FOR SELECT
       TO authenticated
       USING (
         organization_id IN (
           SELECT public.get_user_admin_organization_ids(auth.uid())
         )
       )';
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) organization_posts（016）— メンバー用ポリシーのみ（017 の公開 SELECT はそのまま）
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "organization_posts_select_members" ON public.organization_posts;
DROP POLICY IF EXISTS "organization_posts_insert_members" ON public.organization_posts;
DROP POLICY IF EXISTS "organization_posts_delete_members" ON public.organization_posts;
DROP POLICY IF EXISTS "organization_posts_update_members" ON public.organization_posts;

CREATE POLICY "organization_posts_select_members"
  ON public.organization_posts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "organization_posts_insert_members"
  ON public.organization_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "organization_posts_update_members"
  ON public.organization_posts
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "organization_posts_delete_members"
  ON public.organization_posts
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 8) organizations UPDATE（018）
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_by_members" ON public.organizations;

CREATE POLICY "organizations_update_by_members"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  )
  WITH CHECK (
    id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- organization_members ベースの RLS（従来の organizations.user_id 前提を置き換え）
-- 前提: public.organization_members (id, organization_id, user_id, role) が存在すること

-- ---------------------------------------------------------------------------
-- profiles: チャット通知用 SELECT（011 の置き換え）
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Clubs can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Applicants can view club admin profiles" ON public.profiles;

CREATE POLICY "Clubs can view applicant profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id
      FROM public.applications
      WHERE organization_id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- 応募者は応募先団体のオーナー（従来どおり 1 名相当）のプロフィールのみ参照可
CREATE POLICY "Applicants can view club admin profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id
      FROM public.organization_members
      WHERE role = 'owner'
        AND organization_id IN (
          SELECT organization_id
          FROM public.applications
          WHERE user_id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- tasks（012 の置き換え）
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
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert_own_org"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update_own_org"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_delete_own_org"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

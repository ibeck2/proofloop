-- tasks: ログインユーザーが管理する団体（organizations.user_id = auth.uid()）のタスクのみ CRUD
-- ※ tasks テーブルが未作成の場合は先にテーブルを作成してから適用してください

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

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
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_insert_own_org"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_update_own_org"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tasks_delete_own_org"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE user_id = auth.uid()
    )
  );

-- 048 task_checklist_items: タスクのチェックリスト（担当者・期限は持たないシンプル仕様）
--
-- organization_id はクライアントから受け取らず、BEFORE INSERT/UPDATE OF task_id
-- トリガーで tasks.organization_id から自動導出する。これにより、クライアントが
-- 自分の別の団体のorganization_idを詐称して他団体のタスクにぶら下げる、といった
-- RLSの取り違えを構造的に防ぐ（CLAUDE.mdの既知の落とし穴：RLSは「フラグ列がある
-- から効いている」とは限らない、という教訓を踏まえた設計）。

CREATE TABLE public.task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_checklist_items_task_id ON public.task_checklist_items(task_id);
CREATE INDEX idx_task_checklist_items_org_id ON public.task_checklist_items(organization_id);

-- organization_id の自動導出（クライアント送信値は無視して上書きする）
CREATE OR REPLACE FUNCTION public.set_task_checklist_item_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_checklist_item_org() FROM PUBLIC;

CREATE TRIGGER task_checklist_items_set_org
  BEFORE INSERT OR UPDATE OF task_id ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_task_checklist_item_org();

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_checklist_items_select_own_org"
  ON public.task_checklist_items
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_checklist_items_insert_own_org"
  ON public.task_checklist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_checklist_items_update_own_org"
  ON public.task_checklist_items
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

CREATE POLICY "task_checklist_items_delete_own_org"
  ON public.task_checklist_items
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- 051 task_attachments: タスクの成果物・アウトプット添付
--
-- ファイル実体はSupabase Storage（バケット task-attachments、非公開）に保存し、
-- このテーブルはメタデータのみを持つ。organization_id はクライアントから受け取らず、
-- BEFORE INSERT/UPDATE トリガーで tasks.organization_id から自動導出する
-- （task_checklist_items で「BEFORE INSERT OR UPDATE OF task_id」という列指定トリガーが
-- 穴になっていた反省を踏まえ、最初から列指定なしの BEFORE INSERT OR UPDATE にする。
-- 詳細は docs/task-board.md セクションS参照）。
--
-- 添付できるのは団体メンバー全員（担当者・作成者に限定しない）。finance-receipts
-- バケットと異なり can_manage_org_finance のような権限制限は付けない。

CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX idx_task_attachments_org_id ON public.task_attachments(organization_id);

-- organization_id の自動導出（クライアント送信値は無視して上書きする）
CREATE OR REPLACE FUNCTION public.set_task_attachment_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.organization_id := (SELECT organization_id FROM public.tasks WHERE id = NEW.task_id);
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'task_id % does not reference an existing task', NEW.task_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_task_attachment_org() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_task_attachment_org() FROM anon, authenticated;

-- 列指定しない（task_checklist_items の反省を踏まえ、text/is_done相当の更新でも
-- 必ずorganization_idを再導出させる）
CREATE TRIGGER task_attachments_set_org
  BEFORE INSERT OR UPDATE ON public.task_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_task_attachment_org();

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_attachments_select_own_org"
  ON public.task_attachments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_attachments_insert_own_org"
  ON public.task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

CREATE POLICY "task_attachments_update_own_org"
  ON public.task_attachments
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

CREATE POLICY "task_attachments_delete_own_org"
  ON public.task_attachments
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- --------------------------------------------
-- Storage: 添付ファイルバケット（非公開）
-- --------------------------------------------
-- パス規則：{organization_id}/{task_id}/{timestamp}_{filename}
-- storage.foldername(name)[1] が organization_id になるため、is_org_member で判定できる。
-- is_org_member(uuid) は 026_finance_module.sql で作成済みの既存関数を再利用する。

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "task_attachments_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "task_attachments_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments'
              AND public.is_org_member(((storage.foldername(name))[1])::uuid));

CREATE POLICY "task_attachments_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'task-attachments'
         AND public.is_org_member(((storage.foldername(name))[1])::uuid));

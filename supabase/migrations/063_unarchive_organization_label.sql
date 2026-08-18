-- 063: 年度アーカイブの取り消しRPC
--
-- archive_organization_tasks（057）と対称の設計。指定したarchive_labelに
-- 一致し、かつ現在アーカイブ済み（archived_at IS NOT NULL）の全タスクに
-- ついて、archived_at・archive_labelをともにNULLに戻す。
--
-- 子テーブル（task_checklist_items・task_attachments・task_comments）の
-- RLS（060・062で追加した「対象タスクがarchived_at IS NULLであること」
-- という EXISTS 条件）は、タスク側のarchived_atを動的に参照している。
-- そのためこのRPCでタスク側を戻すだけで、子テーブルへの通常の書き込みが
-- 自動的に再び可能になる。子テーブル側のポリシー変更は不要。
--
-- archived_at/archive_label列へのUPDATE権限は057/058でauthenticatedから
-- 剥がされ、archive_organization_tasksのみが書ける状態になっている。この
-- RPCもSECURITY DEFINER（テーブル所有者として実行されRLS・列GRANT制限を
-- バイパスする）のため、同じ制限の影響を受けずに書き込める。

CREATE OR REPLACE FUNCTION public.unarchive_organization_label(
  p_organization_id uuid,
  p_archive_label text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'only organization owner/admin can unarchive tasks';
  END IF;

  UPDATE public.tasks
  SET archived_at = NULL,
      archive_label = NULL
  WHERE organization_id = p_organization_id
    AND archive_label = p_archive_label
    AND archived_at IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.unarchive_organization_label(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unarchive_organization_label(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.unarchive_organization_label(uuid, text) TO authenticated;

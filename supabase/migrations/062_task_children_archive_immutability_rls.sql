-- 062: アーカイブ済みタスクにぶら下がる子レコード（チェックリスト・添付・
-- コメント）への直接書き込みを、団体メンバー全員から禁止する
--
-- 060で tasks 本体のUPDATE/DELETEはarchived_at IS NULLで塞いだが、
-- task_checklist_items・task_attachments・task_commentsのRLSポリシーは
-- 引き続きorganization_id所属しか見ておらず、アーカイブ済みタスクの
-- チェックリストをチェックしたり、添付ファイルを削除したり（Storage実体
-- ごと消える）、コメントを新規投稿したりが直接APIから可能なままだった
-- （最終レビューで実証済み）。UIの`readOnly` propはこの下の層を守って
-- おらず、アーカイブ確認モーダルが約束する「コメント・添付ファイル・
-- チェックリストを含め削除はされず…いつでも参照できます」を担保する
-- には、この3テーブルの書き込み系ポリシー（INSERT/UPDATE/DELETE。
-- task_commentsはそもそもUPDATE/DELETEポリシーを持たない設計のため
-- INSERTのみ）にも同じ条件が要る。SELECTポリシーは対象外（アーカイブ
-- 済みでも参照はできる必要があるため）。

-- task_checklist_items
DROP POLICY "task_checklist_items_insert_own_org" ON public.task_checklist_items;
CREATE POLICY "task_checklist_items_insert_own_org"
  ON public.task_checklist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  );

DROP POLICY "task_checklist_items_update_own_org" ON public.task_checklist_items;
CREATE POLICY "task_checklist_items_update_own_org"
  ON public.task_checklist_items
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  );

DROP POLICY "task_checklist_items_delete_own_org" ON public.task_checklist_items;
CREATE POLICY "task_checklist_items_delete_own_org"
  ON public.task_checklist_items
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  );

-- task_attachments
DROP POLICY "task_attachments_insert_own_org" ON public.task_attachments;
CREATE POLICY "task_attachments_insert_own_org"
  ON public.task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  );

DROP POLICY "task_attachments_update_own_org" ON public.task_attachments;
CREATE POLICY "task_attachments_update_own_org"
  ON public.task_attachments
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  );

DROP POLICY "task_attachments_delete_own_org" ON public.task_attachments;
CREATE POLICY "task_attachments_delete_own_org"
  ON public.task_attachments
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  );

-- task_comments（UPDATE/DELETEポリシーは元々存在しない設計のため対象外）
DROP POLICY "task_comments_insert_own_org" ON public.task_comments;
CREATE POLICY "task_comments_insert_own_org"
  ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.archived_at IS NULL
    )
  );

-- 059でINSERT列を絞ったことでarchived_at/archive_labelを指定した偽装
-- タスク作成は既に防げているが、将来「列GRANTの絞り込みを忘れる」
-- 事故（CLAUDE.mdの030 profiles upsert事故と同種）が起きても不変条件が
-- 生き残るよう、tasks_insert_own_org自体にも念のためarchived_at IS NULL
-- を足しておく（多層防御。最終レビューMinor指摘）。
DROP POLICY "tasks_insert_own_org" ON public.tasks;
CREATE POLICY "tasks_insert_own_org"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    archived_at IS NULL
    AND organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

-- 061のlist_organization_archive_labelsに、archived_atがNULLのまま
-- archive_labelだけ設定された壊れた行（列GRANT制限により現状到達不能だが、
-- 念のため）を除外する条件を追加し、旧クライアント側実装
-- archiveLabelOptions()の挙動（archived_atが無い行は無視する）と完全に
-- 一致させる（最終レビューMinor指摘）。CREATE OR REPLACEなので、関数の
-- ACL・所有権は変更されない。
CREATE OR REPLACE FUNCTION public.list_organization_archive_labels(
  p_organization_id uuid
)
RETURNS TABLE (archive_label text, latest_archived_at timestamptz)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT archive_label, max(archived_at) AS latest_archived_at
  FROM public.tasks
  WHERE organization_id = p_organization_id
    AND archive_label IS NOT NULL
    AND archived_at IS NOT NULL
  GROUP BY archive_label
  ORDER BY max(archived_at) DESC;
$$;

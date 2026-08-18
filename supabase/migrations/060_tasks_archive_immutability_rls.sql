-- 060: アーカイブ済みタスクへの直接UPDATE/DELETEを、団体メンバー全員から禁止する
--
-- 057/058/059でarchived_at/archive_label列へのUPDATE/INSERTは権限レベルで
-- 塞いだが、tasks_update_own_org・tasks_delete_own_org・"Club admins can
-- manage their org tasks"（後者は organizations.user_id 経由の旧式ポリシー）
-- というRLSポリシー自体はarchived_atを見ておらず、団体所属さえしていれば
-- （owner/adminでなくても）アーカイブ済みタスクのtitle/statusを直接書き
-- 換えたり、行ごと削除したりできてしまう抜け穴が最終レビューで指摘された。
-- UIが「参照専用」と謳っている以上、アーカイブ済み行はRLSレベルでも
-- 書き換え・削除不能にする。
--
-- archive_organization_tasks RPCはSECURITY DEFINER（テーブル所有者
-- postgresとして実行され、既定でRLSをバイパスする）なので、この変更の
-- 影響を受けず、引き続きarchived_atを書き込める。
--
-- 3ポリシーとも本番の pg_policies を実測してから、archived_at IS NULL
-- 条件を追加する以外は元の定義（roles・qual・with_check）を変更していない。

DROP POLICY "tasks_update_own_org" ON public.tasks;
CREATE POLICY "tasks_update_own_org"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    archived_at IS NULL
    AND organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  )
  WITH CHECK (
    archived_at IS NULL
    AND organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

DROP POLICY "tasks_delete_own_org" ON public.tasks;
CREATE POLICY "tasks_delete_own_org"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    archived_at IS NULL
    AND organization_id IN (
      SELECT public.get_user_organization_ids(auth.uid())
    )
  );

DROP POLICY "Club admins can manage their org tasks" ON public.tasks;
CREATE POLICY "Club admins can manage their org tasks"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (
    archived_at IS NULL
    AND organization_id IN (
      SELECT organizations.id FROM organizations WHERE organizations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    archived_at IS NULL
    AND organization_id IN (
      SELECT organizations.id FROM organizations WHERE organizations.user_id = auth.uid()
    )
  );

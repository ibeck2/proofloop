-- 065 club admins can manually add applicants (applications.user_id IS NULL)
--
-- 背景：/clubats の「候補者を手動追加」は user_id: null で applications に
-- INSERTするが、既存の唯一のINSERTポリシー（Students can insert their own
-- applications）は auth.uid() = user_id を必須にしており、これは常にfalseに
-- なる。044以前から一度も成功したことがない機能だったと判明（本番0件と整合）。
--
-- can_view_org_applications() は owner/admin または can_manage_applications
-- を持つメンバーを判定する既存のSECURITY DEFINER関数（applications の
-- UPDATE/SELECTポリシーが既に使用）。同じ判定基準を流用する。
--
-- claim_status='claimed' の条件はあえて付けない。044が学生向けポリシーに
-- この条件を足した理由は「claim前・凍結中の団体には実質的な管理者がおらず
-- 応募が放置される」ことだったが、手動追加は can_view_org_applications() が
-- 既に「実在するowner/admin/権限メンバー本人の操作」であることを保証して
-- いるため、その懸念はそもそも当てはまらない。実際、claimシステム導入前から
-- 存在する団体（例：ProofLoop運営事務局）は実在のownerがいてもclaim_status
-- が 'unclaimed' のままであり、ここでclaimed条件を付けるとそうした既存団体
-- で手動追加が直らなくなる。

CREATE POLICY "Club admins can insert manual applications"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NULL
    AND can_view_org_applications(organization_id)
  );

-- 044 claim前・凍結中の団体への応募・チャット開始を防ぐ
--
-- 背景：既存の「Students can insert their own applications」は auth.uid() = user_id
-- だけをチェックしており、対象団体の claim_status（unclaimed/claimed/frozen）を
-- 一切見ていなかった。claim前・凍結中の団体には実質的な管理者がいないため、
-- 学生が応募・DMを送っても永久に応答が来ない（UI側の対応と合わせて防ぐ）。
--
-- application_messages への INSERT は
-- 「application_id IN (SELECT id FROM applications WHERE user_id = auth.uid())」を
-- 条件にしており、そもそも applications 行が存在しないと送れない。
-- ここを塞げば chat-only スレッド作成（is_chat_only=true の insert）も
-- 連鎖的に防げるため、application_messages 側の変更は不要。

DROP POLICY IF EXISTS "Students can insert their own applications" ON public.applications;
CREATE POLICY "Students can insert their own applications"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.claim_status = 'claimed'
    )
  );

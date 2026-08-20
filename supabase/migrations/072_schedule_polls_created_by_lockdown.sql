-- 072 schedule_polls: created_by の詐称を防ぐ（decide RPCへの権限昇格経路を遮断）
--
-- 066のINSERTポリシーは organization_id しか検証しておらず、created_by は任意の
-- profiles.id を指定できた。decide_schedule_poll_candidate（071）は「created_by本人
-- なら決定権を持つ」ため、created_by に非メンバーを含む任意のprofile idを詐称して
-- INSERTすれば、そのidの持ち主に決定権を付与できてしまう権限昇格経路が存在した
-- （taskレビューで本番BEGIN…ROLLBACKにより実証済み）。
-- created_by は常に「投稿者自身」であるべきというアプリの意図どおり、
-- created_by = auth.uid() をWITH CHECKに追加して詐称を塞ぐ。

DROP POLICY IF EXISTS "schedule_polls_insert_own_org" ON public.schedule_polls;

CREATE POLICY "schedule_polls_insert_own_org"
  ON public.schedule_polls FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    AND created_by = auth.uid()
  );

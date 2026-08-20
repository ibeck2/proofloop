-- 067 schedule_poll_candidates: INSERTでのis_decided=true直接指定を禁止
--
-- 066のINSERTポリシー（schedule_poll_candidates_insert_own_org）はorganization_id条件のみで、
-- is_decided列を一切見ていなかった。そのため全メンバーが最初から is_decided=true の行を
-- 直接INSERTでき、「決定」操作は作成者/owner/adminのみに限定するという設計
-- （docs/superpowers/specs/2026-08-20-clubschedule-design.md §5、069で追加予定の
-- decide_schedule_poll_candidate SECURITY DEFINER RPC限定）をRLS側で無効化できてしまっていた。
-- WITH CHECKに `AND NOT is_decided` を追加し、INSERTではis_decided=falseの行しか作れないようにする。
-- 既存決定済み行のUPDATE/DELETEポリシーは066で意図的に作っていない（変更なし）。

DROP POLICY IF EXISTS "schedule_poll_candidates_insert_own_org" ON public.schedule_poll_candidates;

CREATE POLICY "schedule_poll_candidates_insert_own_org"
  ON public.schedule_poll_candidates FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
    AND NOT is_decided
  );

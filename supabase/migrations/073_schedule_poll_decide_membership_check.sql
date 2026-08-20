-- 073 decide_schedule_poll_candidate: 作成者パスでも現在の団体所属を再確認する
--
-- 071の認可チェックは
--   IF auth.uid() IS DISTINCT FROM v_created_by
--      AND v_org_id NOT IN (SELECT public.get_user_admin_organization_ids(auth.uid())) THEN
-- という形で、auth.uid() = v_created_by（作成者本人）のときは丸ごと短絡してしまい、
-- 所属チェックが一度も行われない。そのため、pollを作成した後にその団体から
-- 外れたユーザーが、既に知っているcandidate_idを使ってこのRPCを呼び続けられる
-- （RLS経由のSELECTは失われているが、RPCはidさえ分かれば呼べるため）。
-- submit_schedule_poll_response（068/069）は毎回
--   v_org_id NOT IN (SELECT public.get_user_organization_ids(auth.uid()))
-- で現在の所属を再検証しており、decideだけこの検証が抜けていた不整合を埋める。
--
-- 対策：作成者/admin判定に加えて「現在その団体のメンバーであること」を必須条件として
-- 追加する。結果として、呼び出し元は (a) pollの団体に現在所属していること、かつ
-- (b) 作成者本人またはowner/adminであること、の両方を満たす必要がある。
-- UPDATE本体・二段階更新ロジックは変更しない。
--
-- 本番BEGIN...ROLLBACK検証（新関数定義をトランザクション内で差し替えてテストし、
-- 最後にROLLBACKして何も残さない方式）で以下4パターンを確認済み：
--   A) 作成者・現メンバー → 成功
--   B) owner（作成者ではない）・現メンバー → 成功
--   C) 作成者だが団体から除名済み → 拒否（今回追加した検証で新たに拒否されるようになった）
--   D) 一般メンバー（作成者でもowner/adminでもない） → 拒否（既存どおり）

CREATE OR REPLACE FUNCTION public.decide_schedule_poll_candidate(
  p_candidate_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_poll_id uuid;
  v_created_by uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT c.organization_id, c.poll_id, p.created_by
  INTO v_org_id, v_poll_id, v_created_by
  FROM public.schedule_poll_candidates c
  JOIN public.schedule_polls p ON p.id = c.poll_id
  WHERE c.id = p_candidate_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'candidate % not found', p_candidate_id;
  END IF;

  -- 現在その団体のメンバーであることを必須条件にする（作成者パスでも省略しない）。
  IF v_org_id NOT IN (SELECT public.get_user_organization_ids(auth.uid())) THEN
    RAISE EXCEPTION 'only the poll creator or an org admin can decide a candidate';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_created_by
     AND v_org_id NOT IN (SELECT public.get_user_admin_organization_ids(auth.uid())) THEN
    RAISE EXCEPTION 'only the poll creator or an org admin can decide a candidate';
  END IF;

  -- 同じpoll内の既存の決定を解除してから、指定候補を決定にする
  -- （部分ユニーク索引が「1 pollにつき決定候補は最大1件」を保証しているため、
  -- 解除せずに次のUPDATEを行うと制約違反になる）。
  UPDATE public.schedule_poll_candidates
  SET is_decided = false
  WHERE poll_id = v_poll_id AND is_decided;

  UPDATE public.schedule_poll_candidates
  SET is_decided = true
  WHERE id = p_candidate_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_schedule_poll_candidate(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decide_schedule_poll_candidate(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.decide_schedule_poll_candidate(uuid) TO authenticated;

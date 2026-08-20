-- 071 decide_schedule_poll_candidate: 幹事による確定操作
--
-- 呼び出し元がpollの作成者本人、またはその団体のowner/adminであることを内部で確認する。
-- 全メンバーが日程調整を作成できる一方、確定は無関係な人が誤って操作しないよう
-- 作成者/owner/adminに限定する（design spec §5・オーナー承認済み）。
--
-- ハードニング（本番BEGIN...ROLLBACK検証で発見・タスクブリーフの原案から追加）：
-- publicスキーマのデフォルト権限により、新規作成した関数は anon にも自動でEXECUTEが
-- 付与される（migration-safetyスキルの落とし穴1と同型）。この関数はauth.uid()が
-- NULL（未認証）の場合に「pollのcreated_byがNULL（作成者アカウント削除済み）」と
-- IS DISTINCT FROM 比較するとNULL同士でfalseとなり、認可チェックをすり抜けて
-- 未認証の呼び出しが確定操作を成功させてしまうことを実測で確認した
-- （brief記載どおりのSQLをBEGIN...ROLLBACKで検証し、is_decided=trueになることを確認済み）。
-- 対策として (1) 関数冒頭でauth.uid() IS NULLを明示的に拒否 (2) anonからのEXECUTEを
-- 明示的にREVOKEする、の2点をタスクブリーフのSQLに追加している。

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

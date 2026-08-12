-- ============================================
-- 040 タスクI2項目5：先行申請による締め出しへの復旧（再発行）
--
--    設計 docs/superpowers/specs/2026-08-13-i2-remaining-items-design.md
--
--    apply_for_claim（029）は c.status NOT IN ('issued','applied') のとき invalid を
--    返す。却下（reject）は status を 'rejected' に落とすため、第三者が先に申請して
--    却下された場合、以後は正当な団体も含め誰もそのトークンで再申請できない。
--    organization_claims には INSERT/UPDATE ポリシーが無くRPC経由のみが出入口
--    （028参照）なので、運営が却下済みclaimに対して新しいトークンを発行できる
--    RPCを追加する。却下済みclaimの行自体は監査記録として一切変更しない。
-- ============================================


-- --------------------------------------------
-- 1. 却下済みclaimを一覧するRPC（「再発行」の対象）
--
--    list_pending_claims（031）・list_approved_claims（038）と同じ権限モデル。
--    organization_claim_status も返す。却下後に別の申請が承認されて既に解決済み
--    （'unclaimed' でない）なら、フロント側で再発行ボタンを無効化するために使う
--    （無駄な再発行トークンを作らない。トークン自体はapply_for_claimのo.claim_status
--    チェックで安全に弾かれるので、これは正しさではなくUXのための情報）。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.list_rejected_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, organization_university text,
  organization_claim_status text,
  channel text, channel_handle text, decision_note text, decided_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university,
         o.claim_status,
         c.channel, c.channel_handle, c.decision_note, c.decided_at
  FROM public.organization_claims c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE public.is_system_admin() AND c.status = 'rejected'
  ORDER BY c.decided_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_rejected_claims() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_rejected_claims() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_rejected_claims() TO authenticated;


-- --------------------------------------------
-- 2. 却下済みclaimに対して新しいトークンを発行するRPC
--
--    却下済みの行（c）はそのまま監査記録として残し、同じ団体・同じチャネル情報
--    （channel/channel_handle/channel_is_unique）で新しい行を作る。新しい行の
--    decision_note には再発行理由（任意）を、decided_by/decided_at には
--    発行した運営者を記録する（decide_claimが後で上書きする想定の列だが、
--    「誰が・いつ再発行したか」を残す場所として転用する。新しい列を増やさない）。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.reissue_claim_token(p_claim_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  new_token uuid;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id;
  IF NOT FOUND OR c.status <> 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  INSERT INTO public.organization_claims (
    organization_id, channel, channel_handle, channel_is_unique,
    expires_at, decision_note, decided_by, decided_at
  ) VALUES (
    c.organization_id, c.channel, c.channel_handle, c.channel_is_unique,
    now() + interval '90 days', p_reason, auth.uid(), now()
  )
  RETURNING token INTO new_token;

  RETURN jsonb_build_object('ok', true, 'token', new_token);
END;
$$;

REVOKE ALL ON FUNCTION public.reissue_claim_token(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reissue_claim_token(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.reissue_claim_token(uuid, text) TO authenticated;

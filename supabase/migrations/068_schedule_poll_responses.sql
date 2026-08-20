-- 068 schedule_poll_responses: 候補日時への回答（○/△/×）
--
-- 書き込みはPostgRESTのupsertを使わず submit_schedule_poll_response RPC に一本化する。
-- 理由：PostgRESTのupsert（ON CONFLICT DO UPDATE）はpayload全列のUPDATE権限を要求し、
-- 主キー相当の列（candidate_id/user_id）にもUPDATE権限が必要になる（CLAUDE.mdに記録済みの
-- profiles upsert事故と同種の罠）。RPCに一本化すればテーブルへの直接UPDATE経路が
-- そもそも存在しないため、この罠を構造的に回避できる。

CREATE TABLE public.schedule_poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.schedule_poll_candidates(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response text NOT NULL CHECK (response IN ('yes', 'maybe', 'no')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_schedule_poll_responses_candidate_user
  ON public.schedule_poll_responses(candidate_id, user_id);
CREATE INDEX idx_schedule_poll_responses_org_id ON public.schedule_poll_responses(organization_id);
CREATE INDEX idx_schedule_poll_responses_user_id ON public.schedule_poll_responses(user_id);

ALTER TABLE public.schedule_poll_responses ENABLE ROW LEVEL SECURITY;

-- SELECT/INSERTのみ許可。INSERTは直接の初回回答用に残すが、実運用ではRPCが
-- INSERT ... ON CONFLICT DO UPDATE を発行するため、クライアントから直接INSERTを
-- 呼んでも2回目以降は一意制約違反になる（RPC経由のみが正しい書き込み手段）。
CREATE POLICY "schedule_poll_responses_select_own_org"
  ON public.schedule_poll_responses FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.get_user_organization_ids(auth.uid())));

CREATE POLICY "schedule_poll_responses_insert_own_org"
  ON public.schedule_poll_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT public.get_user_organization_ids(auth.uid()))
  );

-- UPDATEポリシーは作らない（更新はRPC内部のSECURITY DEFINERで行う）。

CREATE OR REPLACE FUNCTION public.submit_schedule_poll_response(
  p_candidate_id uuid, p_response text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org_id uuid;
BEGIN
  IF p_response NOT IN ('yes', 'maybe', 'no') THEN
    RAISE EXCEPTION 'invalid response: %', p_response;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.schedule_poll_candidates
  WHERE id = p_candidate_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'candidate % not found', p_candidate_id;
  END IF;

  IF v_org_id NOT IN (SELECT public.get_user_organization_ids(auth.uid())) THEN
    RAISE EXCEPTION 'not a member of this organization';
  END IF;

  INSERT INTO public.schedule_poll_responses (candidate_id, organization_id, user_id, response)
  VALUES (p_candidate_id, v_org_id, auth.uid(), p_response)
  ON CONFLICT (candidate_id, user_id)
  DO UPDATE SET response = EXCLUDED.response, updated_at = now();
END;
$$;

-- REVOKE ALL ... FROM PUBLIC は public スキーマのデフォルト権限では no-op
-- （CLAUDE.md「落とし穴」節・migration-safetyスキル参照）。anon/authenticatedへの
-- 直接EXECUTE権限を明示的に扱う（063 unarchive_organization_labelと同じパターン）。
REVOKE ALL ON FUNCTION public.submit_schedule_poll_response(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_schedule_poll_response(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_schedule_poll_response(uuid, text) TO authenticated;

-- ============================================
-- 041 タスクI2残り3項目・全体レビューで見つかったImportant1件+Minor2件を塞ぐ
--
--    docs/superpowers/plans/2026-08-13-i2-remaining-items.md の全体レビュー（opus）より。
--
--    1. 【Important】reissue_claim_tokenが発行した新トークンは、admin画面の一時state
--       （reissuedUrls）にしか存在しない。コピー前にリロード・画面遷移すると完全に失われる。
--       list_pending_claims/list_approved_claims/list_rejected_claimsのどれも
--       status='issued'のclaimを一覧しないため、失われた・二重発行されたトークンが
--       誰にも見えず、取り消す手段も無いまま90日間生き続ける。
--       list_rejected_claimsに「その団体に未使用（issued/applied）のclaimが
--       何件あるか」を足し、画面で警告できるようにする。
--
--    2. 【Minor】reissue_claim_tokenがorganizations.claim_statusを見ておらず、
--       UI側の「resolved」ガードだけに頼っていた。ページ読み込み後・クリック前に
--       別のclaimが承認されると、既に解決済みの団体に無駄なトークンが発行される
--       （TOCTOU）。RPC内部でも確認する。
--
--    3. 【Minor】他のclaim系RPC（apply_for_claim・decide_claim・revoke_claim）は
--       読んだ行をFOR UPDATEでロックしているが、reissue_claim_tokenだけ素のSELECT
--       だった。規約を揃える。
-- ============================================


-- --------------------------------------------
-- 1. list_rejected_claims に live_sibling_count を追加する
--
--    その団体に対して今も有効な未使用トークン（status IN ('issued','applied')
--    かつ期限内）が何件あるかを返す。0件なら再発行して問題ない。1件以上あれば
--    画面で警告し、二重発行や「実は誰かが今まさに申請中」の見落としを防ぐ。
--
--    戻り値の列を増やすため CREATE OR REPLACE では差し替えられない
--    （031のコメント参照）。
-- --------------------------------------------
DROP FUNCTION IF EXISTS public.list_rejected_claims();

CREATE OR REPLACE FUNCTION public.list_rejected_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, organization_university text,
  organization_claim_status text,
  channel text, channel_handle text, decision_note text, decided_at timestamptz,
  live_sibling_count int
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university,
         o.claim_status,
         c.channel, c.channel_handle, c.decision_note, c.decided_at,
         (SELECT count(*)::int FROM public.organization_claims s
            WHERE s.organization_id = c.organization_id
              AND s.status IN ('issued', 'applied')
              AND s.expires_at > now())
  FROM public.organization_claims c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE public.is_system_admin() AND c.status = 'rejected'
  ORDER BY c.decided_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_rejected_claims() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_rejected_claims() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_rejected_claims() TO authenticated;


-- --------------------------------------------
-- 2. reissue_claim_token：TOCTOUガードとFOR UPDATEを追加する
--
--    対象claimの行と、その団体のorganizations行の両方をFOR UPDATEでロックする
--    （decide_claimと同じロック順序：organization_claims行 → organizations行）。
--    claim_statusが'unclaimed'でなければ、既に別のclaimで解決済みなので
--    'already_claimed'を返して何もしない。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.reissue_claim_token(p_claim_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  org_status text;
  new_token uuid;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND OR c.status <> 'rejected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  SELECT claim_status INTO org_status
    FROM public.organizations WHERE id = c.organization_id FOR UPDATE;
  IF org_status <> 'unclaimed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
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

-- 関数のシグネチャ（引数・RETURNS jsonb）は変わらないため、040で設定したGRANTは
-- そのまま引き継がれる。

-- ============================================
-- 045 submit_dispute が実際に凍結したとき、現オーナーへの通知メールを
--     送るために必要な連絡先（owner_email / owner_name）を戻り値に含める
--
--    背景：タスク9（docs/superpowers/plans/2026-08-08-org-claim.md 2444行目）の
--    「frozen」通知は、第三者の異議申立てにより自動凍結が発生した瞬間
--    （＝この関数の実行中）に現オーナーへ知らせる必要がある。ところが
--    submit_dispute は anon にも EXECUTE を許可している（未ログインの訪問者でも
--    乗っ取りを申告できるようにするため、032参照）。一方 profiles.email は
--    037で「ログイン済み全ユーザーが誰の profiles でも読める」穴を塞いだばかりで、
--    匿名の申立て送信者がオーナーのメールアドレスを読み取れる経路は存在しない
--    （意図的にそう設計されている）。
--
--    そこでオーナーの連絡先解決は、この関数自身（SECURITY DEFINER・既に
--    organizations / organization_disputes を特権で読み書きしている）の内部で
--    行う。戻り値の jsonb には含めるが、これは Route Handler
--   （app/api/organizations/[id]/dispute/route.ts）が受け取って自分で
--    メール送信を発火し、ブラウザへ返す前に必ず取り除く前提。呼び出し元が
--    露出範囲を制御する設計は、list_approved_claims（038）が admin だけに
--    applicant_email を返す既存パターンと同じ。
--
--    オーナー特定の優先順位（owner→admin→最古のメンバー）は
--    lib/organizationMembers.ts の pickOrganizationContactUserId と同じ考え方を
--    SQLで再現。氏名・メールの列選択は list_approved_claims（038）と同じ
--    COALESCE(full_name, display_name) / COALESCE(contact_email, email) パターン。
--
--    実際に凍結が発生する2箇所（新規凍結・既存open申立ての昇格凍結）でのみ
--    解決する。凍結しない分岐（レート制限による記録のみ・already_open）は
--    オーナーへの通知が不要なので変更しない。
-- ============================================

CREATE OR REPLACE FUNCTION public.submit_dispute(
  p_org uuid, p_name text, p_contact text, p_body text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.organizations%ROWTYPE;
  snap jsonb;
  active_claim uuid;
  recent_freezes int;
  will_freeze boolean;
  existing public.organization_disputes%ROWTYPE;
  owner_user_id uuid;
  owner_email text;
  owner_name text;
  -- 直近1時間にこの件数だけ自動凍結したら、以降のリクエストは記録のみ行い
  -- 凍結を止める。「1時間に5団体までなら運営が気づいて対処できる」という
  -- 運用上の想定（オーナー承認済み）。閾値はここに集約し、裸の数値として
  -- 各所に散らばらせない。
  freeze_threshold CONSTANT int := 5;
BEGIN
  IF btrim(COALESCE(p_name,'')) = '' OR btrim(COALESCE(p_contact,'')) = ''
     OR btrim(COALESCE(p_body,'')) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_fields');
  END IF;

  SELECT * INTO o FROM public.organizations WHERE id = p_org FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  -- 未claimの団体には凍結すべきオーナーも巻き戻すべき変更も無い。
  -- そちらは /listing-policy（掲載停止の窓口）が受け持つ。
  IF o.claim_status <> 'claimed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_claimed');
  END IF;

  SELECT id INTO active_claim FROM public.organization_claims
    WHERE organization_id = p_org AND status = 'approved' LIMIT 1;

  -- 「直近1時間に自動凍結した件数」は froze_organization=true の行だけを数える。
  -- open件数（＝申立て総数）で数えると、閾値到達後に記録だけされた申立ても
  -- 誤って母数に含めてしまい、レート制限が意図せず永続的に効き続ける。
  --
  -- ⚠ 時刻の基準は created_at（通報時刻）ではなく froze_at（凍結時刻）。
  --   昇格パスは古い行の froze_organization を立てるので、created_at で数えると
  --   その凍結がカウンタから消え、レート制限を丸ごと素通りできる（先頭コメント参照）。
  -- ⚠ 数える前に全体で直列化する。上の FOR UPDATE は「その団体の行」しか
  --   押さえないため、別々の団体への同時リクエストは互いの未コミットの凍結を
  --   見ず、それぞれが「まだ枠がある」と判断して閾値を超えて凍結できる
  --   （同時実行数ぶんのオーバーシュート）。申立ては稀な操作なので、
  --   全体を1本のロックで直列化しても実用上の待ちは生じない。
  PERFORM pg_advisory_xact_lock(hashtext('proofloop.dispute_freeze_rate_limit'));

  SELECT count(*) INTO recent_freezes FROM public.organization_disputes
    WHERE froze_organization AND froze_at > now() - interval '1 hour';

  will_freeze := recent_freezes < freeze_threshold;

  -- 045で追加：実際に凍結するときだけ、現オーナーの連絡先を解決しておく。
  -- 呼び出し元（Route Handler）がメール送信に使い、クライアントへの応答からは
  -- 必ず取り除く。owner_user_id が見つからない（メンバー不在）場合は
  -- owner_email も NULL のままになり、呼び出し側は静かにメール送信をスキップする。
  IF will_freeze THEN
    SELECT om.user_id INTO owner_user_id
      FROM public.organization_members om
      WHERE om.organization_id = p_org
      ORDER BY CASE om.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
               om.created_at ASC
      LIMIT 1;

    IF owner_user_id IS NOT NULL THEN
      SELECT COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(p.display_name), '')),
             COALESCE(NULLIF(TRIM(p.contact_email), ''), NULLIF(TRIM(p.email), ''))
        INTO owner_name, owner_email
        FROM public.profiles p WHERE p.id = owner_user_id;
    END IF;
  END IF;

  -- 既に open な申立てがあるか。
  --
  -- ⚠ 凍結免疫の穴：攻撃者が (a) 無関係な団体への申立てで1時間の凍結枠を
  --   使い切り、(b) 自分が乗っ取った団体に自作自演の申立てを送ると、それは
  --   froze_organization=false で記録されつつ uniq_org_disputes_open の
  --   open スロットを占有する。以後、正当な関係者の申立ては already_open で
  --   弾かれ続け、運営が解決するまでその団体は永久に自動凍結されない。
  --
  --   そこで「open な申立てが未凍結」かつ「凍結枠に空きがある」ときは、
  --   既存の申立てを昇格させていま凍結する。新しい行は作らない
  --   （uniq_org_disputes_open があるため作れない）。
  SELECT * INTO existing FROM public.organization_disputes
    WHERE organization_id = p_org AND status = 'open'
    ORDER BY created_at ASC LIMIT 1
    FOR UPDATE;

  IF existing.id IS NOT NULL THEN
    IF existing.froze_organization OR NOT will_freeze THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_open');
    END IF;

    -- 却下されたときに戻せるよう、現在の状態も残す。
    -- resolve_dispute の却下パスは「申立て以降に作られた pre_freeze」だけを
    -- 探すので、昇格で作るこのスナップショット（created_at >= 申立ての
    -- created_at）が正しく拾われる。
    INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
    VALUES (o.id, to_jsonb(o), 'pre_freeze', auth.uid());

    SELECT s.snapshot INTO snap FROM public.organization_snapshots s
      WHERE s.organization_id = p_org AND s.reason = 'pre_claim'
      ORDER BY s.created_at DESC LIMIT 1;
    PERFORM public.restore_organization_columns(p_org, snap);

    UPDATE public.organizations SET claim_status='frozen' WHERE id = p_org;

    -- 昇格では新しい申立て行を作れない（uniq_org_disputes_open）。だからといって
    -- 今回の通報内容を捨てると、運営の手元に残る連絡先は既存の申立て（＝自作自演側の
    -- 可能性がある）のものだけになり、画面は「運営が確認のうえ、ご連絡します」と
    -- 表示するのに正当な通報者には連絡できない。032 冒頭の「通報の記録は必ず残す」に反する。
    -- そこで既存 open 申立ての body に、後続の通報を区切り付きで追記する。
    --   （既存のbody）
    --   〈空行〉
    --   --- 追加の申立て 2026-08-09T12:34:56Z ---
    --   氏名: ○○
    --   連絡先: ○○
    --   本文: ○○
    -- froze_at は必ず froze_organization と同時に打つ（片方だけ立てるとカウンタが狂う）。
    UPDATE public.organization_disputes SET
      froze_organization = true,
      froze_at = now(),
      body = body
        || E'\n\n--- 追加の申立て '
        || to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        || E' ---\n氏名: ' || p_name
        || E'\n連絡先: ' || p_contact
        || E'\n本文: ' || p_body
      WHERE id = existing.id;

    RETURN jsonb_build_object(
      'ok', true, 'frozen', true, 'escalated', true,
      'owner_email', owner_email, 'owner_name', owner_name, 'organization_name', o.name
    );
  END IF;

  IF will_freeze THEN
    -- 却下されたときに戻せるよう、現在の状態も残す
    INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
    VALUES (o.id, to_jsonb(o), 'pre_freeze', auth.uid());

    -- claim 前の掲載内容に戻す
    SELECT s.snapshot INTO snap FROM public.organization_snapshots s
      WHERE s.organization_id = p_org AND s.reason = 'pre_claim'
      ORDER BY s.created_at DESC LIMIT 1;
    PERFORM public.restore_organization_columns(p_org, snap);

    UPDATE public.organizations SET claim_status='frozen' WHERE id = p_org;
  END IF;

  -- froze_at は凍結したときだけ打つ（凍結しなかった申立ては NULL のまま）。
  -- froze_organization と必ず対で書く。片方だけ立てるとカウンタが実態とずれる。
  INSERT INTO public.organization_disputes
    (organization_id, claim_id, reporter_name, reporter_contact, reporter_user_id, body,
     froze_organization, froze_at)
  VALUES (p_org, active_claim, p_name, p_contact, auth.uid(), p_body,
          will_freeze, CASE WHEN will_freeze THEN now() END);

  -- 既存の呼び出し側は {"ok":true} を成功として扱うため、そこは変えない。
  -- frozen は追加のキーで、凍結できたかどうかをUIに伝える。
  -- owner_email/owner_name/organization_name は 045 で追加。will_freeze=false の
  -- ときは owner_email も NULL のまま返る（呼び出し側はこれを見て通知をスキップする）。
  RETURN jsonb_build_object(
    'ok', true, 'frozen', will_freeze,
    'owner_email', owner_email, 'owner_name', owner_name, 'organization_name', o.name
  );
EXCEPTION
  WHEN unique_violation THEN
    -- uniq_org_disputes_open に当たった＝同時送信が上の SELECT ... FOR UPDATE を
    -- すり抜けて既に対応中の申立てができた
    RETURN jsonb_build_object('ok', false, 'error', 'already_open');
END;
$$;

-- 関数のシグネチャは変わらないため、029/032で設定した GRANT
-- （submit_dispute: anon, authenticated）はそのまま引き継がれる。再設定は不要。

-- ============================================
-- 032 異議申立ての自動凍結にレート制限をかける
--
-- 背景：submit_dispute は anon にも EXECUTE を許可している（未ログインでも
-- 乗っ取りを申告できるようにするため）。ところが歯止めが「連絡先必須」
-- 「同一団体に open な申立ては1件まで」「運営通知」の3つしかなく、
-- 未認証の訪問者が1団体ずつリクエストを送れば claimed 団体を全件凍結でき、
-- 正当なオーナーを締め出せてしまう。
--
-- 方針：通報の記録は必ず残す（通報を失わない）が、自動凍結だけを絞る。
-- 直近1時間の自動凍結件数が閾値以上なら、凍結・巻き戻しは行わず
-- 申立てだけを open で記録する（運営が手動で判断する）。
-- ============================================

-- どの申立てが実際に凍結を発火させたかを記録する列。
-- これが無いと「直近1時間に自動凍結した件数」を数える方法が無い
-- （open件数を数えると、閾値到達後に記録だけされた申立ても誤って数えてしまう）。
ALTER TABLE public.organization_disputes
  ADD COLUMN IF NOT EXISTS froze_organization boolean NOT NULL DEFAULT false;

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
  SELECT count(*) INTO recent_freezes FROM public.organization_disputes
    WHERE froze_organization AND created_at > now() - interval '1 hour';

  will_freeze := recent_freezes < freeze_threshold;

  IF will_freeze THEN
    -- 却下されたときに戻せるよう、現在の状態も残す
    INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
    VALUES (o.id, to_jsonb(o), 'pre_freeze', auth.uid());

    -- claim 前の掲載内容に戻す
    SELECT s.snapshot INTO snap FROM public.organization_snapshots s
      WHERE s.organization_id = p_org AND s.reason = 'pre_claim'
      ORDER BY s.created_at DESC LIMIT 1;

    -- 団体が編集できる列はすべて戻す（OrganizationProfileForm の payload と同じ範囲）。
    -- 一部だけ戻すと、大学名・カテゴリ・選考フロー・会費などの改ざんが凍結後も残る。
    -- id / created_at / user_id / is_approved / is_verified / claim_status は復元しない
    -- （029 と同じ理由：識別子と系統管理の列であり、掲載内容ではないため）。
    IF snap IS NOT NULL THEN
      UPDATE public.organizations t SET
        name = r.name, university = r.university, category = r.category,
        description = r.description, x_id = r.x_id, instagram_id = r.instagram_id,
        line_url = r.line_url, website_url = r.website_url, logo_url = r.logo_url,
        member_count = r.member_count, activity_frequency = r.activity_frequency,
        is_intercollege = r.is_intercollege, target_grades = r.target_grades,
        selection_process = r.selection_process, selection_flow = r.selection_flow,
        gender_ratio = r.gender_ratio, grade_composition = r.grade_composition,
        location_detail = r.location_detail, fee_entry = r.fee_entry, fee_annual = r.fee_annual,
        planned_hire_count = r.planned_hire_count, step_target_rates = r.step_target_rates
      FROM jsonb_populate_record(null::public.organizations, snap) r
      WHERE t.id = p_org;
    END IF;

    UPDATE public.organizations SET claim_status='frozen' WHERE id = p_org;
  END IF;

  INSERT INTO public.organization_disputes
    (organization_id, claim_id, reporter_name, reporter_contact, reporter_user_id, body, froze_organization)
  VALUES (p_org, active_claim, p_name, p_contact, auth.uid(), p_body, will_freeze);

  -- 既存の呼び出し側は {"ok":true} を成功として扱うため、そこは変えない。
  -- frozen は追加のキーで、凍結できたかどうかをUIに伝える。
  RETURN jsonb_build_object('ok', true, 'frozen', will_freeze);
EXCEPTION
  WHEN unique_violation THEN
    -- uniq_org_disputes_open に当たった＝既に対応中の申立てがある
    RETURN jsonb_build_object('ok', false, 'error', 'already_open');
END;
$$;

-- 関数のシグネチャは変わらないため、029 で設定した GRANT（anon, authenticated）
-- はそのまま引き継がれる。再設定は不要。

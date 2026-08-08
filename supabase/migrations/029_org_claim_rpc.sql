-- ============================================
-- 029 claim 動線 RPC
-- organization_claims 等には SELECT ポリシーが無いため、
-- これらの SECURITY DEFINER 関数だけが唯一の出入口になる。
-- ============================================

-- --------------------------------------------
-- 0. admin 判定（既存の 021/023 と同じ profiles.role を使う）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- --------------------------------------------
-- 1. トークンのプレビュー
--    無効・期限切れ・取消を区別しない（総当たりに情報を与えない）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.get_claim_preview(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  org_name text;
  org_status text;
BEGIN
  SELECT * INTO c FROM public.organization_claims WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF c.revoked_at IS NOT NULL
     OR c.expires_at < now()
     OR c.status IN ('rejected','revoked','expired') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT o.name, o.claim_status INTO org_name, org_status
  FROM public.organizations o WHERE o.id = c.organization_id;

  IF org_status <> 'unclaimed' OR c.status = 'approved' THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'already_claimed',
      'organization_id', c.organization_id, 'organization_name', org_name
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'organization_id', c.organization_id,
    'organization_name', org_name,
    'already_applied', (c.status = 'applied')
  );
END;
$$;

-- --------------------------------------------
-- 2. 申請する（この時点ではオーナーにならない）
--    生の事実だけを集めて signals に固める。色と判定は TypeScript 側で行う。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_for_claim(
  p_token uuid, p_role text, p_note text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  o public.organizations%ROWTYPE;
  uemail text;
  shared text[];
  competing int;
  prof_complete boolean;
  age_days int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE token = p_token FOR UPDATE;
  IF NOT FOUND OR c.revoked_at IS NOT NULL OR c.expires_at < now()
     OR c.status NOT IN ('issued','applied') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  SELECT * INTO o FROM public.organizations WHERE id = c.organization_id;
  IF o.claim_status <> 'unclaimed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  -- 先行申請を痕跡なく上書きさせない。
  -- トークンを見た第二の人物が applicant_user_id / note / signals を差し替えると
  -- admin は最初の申請者が居たことを知る手段が無くなる。
  -- 同一ユーザーの書き直しは許可する（applicant_user_id が NULL＝退会済みも同様）。
  IF c.status = 'applied'
     AND c.applicant_user_id IS NOT NULL
     AND c.applicant_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_applied_by_other');
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = auth.uid();

  -- 同じハンドルを使う他団体の名前（channel_is_unique が false のときだけ意味がある）
  SELECT COALESCE(array_agg(x.name), ARRAY[]::text[]) INTO shared
  FROM public.organizations x
  WHERE x.is_approved = true
    AND x.id <> o.id
    AND lower(trim(replace(
      CASE c.channel
        WHEN 'x' THEN x.x_id WHEN 'instagram' THEN x.instagram_id
        WHEN 'website' THEN x.website_url ELSE x.line_url END, '@',''))) =
        lower(trim(replace(c.channel_handle, '@','')));

  SELECT count(*) INTO competing
  FROM public.organization_claims oc
  WHERE oc.organization_id = o.id AND oc.id <> c.id
    AND oc.status IN ('applied','approved');

  SELECT (p.full_name IS NOT NULL AND p.university IS NOT NULL) INTO prof_complete
  FROM public.profiles p WHERE p.id = auth.uid();

  SELECT GREATEST(0, EXTRACT(DAY FROM (now() - u.created_at))::int) INTO age_days
  FROM auth.users u WHERE u.id = auth.uid();

  UPDATE public.organization_claims SET
    status = 'applied',
    applicant_user_id = auth.uid(),
    applicant_role = p_role,
    applicant_note = p_note,
    applied_at = now(),
    signals = jsonb_build_object(
      'channel', c.channel,
      'channel_is_unique', c.channel_is_unique,
      'shared_with', to_jsonb(shared),
      'applicant_email', uemail,
      'org_university', o.university,
      'is_intercollege', COALESCE(o.is_intercollege, false),
      'competing_claims', competing,
      'name_is_placeholder', (o.name IS NULL OR btrim(o.name) IN ('', '団体名')),
      'applicant_profile_complete', COALESCE(prof_complete, false),
      'applicant_account_age_days', COALESCE(age_days, 0)
    )
  WHERE id = c.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- --------------------------------------------
-- 3. 判定する（admin のみ）
--    承認時に pre_claim スナップショットを取り、owner 行を入れる
-- --------------------------------------------
-- 旧シグネチャ（p_signals jsonb）が残っていると GRANT/REVOKE の対象がずれるので落とす。
-- signals は apply_for_claim が集めた事実であり、admin が上書きできてはいけない。
DROP FUNCTION IF EXISTS public.decide_claim(uuid, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.decide_claim(
  p_claim_id uuid, p_decision text, p_level text, p_note text, p_verdict text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  org_status text;
  can_members boolean;
  can_apps boolean;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_decision NOT IN ('approve','reject') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_decision');
  END IF;
  -- 判定色は admin が明示する。granted_level から機械的に導出すると
  -- 「シグナルは green だが権限は limited に絞った」を red と記録してしまう。
  IF p_verdict NOT IN ('green','red') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_verdict');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND OR c.status <> 'applied' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF p_decision = 'reject' THEN
    UPDATE public.organization_claims
      SET status='rejected', decided_by=auth.uid(), decided_at=now(),
          decision_note=p_note, signal_verdict=p_verdict
      WHERE id = c.id;
    RETURN jsonb_build_object('ok', true, 'decision', 'rejected');
  END IF;

  IF p_level NOT IN ('full','limited') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_level');
  END IF;

  -- claim の status だけでは足りない。団体側の現在状態も見る。
  --   ・既に別 claim が承認済み → uniq_org_claims_approved に当たって 500 になる
  --   ・frozen（申立て対応中） → claimed に上書きすると未処理の申立てを残して凍結が解ける
  SELECT o.claim_status INTO org_status
  FROM public.organizations o WHERE o.id = c.organization_id FOR UPDATE;
  IF org_status IS DISTINCT FROM 'unclaimed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  -- 巻き戻しの起点。攻撃者が触っていないと分かっている最後の状態
  INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
  SELECT o.id, to_jsonb(o), 'pre_claim', auth.uid()
  FROM public.organizations o WHERE o.id = c.organization_id;

  can_members := (p_level = 'full');
  can_apps := (p_level = 'full');

  -- 申請者が既にその団体のメンバー（member 等）だった場合、DO NOTHING だと
  -- owner ロールも権限フラグも付かないまま claim が approved になる無言の部分成功が起きる。
  INSERT INTO public.organization_members (
    organization_id, user_id, role,
    can_edit_profile, can_manage_posts, can_manage_finance,
    can_manage_members, can_manage_applications
  ) VALUES (
    c.organization_id, c.applicant_user_id, 'owner',
    true, true, true,
    can_members, can_apps
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'owner',
    can_edit_profile = true,
    can_manage_posts = true,
    can_manage_finance = true,
    can_manage_members = can_members,
    can_manage_applications = can_apps;

  UPDATE public.organizations SET claim_status='claimed' WHERE id = c.organization_id;

  UPDATE public.organization_claims
    SET status='approved', granted_level=p_level, decided_by=auth.uid(),
        decided_at=now(), decision_note=p_note,
        signal_verdict=p_verdict
    WHERE id = c.id;

  RETURN jsonb_build_object('ok', true, 'decision', 'approved', 'level', p_level);
EXCEPTION
  WHEN unique_violation THEN
    -- uniq_org_claims_approved の競合。500 を admin に漏らさない
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
END;
$$;

-- --------------------------------------------
-- 4. 運営による剥奪（申立てが無くても使える）
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_claim(p_claim_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.organization_claims%ROWTYPE;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF c.status = 'approved' AND c.applicant_user_id IS NOT NULL THEN
    DELETE FROM public.organization_members
      WHERE organization_id = c.organization_id AND user_id = c.applicant_user_id;
    -- frozen（申立て対応中）の団体の凍結を、この関数が単独で解いてはいけない。
    -- 未処理の申立てを残したまま書き込みが再開されてしまう。
    -- 凍結解除の判断は resolve_dispute が持ち、認容パスは自分で unclaimed を書く。
    UPDATE public.organizations SET claim_status='unclaimed'
      WHERE id = c.organization_id AND claim_status = 'claimed';
  END IF;

  UPDATE public.organization_claims
    SET status='revoked', revoked_at=now(), decision_note=p_reason,
        decided_by=auth.uid(), decided_at=now()
    WHERE id = c.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- --------------------------------------------
-- 5. 異議申立て（誰でも）。凍結一式を1トランザクションで行う
--    途中で落ちると中途半端に凍った団体が残るため
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_dispute(
  p_org uuid, p_name text, p_contact text, p_body text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.organizations%ROWTYPE;
  snap jsonb;
  active_claim uuid;
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

  -- 却下されたときに戻せるよう、現在の状態も残す
  INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
  VALUES (o.id, to_jsonb(o), 'pre_freeze', auth.uid());

  -- claim 前の掲載内容に戻す
  SELECT s.snapshot INTO snap FROM public.organization_snapshots s
    WHERE s.organization_id = p_org AND s.reason = 'pre_claim'
    ORDER BY s.created_at DESC LIMIT 1;

  -- 団体が編集できる列はすべて戻す（OrganizationProfileForm の payload と同じ範囲）。
  -- 一部だけ戻すと、大学名・カテゴリ・選考フロー・会費などの改ざんが凍結後も残る。
  -- snapshot は to_jsonb(o) の行全体なので jsonb_populate_record で型ごと復元できる
  -- （手書きのキャストは不要）。
  -- id / created_at / user_id / is_approved / claim_status は復元しない：
  -- 識別子と系統管理の列であり、掲載内容ではないため。claim_status を戻すと
  -- 直後の frozen 書き込みと矛盾し、is_approved を戻すと掲載審査の結果が巻き戻る。
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

  INSERT INTO public.organization_disputes
    (organization_id, claim_id, reporter_name, reporter_contact, reporter_user_id, body)
  VALUES (p_org, active_claim, p_name, p_contact, auth.uid(), p_body);

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN unique_violation THEN
    -- uniq_org_disputes_open に当たった＝既に対応中の申立てがある
    RETURN jsonb_build_object('ok', false, 'error', 'already_open');
END;
$$;

-- --------------------------------------------
-- 6. 申立ての処理（admin のみ）
--    認容＝オーナー剥奪 / 却下＝pre_freeze へ復帰
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_dispute_id uuid, p_resolution text, p_note text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d public.organization_disputes%ROWTYPE;
  snap jsonb;
  target_claim uuid;
  rv jsonb;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_resolution NOT IN ('uphold','dismiss') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_resolution');
  END IF;

  SELECT * INTO d FROM public.organization_disputes WHERE id = p_dispute_id FOR UPDATE;
  IF NOT FOUND OR d.status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid');
  END IF;

  IF p_resolution = 'uphold' THEN
    -- 乗っ取りだった。オーナーを剥奪し、掲載は pre_claim のままにする。
    -- claim_id は FK が ON DELETE SET NULL なので NULL になり得る。それを理由に
    -- 剥奪を飛ばすと organization_members の owner 行が残り、凍結解除と同時に
    -- 乗っ取り犯の書き込み権が復活する。まず団体を軸に承認済み claim を引く。
    SELECT oc.id INTO target_claim FROM public.organization_claims oc
      WHERE oc.organization_id = d.organization_id AND oc.status = 'approved' LIMIT 1;
    IF target_claim IS NULL THEN
      target_claim := d.claim_id;
    END IF;

    IF target_claim IS NOT NULL THEN
      -- 戻り値を捨てると、剥奪に失敗しても申立てが upheld になる
      rv := public.revoke_claim(target_claim, COALESCE(p_note, '異議申立てにより剥奪'));
      IF NOT COALESCE((rv->>'ok')::boolean, false) THEN
        RETURN jsonb_build_object('ok', false, 'error', 'revoke_failed');
      END IF;
    END IF;

    UPDATE public.organizations SET claim_status='unclaimed' WHERE id = d.organization_id;
    UPDATE public.organization_disputes
      SET status='upheld', resolved_by=auth.uid(), resolved_at=now(), resolution_note=p_note
      WHERE id = d.id;
    RETURN jsonb_build_object('ok', true, 'resolution', 'upheld');
  END IF;

  -- 申立ては退けられた。凍結前の状態に戻す
  SELECT s.snapshot INTO snap FROM public.organization_snapshots s
    WHERE s.organization_id = d.organization_id AND s.reason = 'pre_freeze'
    ORDER BY s.created_at DESC LIMIT 1;

  -- submit_dispute と同じ範囲・同じ理由で全列を戻す。
  -- id / created_at / user_id / is_approved / claim_status は識別子と系統管理の列なので
  -- 復元しない（claim_status は直後に claimed を書く）。
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
    WHERE t.id = d.organization_id;
  END IF;

  UPDATE public.organizations SET claim_status='claimed' WHERE id = d.organization_id;
  UPDATE public.organization_disputes
    SET status='dismissed', resolved_by=auth.uid(), resolved_at=now(), resolution_note=p_note
    WHERE id = d.id;

  RETURN jsonb_build_object('ok', true, 'resolution', 'dismissed');
END;
$$;

-- --------------------------------------------
-- 7. 実行権限（026 と同じ作法）
-- --------------------------------------------
REVOKE ALL ON FUNCTION public.is_system_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_claim_preview(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_for_claim(uuid,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_claim(uuid,text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_claim(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_dispute(uuid,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_dispute(uuid,text,text) FROM PUBLIC;

-- プレビューと申立ては未ログインでも使う
GRANT EXECUTE ON FUNCTION public.get_claim_preview(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_dispute(uuid,text,text,text) TO anon, authenticated;
-- 残りはログイン必須（admin 判定は関数の中で行う）
GRANT EXECUTE ON FUNCTION public.is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_for_claim(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_claim(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_claim(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid,text,text) TO authenticated;

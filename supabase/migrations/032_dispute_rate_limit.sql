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
--
-- ⚠ この「凍結しない申立て（froze_organization = false）」は、029 の
--   resolve_dispute が置いていた前提（submit_dispute は必ず凍結し、必ず
--   pre_freeze スナップショットを取っている）を壊す。そのため本ファイルの
--   末尾で resolve_dispute も差し替える。029 は本番適用済みのため編集しない。
-- ============================================

-- どの申立てが実際に凍結を発火させたかを記録する列。
-- これが無いと「直近1時間に自動凍結した件数」を数える方法が無い
-- （open件数を数えると、閾値到達後に記録だけされた申立ても誤って数えてしまう）。
ALTER TABLE public.organization_disputes
  ADD COLUMN IF NOT EXISTS froze_organization boolean NOT NULL DEFAULT false;

-- レート制限の判定は submit_dispute のたびに走る。件数は小さいはずだが、
-- 「直近1時間の凍結」を数えるだけのために全行を走査させない（安い保険）。
CREATE INDEX IF NOT EXISTS idx_org_disputes_recent_freezes
  ON public.organization_disputes (created_at)
  WHERE froze_organization;

-- --------------------------------------------
-- 0. 掲載内容の復元を1箇所にまとめる
--
--    巻き戻しは submit_dispute（凍結時）・resolve_dispute（認容／却下）の
--    3箇所で必要になる。同じ22列の列挙をコピーし続けると、片方だけ列が
--    増減したときに「一部だけ戻る」という最悪の壊れ方をする。
--    列の集合はここ1箇所にだけ書く。
--
--    復元する列 = 団体が自分で編集できる列（029 §8 の GRANT UPDATE と同じ集合）。
--    id / created_at / user_id / is_approved / is_verified / claim_status は
--    識別子と系統管理の列であり掲載内容ではないため復元しない。
--    snapshot は to_jsonb(o) の行全体なので jsonb_populate_record で型ごと
--    復元できる（手書きのキャストは不要）。
--
--    p_snapshot が NULL のときは何もしない（スナップショットが無い＝戻す先が無い）。
--
--    ⚠ SECURITY INVOKER である理由（SECURITY DEFINER にしてはいけない）：
--      この関数は内部に認可チェックを一切持たず、渡された jsonb で団体の掲載
--      22列をそのまま上書きする。SECURITY DEFINER にすると、呼べた者は誰でも
--      任意の団体の掲載内容を書き換えられる。
--      呼び出し元は submit_dispute / resolve_dispute だけで、どちらも
--      SECURITY DEFINER。SECURITY INVOKER の関数を SECURITY DEFINER の関数から
--      呼ぶと、その時点の実効ユーザー（＝定義者）で実行されるため、内部からの
--      呼び出しは従来どおり通る。一方 anon が直接呼ぶと anon の権限で走り、
--      organizations への UPDATE 権限も RLS も通らないので安全に失敗する。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_organization_columns(
  p_org uuid, p_snapshot jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF p_snapshot IS NULL THEN
    RETURN;
  END IF;

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
  FROM jsonb_populate_record(null::public.organizations, p_snapshot) r
  WHERE t.id = p_org;
END;
$$;

-- 内部ヘルパー。呼び出し側（SECURITY DEFINER の RPC）は owner 権限で走るため
-- anon / authenticated に EXECUTE を与える必要はない。与えると団体の掲載内容を
-- 任意の jsonb で上書きできる穴になる。
--
-- ⚠ 権限剥奪を2段構えにしている理由：
--   (1) Supabase では REVOKE ... FROM PUBLIC が効かない。public スキーマの
--       デフォルト権限（pg_default_acl）により、新規関数には疑似ロール PUBLIC
--       経由ではなく anon / authenticated / service_role へ「直接」EXECUTE が
--       付与される。FROM PUBLIC は PUBLIC への付与しか取り消さないので、
--       直接付与には届かず no-op になる（本番で実測済み）。
--       そこで anon, authenticated から明示的に REVOKE する。
--   (2) それでも将来デフォルト権限やロール構成が変われば、明示 REVOKE を
--       書き忘れた瞬間に同じ穴が開く。上の SECURITY INVOKER 化は、権限設定に
--       頼らず構造として守るための二重化。片方だけでは守り切れない。
REVOKE ALL ON FUNCTION public.restore_organization_columns(uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_organization_columns(uuid, jsonb) FROM anon, authenticated;

-- --------------------------------------------
-- 1. 申立ての受付（レート制限つき）
-- --------------------------------------------
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
    UPDATE public.organization_disputes SET froze_organization = true
      WHERE id = existing.id;

    RETURN jsonb_build_object('ok', true, 'frozen', true, 'escalated', true);
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

  INSERT INTO public.organization_disputes
    (organization_id, claim_id, reporter_name, reporter_contact, reporter_user_id, body, froze_organization)
  VALUES (p_org, active_claim, p_name, p_contact, auth.uid(), p_body, will_freeze);

  -- 既存の呼び出し側は {"ok":true} を成功として扱うため、そこは変えない。
  -- frozen は追加のキーで、凍結できたかどうかをUIに伝える。
  RETURN jsonb_build_object('ok', true, 'frozen', will_freeze);
EXCEPTION
  WHEN unique_violation THEN
    -- uniq_org_disputes_open に当たった＝同時送信が上の SELECT ... FOR UPDATE を
    -- すり抜けて既に対応中の申立てができた
    RETURN jsonb_build_object('ok', false, 'error', 'already_open');
END;
$$;

-- --------------------------------------------
-- 2. 申立ての処理（admin のみ）※ 029 の resolve_dispute を差し替える
--
--    029 は「submit_dispute は必ず凍結し、必ず pre_freeze スナップショットを
--    取っている」ことを暗黙の前提にしていた。上のレート制限で
--    froze_organization = false の申立てが生まれ、その前提が崩れた。
--
--      却下：029 は reason='pre_freeze' の最新1件を無条件に復元していた。
--            凍結していない申立てを却下すると、過去のサイクルの pre_freeze
--            （＝乗っ取り犯が書いた内容）が蘇り、正当な編集が黙って消える。
--      認容：029 は「掲載は pre_claim のままにする」としていたが、それは
--            submit_dispute が既に巻き戻していることが前提。凍結していない
--            場合は巻き戻っていないので、乗っ取り内容が公開され続ける。
--
--    froze_organization で分岐させる。あわせて却下時のスナップショット検索も
--    「その申立て以降に作られたもの」に限定して二重に守る。
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
  has_approved boolean;
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
    -- 乗っ取りだった。オーナーを剥奪し、掲載は claim 前の状態にする。
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

    -- 凍結した申立てなら submit_dispute が既に pre_claim へ巻き戻している。
    -- 凍結しなかった申立ては誰も巻き戻していないので、ここで巻き戻す。
    -- これをしないと「乗っ取りと認定したのに乗っ取り犯の掲載内容が
    -- 公開され続ける」ことになる。
    IF NOT d.froze_organization THEN
      SELECT s.snapshot INTO snap FROM public.organization_snapshots s
        WHERE s.organization_id = d.organization_id AND s.reason = 'pre_claim'
        ORDER BY s.created_at DESC LIMIT 1;
      PERFORM public.restore_organization_columns(d.organization_id, snap);
    END IF;

    UPDATE public.organizations SET claim_status='unclaimed' WHERE id = d.organization_id;
    UPDATE public.organization_disputes
      SET status='upheld', resolved_by=auth.uid(), resolved_at=now(), resolution_note=p_note
      WHERE id = d.id;
    RETURN jsonb_build_object('ok', true, 'resolution', 'upheld');
  END IF;

  -- 申立ては退けられた。
  -- 凍結した申立てだけを凍結前の状態に戻す。凍結しなかった申立ては
  -- そもそも掲載内容を変えていないので、一切触れない。無条件に最新の
  -- pre_freeze を復元すると、過去のサイクルのスナップショットが蘇って
  -- 正当な編集が消える。
  -- さらに「その申立て以降に作られた pre_freeze」に絞って二重に守る。
  IF d.froze_organization THEN
    SELECT s.snapshot INTO snap FROM public.organization_snapshots s
      WHERE s.organization_id = d.organization_id AND s.reason = 'pre_freeze'
        AND s.created_at >= d.created_at
      ORDER BY s.created_at DESC LIMIT 1;
    PERFORM public.restore_organization_columns(d.organization_id, snap);
  END IF;

  -- 却下でも無条件に claimed を書いてはいけない。申立てが open の間に admin が
  -- revoke_claim を単独実行していると、承認済み claim も owner 行も無い状態で
  -- 団体だけ claimed に戻り、以後 apply_for_claim / decide_claim が永久に
  -- already_claimed を返して編集できる者がゼロの詰み状態になる。
  -- 実際にオーナーが居るか（＝承認済み claim が実在するか）で戻す先を分ける。
  SELECT EXISTS (
    SELECT 1 FROM public.organization_claims oc
    WHERE oc.organization_id = d.organization_id AND oc.status = 'approved'
  ) INTO has_approved;

  UPDATE public.organizations
    SET claim_status = CASE WHEN has_approved THEN 'claimed' ELSE 'unclaimed' END
    WHERE id = d.organization_id;

  UPDATE public.organization_disputes
    SET status='dismissed', resolved_by=auth.uid(), resolved_at=now(), resolution_note=p_note
    WHERE id = d.id;

  RETURN jsonb_build_object(
    'ok', true, 'resolution', 'dismissed',
    'claim_status', CASE WHEN has_approved THEN 'claimed' ELSE 'unclaimed' END
  );
END;
$$;

-- 関数のシグネチャは変わらないため、029 で設定した GRANT
-- （submit_dispute: anon, authenticated ／ resolve_dispute: authenticated）
-- はそのまま引き継がれる。再設定は不要。

-- --------------------------------------------
-- 3. 適用済み関数の実行権限を、意図した権限モデルに合わせ直す
--
--    029 / 030 は「REVOKE ALL ... FROM PUBLIC してから必要なロールにだけ
--    GRANT する」という設計だった。しかし Supabase ではこの REVOKE が効かない。
--    public スキーマのデフォルト権限（pg_default_acl）により、新規関数には
--    PUBLIC 経由ではなく anon / authenticated / service_role へ「直接」
--    EXECUTE が付与されるためで、FROM PUBLIC は直接付与を取り消せない。
--    本番を実測したところ、claim 系の全関数が anon から実行可能だった。
--
--    現状は無害である。書き込みを行う関数はすべて内部で認可を確認している
--    （apply_for_claim は auth.uid()、decide_claim / revoke_claim /
--    resolve_dispute は is_system_admin()）。anon が呼んでも forbidden で返る。
--
--    それでも直す理由は、意図した権限モデルが成立していない状態を放置すると、
--    次に内部チェックを書き忘れた関数を足した瞬間そこが穴になるから。
--    実際 restore_organization_columns がまさにそれで、内部チェックが無いまま
--    anon から任意団体の掲載内容を書き換えられる状態になっていた。
--    「関数を足したら anon から呼べる」を既定にしない。
-- --------------------------------------------
REVOKE EXECUTE ON FUNCTION public.apply_for_claim(uuid,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decide_claim(uuid,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_claim(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid,text,text) FROM anon;

-- ⚠ ここから下は「あえて触らない」もの。取り消すと機能が壊れる。
--   get_claim_preview / submit_dispute … 未ログインの訪問者が使う導線そのもの
--     （招待リンクからの claim 確認・乗っ取りの申告）。anon の EXECUTE は必要。
--   is_system_admin / is_org_member / can_manage_org_finance … bool を返すだけで
--     副作用が無く、多数の RLS ポリシーが内部で呼んでいる。EXECUTE を落とすと
--     ポリシー評価が権限エラーになり、広範囲のアクセスが壊れる。

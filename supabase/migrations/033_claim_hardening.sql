-- ============================================
-- 033 claim動線の最終レビューで見つかった3件を塞ぐ
--
--    028〜032 は本番適用済みのため、修正は追加マイグレーションで行う。
--    3件とも「単体では正しい変更が、既存の仕組みとの相互作用で壊れていた」
--    という同じ形をしている。
-- ============================================


-- --------------------------------------------
-- 1. 【C3】030 が profiles の upsert を壊していたのを戻す
--
--    030 は profiles の UPDATE を列単位に絞る際、主キーの id を
--    「更新させない」意図で GRANT から外した。ところがアプリ側の3箇所
--    （app/signup/page.tsx:180 / :189、app/mypage/page.tsx:540 / :558）は
--    すべて upsert であり、payload に id を含む。PostgREST の upsert は
--    ON CONFLICT (id) DO UPDATE SET <payloadの全列> を生成するため、
--    SET の対象に id が入る。Postgres は SET 対象列の UPDATE 権限を
--    実際に競合したかに関わらず検査するので、全 upsert が落ちる。
--
--    本番で実測（BEGIN...ROLLBACK、authenticated ロール）：
--      SET に id を含む   → 42501 permission denied for table profiles
--      SET に id を含まない → 権限は通過し、RLS だけで落ちる
--    ＝ 権限層で落ちており、RLS 以前の問題であることを確認した。
--
--    id に UPDATE 権限を戻しても role の穴は開かない。profiles の UPDATE
--    ポリシー「Users can update own profile」は USING (auth.uid() = id) で
--    WITH CHECK が null＝USING が新しい行にも適用される。よって id を
--    他人の値に書き換えた行は WITH CHECK で落ちる。role は閉じたまま。
-- --------------------------------------------
GRANT UPDATE (id) ON public.profiles TO authenticated;


-- --------------------------------------------
-- 2. 【C1】「限定」承認が、DBレベルでは何も制限していなかった
--
--    decide_claim は p_level='limited' でも role='owner' を書き、
--    can_manage_members / can_manage_applications だけを false にしていた。
--    設計 §2.5 は「権限の粒度は can_manage_* フラグで表現できる」を前提に
--    していたが、本番の実際のポリシーはそうなっていない：
--
--      ・get_user_admin_organization_ids は role IN ('owner','admin') のみ
--      ・organization_members / organization_invitations の
--        INSERT / UPDATE / DELETE ポリシーはすべてこの関数か om.role='owner'
--      ・can_manage_members を参照する RLS ポリシーは本番に1本も無い
--        （can_manage_* を見るのは finance 系5本の can_manage_org_finance だけ）
--
--    つまり limited の唯一の防壁が clubsettings/members の画面表示だけで、
--    PostgREST を直接叩けば limited 承認者でもメンバー追加と招待発行ができた。
--    「赤信号が出た申請を limited なら安全として承認する」という運用の
--    前提そのものが成立していなかった。
--
--    修正方針：limited のときは role='member' を書く。
--
--    get_user_admin_organization_ids 側に can_manage_members を要求する案は
--    採らない。app/(club)/clubdashboard/OrganizationProfileForm.tsx:480 が
--    自作団体の owner 行を権限フラグ無し（can_manage_members は既定 false）で
--    作っているため、既存の自作団体オーナー全員がメンバー管理から締め出される。
--
--    role='member' でも掲載内容の編集はできる。organizations_update_by_members が
--    参照する get_user_organization_ids は role を問わないため。
--    会計も can_manage_org_finance が can_manage_finance フラグだけを見るので
--    従来どおり。失われるのはメンバー管理と招待発行＝limited が禁じたかったもの。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_claim(
  p_claim_id uuid, p_decision text, p_level text, p_note text, p_verdict text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  org_status text;
  can_members boolean;
  can_apps boolean;
  member_role text;
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

  -- applicant_user_id の FK は ON DELETE SET NULL。申請後に本人が退会すると NULL になる。
  -- そのまま承認に進むと organization_members.user_id（NOT NULL）への INSERT が
  -- not_null_violation で落ちる。下の EXCEPTION WHEN unique_violation では捕まらないので
  -- admin に 500 が返る。承認する相手が居ないことを明示的に返す。
  IF c.applicant_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'applicant_gone');
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
  -- ここが 033 の本体。role がメンバー管理・招待発行の唯一の鍵なので、
  -- limited では owner を渡さない。
  member_role := CASE WHEN p_level = 'full' THEN 'owner' ELSE 'member' END;

  -- 申請者が既にその団体のメンバー（member 等）だった場合、DO NOTHING だと
  -- ロールも権限フラグも付かないまま claim が approved になる無言の部分成功が起きる。
  INSERT INTO public.organization_members (
    organization_id, user_id, role,
    can_edit_profile, can_manage_posts, can_manage_finance,
    can_manage_members, can_manage_applications
  ) VALUES (
    c.organization_id, c.applicant_user_id, member_role,
    true, true, true,
    can_members, can_apps
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = member_role,
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
-- 3. 【C2】剥奪が申請者1行しか消さず、乗っ取りが剥奪後も生き残っていた
--
--    旧 revoke_claim は organization_members から申請者本人の行だけを消して
--    いた。claim 後に乗っ取り犯が追加した他のメンバー行と、発行済みの
--    organization_invitations は残る。
--
--    失敗の筋道：
--      乗っ取り犯Aが承認される → 共犯Bをメンバー追加、または招待を1本発行
--      → 正当な団体が異議申立て → 運営が認容 → 旧 revoke_claim はAだけ削除
--      → claim_status='unclaimed' になるので organizations_update_by_members の
--         claim_status <> 'frozen' 条件も外れ、Bは掲載内容を書き放題
--      → DisputeForm は claimed のときしか描画されず、submit_dispute も
--         claimed 以外を not_claimed で弾くので、もう誰も凍結を発火できない
--
--    凍結と復元は掲載内容を戻すだけで、アクセス権は戻していなかった。
--    設計の要件3「乗っ取りを検知し、巻き戻せる」が満たされていない。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_claim(p_claim_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  removed_members int := 0;
  removed_invites int := 0;
  removed_step int := 0;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF c.status = 'approved' AND c.applicant_user_id IS NOT NULL THEN
    -- (a) 申請者本人。claim 前から在籍していた場合も消す（旧実装と同じ）
    DELETE FROM public.organization_members
      WHERE organization_id = c.organization_id AND user_id = c.applicant_user_id;
    GET DIAGNOSTICS removed_members = ROW_COUNT;

    -- (b) この claim の権限で追加されたメンバー。承認時刻以降に作られた行が該当する。
    --     申請者は decided_at より前に団体の管理権を持てないので、この時刻で切れば
    --     claim 前から居た正当なメンバーは巻き込まない。
    IF c.decided_at IS NOT NULL THEN
      DELETE FROM public.organization_members
        WHERE organization_id = c.organization_id
          AND created_at >= c.decided_at;
      -- (a) の分と足す。上書きすると申請者本人が件数から抜け、運営には
      -- 実際より1少なく見える
      GET DIAGNOSTICS removed_step = ROW_COUNT;
      removed_members := removed_members + removed_step;
    END IF;

    -- (c) 未受諾の招待。accept_organization_invitation は受諾時に行を削除するので、
    --     残っている行はすべて未受諾＝再侵入の入口。剥奪後の団体はオーナー不在に
    --     なるため、未受諾の招待が残っていてよい理由が無い。時刻で絞らず全部消す。
    DELETE FROM public.organization_invitations
      WHERE organization_id = c.organization_id;
    GET DIAGNOSTICS removed_invites = ROW_COUNT;

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

  -- 件数を返す。運営が「誰が消えたのか」を後から確認できないと、
  -- 剥奪が実際に効いたのかを画面から判断できない。
  RETURN jsonb_build_object(
    'ok', true,
    'removed_members', removed_members,
    'removed_invitations', removed_invites
  );
END;
$$;


-- --------------------------------------------
-- 4. organization_members の重複した一意インデックスを1本落とす（既存の負債）
--
--    (organization_id, user_id) に対する UNIQUE インデックスが2本ある：
--      organization_members_organization_id_user_id_key … UNIQUE制約の裏付けあり
--      organization_members_org_user_uidx               … 制約の裏付け無し
--    ON CONFLICT (organization_id, user_id) の推論は制約側で成立するので、
--    裏付けの無い方を落とす。書き込みのたびに2本更新する分が無駄。
-- --------------------------------------------
DROP INDEX IF EXISTS public.organization_members_org_user_uidx;


-- --------------------------------------------
-- 5. 権限は 029 / 032 の設定を引き継ぐ。CREATE OR REPLACE は既存の
--    GRANT/REVOKE を変えないが、明示しておく（029 の REVOKE ... FROM PUBLIC は
--    Supabase では no-op なので、anon への明示 REVOKE が実効的な防壁）。
-- --------------------------------------------
REVOKE EXECUTE ON FUNCTION public.decide_claim(uuid,text,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_claim(uuid,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.decide_claim(uuid,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_claim(uuid,text) TO authenticated;

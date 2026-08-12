-- ============================================
-- 039 B19全体レビューで見つかった2件を塞ぐ
--
--    docs/superpowers/plans/2026-08-12-b19-claim-revocation.md の最終レビュー（opus）より。
--
--    1. resolve_dispute の却下分岐が、オーナー不在の団体に「凍結直前（乗っ取り後）の
--       内容」を無条件に復元し、詰み状態を作りうる。
--       2026-08-09最終レビュー item5で既に指摘されており、「revoke UIを付けるのと
--       同時に必ず直す」とされていたが、038（B19本体）では見送られていた。
--       B19はまさにこの経路を到達可能にする機能なので、同時に塞ぐ。
--
--       失敗の筋道：団体が claimed → 第三者の申立てで凍結（submit_dispute が
--       pre_claim へ戻し pre_freeze スナップショットを取る）→ 運営が
--       revoke_claim を直接呼ぶ（frozen なので掲載列には触れない。033/038の
--       設計どおり）→ その申立てが処理待ちのまま残る → 運営が却下（dismiss）
--       → 旧コードは無条件に pre_freeze（＝乗っ取り後の内容）を復元し、
--       has_approved はその後に判定していたので false（オーナー不在）→
--       claim_status='unclaimed' に。結果、乗っ取り後の内容が公開されたまま
--       オーナー不在になり、submit_dispute は claim_status='claimed' の団体しか
--       受け付けないため、以後誰も申立てを起こせない詰みになる。
--
--    2. revoke_claim が復元前の内容を保存せずに上書きしており、誤操作
--       （正当なオーナーへの取消ミスクリック等）が完全に不可逆だった。
-- ============================================


-- --------------------------------------------
-- 1. organization_snapshots.reason に 'pre_revoke' を追加する
-- --------------------------------------------
ALTER TABLE public.organization_snapshots DROP CONSTRAINT organization_snapshots_reason_check;
ALTER TABLE public.organization_snapshots ADD CONSTRAINT organization_snapshots_reason_check
  CHECK (reason IN ('pre_claim', 'pre_freeze', 'pre_revoke'));


-- --------------------------------------------
-- 2. revoke_claim：復元前に pre_revoke スナップショットを取る
--
--    書き換える内容を保存せず上書きしていたのを直す。DBに残しておけば、
--    誤操作時に手動SQLで復旧できる（UIでの「取消の取消」機能は今回のスコープ外）。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_claim(p_claim_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.organization_claims%ROWTYPE;
  removed_members int := 0;
  removed_invites int := 0;
  removed_step int := 0;
  org_status text;
  snap jsonb;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO c FROM public.organization_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF c.status = 'approved' AND c.applicant_user_id IS NOT NULL THEN
    -- (a) 申請者本人。claim 前から在籍していた場合も消す（033と同じ）
    DELETE FROM public.organization_members
      WHERE organization_id = c.organization_id AND user_id = c.applicant_user_id;
    GET DIAGNOSTICS removed_members = ROW_COUNT;

    -- (b) この claim の権限で追加されたメンバー（033と同じ）
    IF c.decided_at IS NOT NULL THEN
      DELETE FROM public.organization_members
        WHERE organization_id = c.organization_id
          AND created_at >= c.decided_at;
      GET DIAGNOSTICS removed_step = ROW_COUNT;
      removed_members := removed_members + removed_step;
    END IF;

    -- (c) 未受諾の招待（033と同じ）
    DELETE FROM public.organization_invitations
      WHERE organization_id = c.organization_id;
    GET DIAGNOSTICS removed_invites = ROW_COUNT;

    -- (d) 掲載内容の復元（038で統合）。org_status='claimed' のときだけ戻す。
    SELECT o.claim_status INTO org_status
      FROM public.organizations o WHERE o.id = c.organization_id FOR UPDATE;

    IF org_status = 'claimed' THEN
      -- 039で追加：上書きする直前の内容を保存する。誤操作の手動復旧用。
      INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
      SELECT o.id, to_jsonb(o), 'pre_revoke', auth.uid()
      FROM public.organizations o WHERE o.id = c.organization_id;

      SELECT s.snapshot INTO snap FROM public.organization_snapshots s
        WHERE s.organization_id = c.organization_id AND s.reason = 'pre_claim'
        ORDER BY s.created_at DESC LIMIT 1;
      PERFORM public.restore_organization_columns(c.organization_id, snap);

      UPDATE public.organizations SET claim_status='unclaimed'
        WHERE id = c.organization_id;
    END IF;
    -- org_status = 'frozen' のときは何もしない。凍結解除の判断は resolve_dispute が持つ。
  END IF;

  UPDATE public.organization_claims
    SET status='revoked', revoked_at=now(), decision_note=p_reason,
        decided_by=auth.uid(), decided_at=now()
    WHERE id = c.id;

  RETURN jsonb_build_object(
    'ok', true,
    'removed_members', removed_members,
    'removed_invitations', removed_invites
  );
END;
$$;


-- --------------------------------------------
-- 3. resolve_dispute：却下時にオーナー不在なら pre_freeze ではなく pre_claim を戻す
--
--    has_approved（＝この団体に承認済みclaimが今も在るか＝オーナーが実在するか）の
--    判定を、復元より前に確定する。
--      ・オーナーが実在する（別のclaimが今も承認済み）→ 従来どおり pre_freeze
--        （凍結直前の内容）へ戻す。
--      ・オーナーが実在しない（このclaimは既に取り消し済み等）→ pre_freeze
--        （乗っ取り後の可能性がある内容）ではなく、pre_claim（claim前の
--        安全な内容）へ戻す。無条件に pre_freeze を復元すると、乗っ取り後の
--        内容がオーナー不在のまま公開され続け、submit_dispute が
--        claim_status='claimed' の団体しか受け付けないため誰も申立てを
--        起こせない詰みになる。
--
--    froze_organization=false（未凍結）の分岐は変更なし（掲載内容に一切触れない）。
--    uphold分岐は038から変更なし。
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
    -- 乗っ取りだった。オーナーを剥奪し、掲載は claim 前の状態にする（復元は
    -- revoke_claim が038で統合済み）。
    SELECT oc.id INTO target_claim FROM public.organization_claims oc
      WHERE oc.organization_id = d.organization_id AND oc.status = 'approved' LIMIT 1;
    IF target_claim IS NULL THEN
      target_claim := d.claim_id;
    END IF;

    IF target_claim IS NOT NULL THEN
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

  -- 申立ては退けられた。
  -- 039で変更：オーナーが実在するかを復元より前に確定する。
  SELECT EXISTS (
    SELECT 1 FROM public.organization_claims oc
    WHERE oc.organization_id = d.organization_id AND oc.status = 'approved'
  ) INTO has_approved;

  IF d.froze_organization THEN
    IF has_approved THEN
      SELECT s.snapshot INTO snap FROM public.organization_snapshots s
        WHERE s.organization_id = d.organization_id AND s.reason = 'pre_freeze'
          AND s.created_at >= d.created_at
        ORDER BY s.created_at DESC LIMIT 1;
      PERFORM public.restore_organization_columns(d.organization_id, snap);
    ELSE
      SELECT s.snapshot INTO snap FROM public.organization_snapshots s
        WHERE s.organization_id = d.organization_id AND s.reason = 'pre_claim'
        ORDER BY s.created_at DESC LIMIT 1;
      PERFORM public.restore_organization_columns(d.organization_id, snap);
    END IF;
  END IF;

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

-- 関数のシグネチャは変わらないため、GRANTはそのまま引き継がれる。

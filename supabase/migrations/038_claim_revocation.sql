-- ============================================
-- 038 B19：運営が単独でclaimを剥奪できるUI
--
--    設計 docs/superpowers/specs/2026-08-12-b19-claim-revocation-design.md
--
--    revoke_claim（033）は organization_members / organization_invitations の掃除しか
--    しておらず、organizations の掲載列を戻す処理を持っていなかった。「掲載内容を戻す」
--    ロジックは resolve_dispute（032）のuphold分岐にだけ存在し、froze_organizationが
--    偽のときだけ手動で restore_organization_columns を呼んでいた。
--    revoke_claim を直接呼ぶ経路（B19で追加する /admin/claims の「発行の取消」）を
--    作ると、メンバー・招待は消えるが乗っ取り犯が書き換えた掲載内容は公開され続ける。
--
--    revoke_claim 自体に復元処理を統合し、resolve_dispute 側の重複コードを削除する。
--    あわせて、承認済みclaim（＝「発行の取消」の対象）を一覧するRPCを追加する
--    （list_pending_claims は status='applied' のみを返し、承認済みを一覧する経路が
--    今は無い）。
-- ============================================


-- --------------------------------------------
-- 1. revoke_claim に掲載内容の復元を統合する
--
--    org_status を FOR UPDATE で読み、'claimed' のときだけ pre_claim スナップショットで
--    復元してから unclaimed に書き換える（decide_claim と同じロック順序：
--    organization_claims 行 → organizations 行）。
--    'frozen' のときは何もしない。submit_dispute が凍結時に既に pre_claim まで戻し
--    切っている前提を維持し、凍結解除の判断は引き続き resolve_dispute が持つ。
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

    -- (d) 038で追加：掲載内容の復元。org_status を読んだ時点で 'claimed' のときだけ
    --     戻す。resolve_dispute のuphold分岐（凍結していない申立て）が revoke_claim を
    --     呼ぶときも、この時点では organizations.claim_status はまだ 'claimed' のままなので
    --     （submit_dispute が凍結していない限り）、ここで自動的に復元される。
    --     resolve_dispute 側の手動 restore_organization_columns 呼び出しは本マイグレーション
    --     の2番で削除する（重複コードを1箇所に統合する）。
    SELECT o.claim_status INTO org_status
      FROM public.organizations o WHERE o.id = c.organization_id FOR UPDATE;

    IF org_status = 'claimed' THEN
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
-- 2. resolve_dispute から、1で revoke_claim に統合した重複コードを削除する
--
--    uphold分岐は revoke_claim を呼んだ「あと」に、froze_organization が偽のときだけ
--    手動で restore_organization_columns を呼んでいた。1の変更により revoke_claim が
--    同じ条件（org_status='claimed'）で自動的に復元するため、この手動呼び出しを
--    残すと同じ復元が2回走るだけの無駄になる（実害は無いが意図が不明瞭になる）。
--    削除して revoke_claim 側に一本化する。
--
--    それ以外のロジック（却下分岐・has_approved 判定など）は032から変更しない。
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
    -- revoke_claim が038で統合済み。ここでは手動の restore_organization_columns
    -- 呼び出しをしない）。
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

  -- 申立ては退けられた。（却下分岐は032から変更なし）
  IF d.froze_organization THEN
    SELECT s.snapshot INTO snap FROM public.organization_snapshots s
      WHERE s.organization_id = d.organization_id AND s.reason = 'pre_freeze'
        AND s.created_at >= d.created_at
      ORDER BY s.created_at DESC LIMIT 1;
    PERFORM public.restore_organization_columns(d.organization_id, snap);
  END IF;

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

-- 関数のシグネチャは変わらないため、029/032で設定したGRANTはそのまま引き継がれる。


-- --------------------------------------------
-- 3. 承認済みclaimを一覧するRPC（「発行の取消」の対象）
--
--    list_pending_claims（031）は status='applied' のみを返す。承認済み（approved）
--    claimを一覧する経路が今は存在しない。organization_claims.status='approved' を
--    organizations・profiles（申請者名・連絡先）とJOINして返す。
--
--    organization_claim_status も返す。フロント側で 'frozen' の行を検知して
--    「発行の取消」ボタンを無効化し、/admin/disputes への案内を出すために使う
--    （凍結中の団体は異議申立てフローが既に進行中で、二重に操作すると
--    状態が読みにくくなるため）。
--
--    applicant_name は clubsettings/members 画面と同じフォールバック順
--    （full_name → display_name）。applicant_email は運営が連絡を取るための
--    項目なので、/admin/requests と同じ contact_email 優先（無ければ email）にする
--    （clubsettings/members は email のみを見ており、contact_email は選択していない）。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.list_approved_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, organization_university text,
  organization_claim_status text,
  applicant_user_id uuid, applicant_name text, applicant_email text,
  granted_level text, decided_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university,
         o.claim_status,
         c.applicant_user_id,
         COALESCE(NULLIF(TRIM(p.full_name), ''), NULLIF(TRIM(p.display_name), '')),
         COALESCE(NULLIF(TRIM(p.contact_email), ''), NULLIF(TRIM(p.email), '')),
         c.granted_level, c.decided_at
  FROM public.organization_claims c
  JOIN public.organizations o ON o.id = c.organization_id
  LEFT JOIN public.profiles p ON p.id = c.applicant_user_id
  WHERE public.is_system_admin() AND c.status = 'approved'
  ORDER BY c.decided_at DESC;
$$;

-- list_pending_claims（031）と同じ権限モデル。Supabaseでは REVOKE ALL ... FROM PUBLIC が
-- 効かない（pg_default_aclでanon/authenticatedへ直接EXECUTEが付くため）。anonから明示REVOKE。
REVOKE ALL ON FUNCTION public.list_approved_claims() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_approved_claims() FROM anon;
GRANT EXECUTE ON FUNCTION public.list_approved_claims() TO authenticated;

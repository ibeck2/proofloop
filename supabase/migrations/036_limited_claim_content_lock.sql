-- ============================================
-- 036 限定承認のオーナーが、学生向けに出す情報（掲載内容・お知らせ投稿）を
--     書き換えられないようにする
--
--    背景：
--      lib/claims/permissions.ts は「profile / posts / finance は団体自身が
--      claim 後に入れるデータなので開ける」という判断で、限定承認でも
--      can_edit_profile / can_manage_posts を true にしていた。
--
--      ところが本番実測（2026-08-12・035のレビュー後）で、この2つのフラグを
--      参照している RLS ポリシーが1本も無いことが判明した
--      （`can_edit_profile` 0件・`can_manage_posts` 0件）。
--      実際に許可を出しているのは organizations_update_by_members と
--      organization_posts の各ポリシーで、いずれも get_user_organization_ids
--      （そのメンバーかどうかだけを見る・role もフラグも見ない）だった。
--
--      つまり「限定承認は掲載編集・投稿を開ける」という設計判断そのものより
--      前の段階で、そもそも any member が無条件に書き換えられる状態だった
--      （033のC1・035の応募RLSと同じ形の穴）。
--
--    オーナー判断（2026-08-12）：
--      低信頼度（限定承認）のアカウントに、学生向けに出る情報の書き換えを
--      許すのはリスクが高いため避ける。tasks（内部管理）・finance（内部の
--      会計）は学生向けではないので対象外。この2つは permissions.ts の
--      判断（finance を止めるとKPIを塞ぐ）どおり従来のまま開けておく。
-- ============================================


-- --------------------------------------------
-- 1. 判定関数
--
--    035 の can_view_org_applications と同型。auth.uid() は関数内部で見る。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.can_edit_org_profile(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND (m.role IN ('owner', 'admin') OR coalesce(m.can_edit_profile, false))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_posts(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND (m.role IN ('owner', 'admin') OR coalesce(m.can_manage_posts, false))
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_edit_org_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_org_posts(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_edit_org_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_org_posts(uuid) TO authenticated;


-- --------------------------------------------
-- 2. organizations（掲載内容の編集）
--
--    自作団体のオーナーは role='owner' で通るので既存アクセスは維持される
--    （フラグ無しでも role で通る。033・035と同じ理屈）。
--    claim_status <> 'frozen' の条件は維持する（凍結中は誰も書けない）。
-- --------------------------------------------
DROP POLICY IF EXISTS "organizations_update_by_members" ON public.organizations;
CREATE POLICY "organizations_update_by_members"
  ON public.organizations FOR UPDATE TO public
  USING (public.can_edit_org_profile(id) AND claim_status <> 'frozen')
  WITH CHECK (public.can_edit_org_profile(id) AND claim_status <> 'frozen');


-- --------------------------------------------
-- 3. organization_posts（お知らせ投稿）
--
--    "Admins can manage their org posts"（FOR ALL）は、本番実測で
--    organization_posts_{select,insert,update,delete}_members と条件が
--    完全に同一（get_user_organization_ids と同じメンバー起点）と確認済みで、
--    削除しても閲覧・書き込みのどちらも失われない。まずこの冗長分を消す。
--
--    閲覧（SELECT）は制限しない。「学生向けに出せる情報を書き換えられない
--    ようにする」が目的で、限定オーナーが自団体の投稿を見ること自体は
--    リスクではない。書き込み系（INSERT/UPDATE/DELETE）だけを絞る。
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins can manage their org posts" ON public.organization_posts;

DROP POLICY IF EXISTS "organization_posts_insert_members" ON public.organization_posts;
CREATE POLICY "organization_posts_insert_members"
  ON public.organization_posts FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_org_posts(organization_id));

DROP POLICY IF EXISTS "organization_posts_update_members" ON public.organization_posts;
CREATE POLICY "organization_posts_update_members"
  ON public.organization_posts FOR UPDATE TO authenticated
  USING (public.can_manage_org_posts(organization_id))
  WITH CHECK (public.can_manage_org_posts(organization_id));

DROP POLICY IF EXISTS "organization_posts_delete_members" ON public.organization_posts;
CREATE POLICY "organization_posts_delete_members"
  ON public.organization_posts FOR DELETE TO authenticated
  USING (public.can_manage_org_posts(organization_id));


-- --------------------------------------------
-- 4. decide_claim：限定承認では can_edit_profile / can_manage_posts も false にする
--
--    can_manage_members・can_manage_applications と同じ形に揃える。
--    can_manage_finance は対象外（会計は学生向けではないため従来どおり true）。
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
  can_profile boolean;
  can_posts boolean;
  member_role text;
BEGIN
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF p_decision NOT IN ('approve','reject') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_decision');
  END IF;
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

  IF c.applicant_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'applicant_gone');
  END IF;

  SELECT o.claim_status INTO org_status
  FROM public.organizations o WHERE o.id = c.organization_id FOR UPDATE;
  IF org_status IS DISTINCT FROM 'unclaimed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
  END IF;

  INSERT INTO public.organization_snapshots (organization_id, snapshot, reason, created_by)
  SELECT o.id, to_jsonb(o), 'pre_claim', auth.uid()
  FROM public.organizations o WHERE o.id = c.organization_id;

  can_members := (p_level = 'full');
  can_apps := (p_level = 'full');
  -- 036：掲載内容の編集とお知らせ投稿も、限定では止める
  -- （学生向けに出る情報のため。会計・タスクは対象外＝ can_manage_finance は下で true 固定）
  can_profile := (p_level = 'full');
  can_posts := (p_level = 'full');
  member_role := CASE WHEN p_level = 'full' THEN 'owner' ELSE 'member' END;

  INSERT INTO public.organization_members (
    organization_id, user_id, role,
    can_edit_profile, can_manage_posts, can_manage_finance,
    can_manage_members, can_manage_applications
  ) VALUES (
    c.organization_id, c.applicant_user_id, member_role,
    can_profile, can_posts, true,
    can_members, can_apps
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = member_role,
    can_edit_profile = can_profile,
    can_manage_posts = can_posts,
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
    RETURN jsonb_build_object('ok', false, 'error', 'already_claimed');
END;
$$;

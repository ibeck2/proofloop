-- ============================================
-- 035 応募（ATS・応募DM）のRLSを organizations.user_id から
--     organization_members 起点へ移す
--
--    ⚠️ 未適用。適用前にオーナー承認を取ること。
--
--    背景：
--      claim動線は乗っ取り対策として organizations.user_id を書き換え不可に
--      した。したがって claim 経由でオーナーになった人はこの列に載らない。
--      ところが応募まわりのRLSはこの列だけを見ていたため、
--      granted_level='full' で承認しても /clubats の応募一覧と応募DMが
--      常に0件になる。
--
--    本番実測（2026-08-12）：
--      organizations.user_id が入った団体          … 1件
--      うちメンバー行が無い（移行で権限を失う）団体 … 0件
--      applications / application_messages の行数  … 0件 / 0件
--      ＝ 応募データが1件も無いうちに移行できる。
-- ============================================


-- --------------------------------------------
-- 0. 【検証中に発覚】role='member' が check 制約で弾かれる
--
--    033 は「限定承認では role='member' を書く」ことを C1 の対処にした。
--    ところが organization_members_role_check は
--      CHECK (role = ANY (ARRAY['owner','admin']))
--    のままで、'member' を許していない（001〜034 のどこでも緩めていない）。
--
--    ⇒ decide_claim を p_level='limited' で呼ぶと、メンバー行の INSERT が
--      23514 check_violation で落ちる。関数の EXCEPTION 節は
--      unique_violation しか捕まえないので、運営には 500 が返る。
--      **限定承認は本番で一度も成立しない状態だった。**
--      （claim を1件も承認していないため実害は出ていない）
--
--    本番実測 2026-08-12：制約定義は上記のとおり。
--    TS 側（lib/organizationMembers.ts:149）は role='member' を前提に
--    書かれており、DB だけが追随していなかった。
--
--    'member' を許しても権限の穴は開かない。メンバー管理・招待発行の鍵は
--    get_user_admin_organization_ids の role IN ('owner','admin') であり、
--    'member' はそこを通らない（033 が意図したとおり）。
--
--    organization_invitations 側の同名制約は緩めない。招待で 'member' を
--    発行する導線は無く、緩めると限定相当の権限を招待経由で配れてしまう。
-- --------------------------------------------
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]));


-- --------------------------------------------
-- 1. 判定関数
--
--    条件式は role IN ('owner','admin') OR can_manage_applications。
--
--    🚨 can_manage_applications だけを条件にしてはいけない。
--    organization_members.can_manage_applications の既定値は false で、
--    app/(club)/clubdashboard/OrganizationProfileForm.tsx:483 は自作団体の
--    owner 行を権限フラグを一切指定せずに INSERT している。
--    フラグだけを見ると、既存の自作団体オーナーが全員締め出される。
--    これは 033 の【C1】で却下したのとまったく同じ形の罠。
--
--    この条件式での見え方：
--      自作団体のオーナー   role=owner  / flag=false → 見える（role で通る）
--      claim フル承認       role=owner  / flag=true  → 見える
--      claim 限定承認       role=member / flag=false → 見えない（設計どおり）
--      招待された一般メンバー role=admin / flag=true  → 見える
--
--    auth.uid() は必ず関数内部で見る。引数で受け取ると「誰の権限でも
--    問い合わせられる関数」になってしまう。
--
--    role は nullable（既定 'admin'）、can_manage_applications も nullable
--    なので coalesce で false に倒す。NULL は「権限なし」として扱う。
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_org_applications(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = p_org
      AND m.user_id = auth.uid()
      AND (m.role IN ('owner', 'admin') OR coalesce(m.can_manage_applications, false))
  );
$$;

-- Supabase では REVOKE ALL ON FUNCTION ... FROM PUBLIC が効かない。
-- public スキーマのデフォルト権限で anon / authenticated に直接 EXECUTE が
-- 付くため（PUBLIC 経由の付与ではないので取り消せない）。anon へ明示的に REVOKE する。
REVOKE EXECUTE ON FUNCTION public.can_view_org_applications(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_org_applications(uuid) TO authenticated;


-- --------------------------------------------
-- 2. applications（応募）
--
--    学生側の "Students can ..." 2本は触らない。user_id = auth.uid() で
--    正しく動いている。
-- --------------------------------------------
DROP POLICY IF EXISTS "Club admins can view applications to their club" ON public.applications;
CREATE POLICY "Club admins can view applications to their club"
  ON public.applications FOR SELECT TO authenticated
  USING (public.can_view_org_applications(organization_id));

DROP POLICY IF EXISTS "Club admins can update applications to their club" ON public.applications;
CREATE POLICY "Club admins can update applications to their club"
  ON public.applications FOR UPDATE TO authenticated
  USING (public.can_view_org_applications(organization_id))
  WITH CHECK (public.can_view_org_applications(organization_id));


-- --------------------------------------------
-- 3. application_messages（応募DM）
--
--    applications を経由する。副問い合わせ側の applications にも RLS が
--    適用されるが、条件は上の2本と同一なので齟齬は起きない。
--    移行前の IN (...) 形から EXISTS 形に変える（意味は同じ・索引が効く形）。
-- --------------------------------------------
DROP POLICY IF EXISTS "Club admins can view messages for their club" ON public.application_messages;
CREATE POLICY "Club admins can view messages for their club"
  ON public.application_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_messages.application_id
        AND public.can_view_org_applications(a.organization_id)
    )
  );

-- 送信者のなりすまし防止（auth.uid() = sender_id）は移行前の条件をそのまま残す。
DROP POLICY IF EXISTS "Club admins can send messages" ON public.application_messages;
CREATE POLICY "Club admins can send messages"
  ON public.application_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_messages.application_id
        AND public.can_view_org_applications(a.organization_id)
    )
    AND auth.uid() = sender_id
  );

DROP POLICY IF EXISTS "Club admins can update read_at" ON public.application_messages;
CREATE POLICY "Club admins can update read_at"
  ON public.application_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_messages.application_id
        AND public.can_view_org_applications(a.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_messages.application_id
        AND public.can_view_org_applications(a.organization_id)
    )
  );


-- --------------------------------------------
-- 4. 索引は追加しない
--
--    can_view_org_applications は (organization_id, user_id) で
--    organization_members を引くが、この組にはすでに一意制約由来の索引
--    organization_members_organization_id_user_id_key がある（実測済み）。
--    別名で張ると同じ形の索引が二重になるだけなので足さない。
-- --------------------------------------------


-- ============================================
-- この移行の対象外（実測して判断した記録）
--
--   organizations.user_id を参照するポリシーは本番に9本あり、上の5本以外に
--   次の4本がある。いずれも応募動線ではないので 035 では触らない。
--
--     events   "Club admins can update their own events"   → 冗長。
--              events_update_policy / "Users can update their own events" が
--              いずれも qual=true なので、この1本を消しても挙動は変わらない。
--              （events の UPDATE/DELETE/INSERT が authenticated へ全開なのは
--                claim とは無関係の別件。docs/risk-register.md に記録した）
--     profiles "Club admins can view profiles of their applicants" → 冗長。
--              "Clubs can view applicant profiles" が get_user_organization_ids
--              （メンバー起点）で同じ範囲を許可している。
--     tasks    "Club admins can manage their org tasks"    → 冗長。
--              tasks_{select,insert,update,delete}_own_org が
--              get_user_organization_ids で同じ範囲を許可している。
--     reviews  "Club admins can reply to reviews"          → 冗長ではない。
--              claim オーナーは口コミに返信できない。ただし返信UIは未実装
--              （アプリ側から reviews を UPDATE するのは /admin/reviews のみ）
--              なので、いま壊れているものは無い。返信機能を作るときに直す。
-- ============================================

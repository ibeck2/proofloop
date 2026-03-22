-- organization_page_views: 学生の団体詳細閲覧ログ（テーブル作成済み環境向け RLS 例）
-- 未作成の場合は先にテーブルを作成してから適用してください。

ALTER TABLE public.organization_page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_page_views_insert_anon" ON public.organization_page_views;
DROP POLICY IF EXISTS "organization_page_views_insert_authenticated" ON public.organization_page_views;
DROP POLICY IF EXISTS "organization_page_views_select_org_staff" ON public.organization_page_views;

-- 未ログイン閲覧: viewer_id は NULL
CREATE POLICY "organization_page_views_insert_anon"
  ON public.organization_page_views
  FOR INSERT
  TO anon
  WITH CHECK (viewer_id IS NULL);

-- ログイン閲覧: viewer_id は自分自身と一致
CREATE POLICY "organization_page_views_insert_authenticated"
  ON public.organization_page_views
  FOR INSERT
  TO authenticated
  WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

-- ダッシュボード集計用: 当該団体の owner / admin が参照
CREATE POLICY "organization_page_views_select_org_staff"
  ON public.organization_page_views
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

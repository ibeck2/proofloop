-- organization_posts: 団体タイムライン投稿（テーブル作成済み環境向け RLS）
ALTER TABLE public.organization_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_posts_select_members" ON public.organization_posts;
DROP POLICY IF EXISTS "organization_posts_insert_members" ON public.organization_posts;
DROP POLICY IF EXISTS "organization_posts_delete_members" ON public.organization_posts;
DROP POLICY IF EXISTS "organization_posts_update_members" ON public.organization_posts;

CREATE POLICY "organization_posts_select_members"
  ON public.organization_posts
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "organization_posts_insert_members"
  ON public.organization_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "organization_posts_update_members"
  ON public.organization_posts
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "organization_posts_delete_members"
  ON public.organization_posts
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

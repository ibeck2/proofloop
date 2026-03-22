-- 学生向けタイムライン: 非表示でない投稿の公開読取 + いいね（post_likes）

DROP POLICY IF EXISTS "organization_posts_select_public_visible" ON public.organization_posts;

CREATE POLICY "organization_posts_select_public_visible"
  ON public.organization_posts
  FOR SELECT
  TO anon, authenticated
  USING (is_hidden = false);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.organization_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select_all" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert_own" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_delete_own" ON public.post_likes;

CREATE POLICY "post_likes_select_all"
  ON public.post_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "post_likes_insert_own"
  ON public.post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "post_likes_delete_own"
  ON public.post_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Phase 3B: 口コミ・フォト用テーブル（既存の場合はスキップ）

-- 口コミテーブル
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_organization_id ON public.reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select_approved" ON public.reviews FOR SELECT USING (status = 'approved' OR true);
CREATE POLICY "reviews_insert_authenticated" ON public.reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "reviews_update_authenticated" ON public.reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 団体写真テーブル
CREATE TABLE IF NOT EXISTS public.organization_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_photos_organization_id ON public.organization_photos(organization_id);

ALTER TABLE public.organization_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organization_photos_select" ON public.organization_photos FOR SELECT USING (true);
CREATE POLICY "organization_photos_insert_authenticated" ON public.organization_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "organization_photos_delete_authenticated" ON public.organization_photos FOR DELETE TO authenticated USING (true);

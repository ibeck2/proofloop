-- Phase 4-C: お気に入り団体用テーブル（既に作成済みの場合はスキップ）
CREATE TABLE IF NOT EXISTS public.saved_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_organizations_user_id ON public.saved_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_organizations_organization_id ON public.saved_organizations(organization_id);

ALTER TABLE public.saved_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_organizations_select_own" ON public.saved_organizations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_organizations_insert_own" ON public.saved_organizations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_organizations_delete_own" ON public.saved_organizations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

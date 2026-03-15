-- Phase 3A: イベントテーブル（既に作成済みの場合はスキップ）
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_date timestamptz NOT NULL,
  location text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_policy" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_insert_policy" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "events_update_policy" ON public.events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "events_delete_policy" ON public.events FOR DELETE TO authenticated USING (true);

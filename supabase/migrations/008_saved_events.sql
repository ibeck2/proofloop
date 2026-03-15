-- Phase 4-B: イベント保存（お気に入り）用テーブル（既に作成済みの場合はスキップ）
CREATE TABLE IF NOT EXISTS public.saved_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_events_user_id ON public.saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_event_id ON public.saved_events(event_id);

ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_events_select_own" ON public.saved_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "saved_events_insert_own" ON public.saved_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_events_delete_own" ON public.saved_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

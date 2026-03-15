-- Phase 4-D: 選考フロー用 jsonb カラム（既に追加済みの場合はスキップ）
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS selection_flow jsonb;

COMMENT ON COLUMN public.organizations.selection_flow IS '選考ステップの配列。各要素: name, date_type(pin|deadline|period|none), date_value, description, url';

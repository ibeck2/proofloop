-- Phase 1: 検索・カード表示用の追加カラム
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_intercollege boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_grades text,
  ADD COLUMN IF NOT EXISTS selection_process text;

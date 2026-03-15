-- Phase 2: 団体詳細・プロフィール編集用の追加カラム
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS gender_ratio text,
  ADD COLUMN IF NOT EXISTS grade_composition text,
  ADD COLUMN IF NOT EXISTS location_detail text,
  ADD COLUMN IF NOT EXISTS fee_entry text,
  ADD COLUMN IF NOT EXISTS fee_annual text;

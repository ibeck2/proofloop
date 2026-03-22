-- マイページ等で利用する profiles 拡張カラム（006 の既存環境向け）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS admission_year text,
  ADD COLUMN IF NOT EXISTS graduation_year text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- updated_at を自動更新する場合（任意）
-- CREATE TRIGGER ... 

COMMENT ON COLUMN public.profiles.full_name IS '氏名（表示用）';
COMMENT ON COLUMN public.profiles.contact_email IS '連絡用メール';

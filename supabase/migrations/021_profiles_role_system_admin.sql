-- 全体管理者（System Admin）判定用。app/admin/requests, app/admin/reviews が profiles.role = 'admin' を参照。
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';

COMMENT ON COLUMN public.profiles.role IS
  'アプリ全体ロール。システム管理者は admin（/admin/*）。未設定は student 扱い。';

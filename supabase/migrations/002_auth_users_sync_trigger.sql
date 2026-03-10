-- ============================================
-- auth.users 作成時に public.users へ自動同期するトリガー
-- 001_initial_mvp_schema.sql 実行後に実行してください
-- ============================================

-- --------------------------------------------
-- トリガー用関数
-- raw_user_meta_data / email から name, email を安全に取得
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    -- メタデータから氏名を取得（Supabase/Google は full_name、一部プロバイダは name）
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), '')
    ),
    NULLIF(TRIM(NEW.email), ''),
    'student'
  );
  RETURN NEW;
END;
$$;

-- --------------------------------------------
-- auth.users への INSERT 後に発火するトリガー
-- --------------------------------------------
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

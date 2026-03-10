-- ============================================
-- MVP 初期データベース構築 DDL
-- Supabase SQL エディタで実行してください
-- ============================================

-- --------------------------------------------
-- 1. users テーブル（auth.users と連携）
-- --------------------------------------------
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  role text NOT NULL CHECK (role IN ('student', 'organization', 'company')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 有効化
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "users_select_policy"
  ON public.users
  FOR SELECT
  USING (true);

-- 認証済みユーザーなら作成可能
CREATE POLICY "users_insert_policy"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 認証済みユーザーなら更新可能（自分の行のみ推奨だが MVP では緩めに）
CREATE POLICY "users_update_policy"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------
-- 2. organizations テーブル（学生団体情報）
-- --------------------------------------------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text,
  university text,
  category text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 有効化
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 誰でも読み取り可能
CREATE POLICY "organizations_select_policy"
  ON public.organizations
  FOR SELECT
  USING (true);

-- 認証済みユーザーなら作成可能
CREATE POLICY "organizations_insert_policy"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 認証済みユーザーなら更新可能
CREATE POLICY "organizations_update_policy"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------
-- オプション: インデックス（検索・JOIN 用）
-- --------------------------------------------
CREATE INDEX idx_organizations_user_id ON public.organizations(user_id);
CREATE INDEX idx_users_role ON public.users(role);

-- 043 tasks の拡張：作成者/レビュー者/種別の追加とステータス種別の拡張
-- 列権限：tasks はテーブルレベルの標準GRANTのまま（profilesのような列制限は無いことを確認済み）
-- のため、新規列に個別GRANTは不要。RLSポリシーも行レベル（organization_id）のみで
-- 列を見ていないため変更不要。

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status = ANY (ARRAY['todo','in_progress','in_review','on_hold','done']));

COMMENT ON COLUMN public.tasks.created_by IS 'タスクを追加した人。担当者(assignee_id)とは別。挿入時にクライアントが設定、更新時は上書きしない。';
COMMENT ON COLUMN public.tasks.reviewer_id IS 'レビュー待ち(in_review)ステータスでの確認担当者。';
COMMENT ON COLUMN public.tasks.category IS 'タスク種別（自由記述・団体内でグルーピングに使う）。';

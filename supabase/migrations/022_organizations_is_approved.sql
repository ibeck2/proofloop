-- 運営承認状態（マイページの団体ダッシュボード表示などで利用）
-- 既存行は true のまま互換維持。未承認の新規団体は false をセットする運用を想定。
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organizations.is_approved IS
  '運営承認済みの団体。false の場合はマイページの管理ダッシュボード導線から除外。';

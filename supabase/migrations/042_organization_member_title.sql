-- 042 団体内の役職（自由記述）を organization_members に追加
-- role（owner/admin=権限ロール）とは別概念。キャプテン・会計担当・新歓隊長等を自由記述で記録する。
-- RLS/GRANTの追加変更は不要：organization_members_update_org_admins（020）は行レベルのみで
-- 列制限が無く、organization_members に列レベルGRANT制限も存在しない。

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN public.organization_members.title IS
  '団体内の役職（自由記述・例：キャプテン、会計担当、新歓隊長）。owner/adminの権限roleとは別物。';

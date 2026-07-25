-- ============================================
-- 027 財務: 既定シードの競合防止
-- 会計担当が2人同時に初回アクセスしても、会計期間・費目が
-- 重複作成されないようにする部分ユニークインデックス。
-- （アプリ側は insert 失敗時に再読込して既存を採用するフォールバックを実装済み）
-- ============================================

-- 会計期間: 同一団体で同名の期間は1つ（例 "2026年度"）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_finance_periods_org_name
  ON public.finance_periods (organization_id, name);

-- 費目: 同一団体で「アーカイブされていない同名費目」は1つ
-- （アーカイブ済みは重複を許容＝過去の同名費目を履歴として残せる）
CREATE UNIQUE INDEX IF NOT EXISTS uniq_finance_categories_org_name_active
  ON public.finance_categories (organization_id, name)
  WHERE is_archived = false;

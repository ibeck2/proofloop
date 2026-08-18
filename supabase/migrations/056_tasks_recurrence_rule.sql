-- 056: tasksに定期タスク（繰り返し）用の列を追加
--
-- 新規テーブルは作らず、既存tasksへの列追加のみ。tasksのUPDATE/INSERT/SELECT
-- 権限はテーブルレベルの標準GRANTで、列ごとの制限が無いことを確認済み
-- （pg_attribute.attaclが既存全列でNULL。043の「profilesのような列制限は
-- 無い」という記録と一致）。そのため新規列に対する明示的なGRANTは不要で、
-- 既存のtasks_*_own_org RLSポリシー（列を見ない、organization_idのみで
-- 判定）もそのまま新規列に適用される。CHECK制約は既存の
-- tasks_priority_check・tasks_status_checkと同じ「英語canonical値のみ
-- 許可、UIは日本語ラベルに分離」方針を踏襲する。

ALTER TABLE public.tasks
  ADD COLUMN recurrence_rule text;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_recurrence_rule_check
  CHECK (recurrence_rule IN ('weekly', 'biweekly', 'monthly') OR recurrence_rule IS NULL);

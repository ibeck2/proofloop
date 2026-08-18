-- 058: 057の権限修正を履歴として再記録する（冪等な再アサート、no-op目的）
--
-- 057は当初brief原文（列指定REVOKEのみ、テーブルレベルGRANTと衝突して
-- 無効化されるバグあり）でapply_migrationされ、本番検証で不備が判明した
-- 後、execute_sqlで直接パッチを当てて修正した。そのため
-- supabase_migrations.schema_migrations には057として「修正前（バグ入り）
-- の内容」が記録されたままで、リポジトリのsupabase/migrations/057_*.sql
-- （修正後の内容）と履歴が食い違っている。
--
-- 本番DBの実際の権限状態は既に正しい（修正後）ため機能的リスクは無いが、
-- 将来 supabase CLI の db push / migration list / db diff 等でこの
-- プロジェクトをlinkした際に、履歴とファイル内容の不一致が検出され
-- 混乱を招く可能性がある。このマイグレーションは057の修正後の内容を
-- そのまま再実行するだけの冪等なno-op（既に正しい状態に対して実行しても
-- 結果は変わらない）で、履歴側にも正しい最終状態を記録するために追加する。

REVOKE UPDATE ON TABLE public.tasks FROM authenticated, anon;

GRANT UPDATE (
  id, organization_id, title, description, status, priority, assignee_id,
  due_date, created_at, created_by, reviewer_id, category, recurrence_rule
) ON public.tasks TO authenticated;

-- 059: tasksのINSERT権限もarchived_at/archive_labelを除く列に限定する
--
-- 057/058でUPDATEは列を絞ったが、INSERTはテーブルレベルの標準GRANTの
-- ままだったため、団体メンバー（owner/admin以外も含む）が直接
-- tasks.insert({..., archived_at: now(), archive_label: '...'}) を送ることで、
-- 最初からアーカイブ済みの偽装タスクを作成できてしまう抜け穴があった
-- （最終レビューで実証済み：非管理者メンバーが偽の年度ラベルを持つ
-- タスクを作成でき、それが「表示」フィルタの選択肢に紛れ込んだ）。
-- 057/058と同じ手法（テーブルレベルをREVOKEしてから許可列だけGRANT）で
-- 塞ぐ。archive_labelには併せて長さ制約も加える（task_comments.body・
-- 055と同じ理由：一度作成されると訂正・削除の手段が無い列には、
-- テーブルがまだ小さいうちに制約を掛けておく）。

REVOKE INSERT ON TABLE public.tasks FROM authenticated, anon;

GRANT INSERT (
  id, organization_id, title, description, status, priority, assignee_id,
  due_date, created_at, created_by, reviewer_id, category, recurrence_rule
) ON public.tasks TO authenticated;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_archive_label_length
  CHECK (archive_label IS NULL OR char_length(btrim(archive_label)) BETWEEN 1 AND 100);

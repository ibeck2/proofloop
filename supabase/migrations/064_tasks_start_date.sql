-- 064: tasksにstart_date列を追加し、ガント/カレンダーの期間ドラッグ編集を可能にする
--
-- start_dateはarchived_at/archive_labelと違い、通常のメンバーが自由に編集して
-- よい列（RPC経由に絞る必要はない）。ただしtasksは057でテーブル単位の
-- UPDATE/INSERTをREVOKEし、許可する列だけを明示的にGRANTし直す設計に
-- なっているため、start_dateを追加しても列GRANTに加えない限り
-- authenticatedは書き込めない（CLAUDE.mdの既知の落とし穴）。
-- 列レベルGRANTは列ごとに独立して加算されるため、既存の列を再列挙する
-- 必要はなく、対象列だけの追加GRANTで足りる。

ALTER TABLE public.tasks ADD COLUMN start_date date;

GRANT INSERT (start_date) ON public.tasks TO authenticated;
GRANT UPDATE (start_date) ON public.tasks TO authenticated;

/**
 * 年度アーカイブ（Phase 3）の表示フィルタリング・ラベル一覧の純粋関数。
 * DBアクセスをせず、既に読み込み済みのタスク配列に対して絞り込む。
 */

import type { TaskRow } from "@/lib/types/task";

export type ArchiveView =
  | { type: "current" }
  | { type: "label"; label: string };

/**
 * "current"（既定）はarchived_atが無い現役タスクのみを返す。
 * "label"は指定されたarchive_labelに一致するアーカイブ済みタスクのみを
 * 返す（現役タスクは含まない＝アーカイブ履歴閲覧中は参照専用の一覧になる）。
 *
 * loadTasksは既にサーバー側（Supabaseクエリ）でarchiveViewに応じた絞り込みを
 * 行っているが、archiveViewを切り替えた瞬間から再取得が完了するまでの間は
 * tasks stateが古いビューのデータのままなので、この関数がその一瞬の
 * フラッシュ・不整合表示（前のビューのタスクが一瞬混ざって見える）を防ぐために
 * クライアント側でも引き続き使用している。
 */
export function filterTasksByArchiveView(
  tasks: TaskRow[],
  view: ArchiveView
): TaskRow[] {
  if (view.type === "current") {
    return tasks.filter((t) => !t.archived_at);
  }
  return tasks.filter((t) => t.archived_at && t.archive_label === view.label);
}

/**
 * 過去にアーカイブされたラベルの一覧を、直近にアーカイブされた順（降順）で
 * 返す。同じラベルで複数回アーカイブされることは想定していないが、念のため
 * 各ラベルの最も新しいarchived_atを代表値として採用する。
 */
export function archiveLabelOptions(
  tasks: Pick<TaskRow, "archive_label" | "archived_at">[]
): string[] {
  const latestByLabel = new Map<string, number>();
  for (const t of tasks) {
    if (!t.archive_label || !t.archived_at) continue;
    const ts = new Date(t.archived_at).getTime();
    const prev = latestByLabel.get(t.archive_label);
    if (prev === undefined || ts > prev) {
      latestByLabel.set(t.archive_label, ts);
    }
  }
  return Array.from(latestByLabel.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);
}

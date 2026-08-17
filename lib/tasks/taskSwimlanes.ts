import type { TaskRow, TaskStatus } from "@/lib/types/task";

/**
 * かんばんを行方向にグルーピングする軸。"flat"（従来の単一行表示）は
 * 呼び出し側で分岐するため、この型には含めない。
 */
export type SwimlaneAxis = "category" | "assignee";

/** グルーピングキーが空（種別未設定・担当者未定）のタスクをまとめる行のキー */
export const UNASSIGNED_SWIMLANE_KEY = "__unassigned__";

export interface SwimlaneRow {
  key: string;
  tasksByStatus: Record<TaskStatus, TaskRow[]>;
}

export function swimlaneRowKeyForTask(
  task: TaskRow,
  axis: SwimlaneAxis
): string {
  if (axis === "category") {
    const v = task.category?.trim();
    return v || UNASSIGNED_SWIMLANE_KEY;
  }
  return task.assignee_id || UNASSIGNED_SWIMLANE_KEY;
}

/**
 * タスク配列を行(種別/担当者)×列(既存ステータス)のグリッド構造に変換する。
 * 行の並び順はキーの文字列昇順（ja ロケール）。未分類/未定の行は常に最後に固定する
 * （アンダースコアの位置がロケール依存でぶれるのを避けるため、比較の前に判定する）。
 */
export function groupTasksIntoSwimlanes(
  tasks: TaskRow[],
  axis: SwimlaneAxis,
  statuses: TaskStatus[],
  normalizeStatus: (s: string | null | undefined) => TaskStatus,
  sortTasks: (a: TaskRow, b: TaskRow) => number
): SwimlaneRow[] {
  const byKey = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    const key = swimlaneRowKeyForTask(task, axis);
    const list = byKey.get(key);
    if (list) {
      list.push(task);
    } else {
      byKey.set(key, [task]);
    }
  }

  const keys = Array.from(byKey.keys()).sort((a, b) => {
    if (a === UNASSIGNED_SWIMLANE_KEY) return 1;
    if (b === UNASSIGNED_SWIMLANE_KEY) return -1;
    return a.localeCompare(b, "ja");
  });

  return keys.map((key) => {
    const rowTasks = byKey.get(key)!;
    const tasksByStatus = {} as Record<TaskStatus, TaskRow[]>;
    for (const status of statuses) {
      tasksByStatus[status] = rowTasks
        .filter((t) => normalizeStatus(t.status) === status)
        .sort(sortTasks);
    }
    return { key, tasksByStatus };
  });
}

/** スイムレーン内の各セルを一意に識別するDroppable ID */
export function encodeSwimlaneDroppableId(
  rowKey: string,
  status: TaskStatus
): string {
  return `swimlane::${rowKey}::${status}`;
}

export interface DecodedSwimlaneDroppableId {
  rowKey: string;
  status: TaskStatus;
}

/**
 * encodeSwimlaneDroppableId の逆変換。フラット表示のDroppable ID
 * （ステータスそのものの文字列）が来た場合は null を返す。
 * status は列挙値（"::"を含まない）なので末尾から分割すれば
 * rowKey 自体に "::" が含まれていても正しく復元できる。
 */
export function decodeSwimlaneDroppableId(
  id: string
): DecodedSwimlaneDroppableId | null {
  if (!id.startsWith("swimlane::")) return null;
  const rest = id.slice("swimlane::".length);
  const sepIndex = rest.lastIndexOf("::");
  if (sepIndex === -1) return null;
  return {
    rowKey: rest.slice(0, sepIndex),
    status: rest.slice(sepIndex + 2) as TaskStatus,
  };
}

/**
 * カードを別の行にドラッグした時、グルーピング軸のフィールドをどう更新するかを決める。
 * UNASSIGNED_SWIMLANE_KEY への移動は「種別を空にする」「担当者を未定にする」を意味する。
 */
export function resolveSwimlaneRowChange(
  axis: SwimlaneAxis,
  rowKey: string
): Partial<Pick<TaskRow, "category" | "assignee_id">> {
  const value = rowKey === UNASSIGNED_SWIMLANE_KEY ? null : rowKey;
  return axis === "category" ? { category: value } : { assignee_id: value };
}

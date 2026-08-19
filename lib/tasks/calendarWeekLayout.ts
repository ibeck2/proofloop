/**
 * カレンダーの週グリッド1行ぶんに、タスクの期間（start_date〜due_date）を
 * どのセグメントとしてどの縦レーンに配置するかを計算する純粋関数。
 * UIコンポーネント（CalendarView）はこの結果をそのまま描画するだけで、
 * 交差判定・レーン割り当てのロジックは持たない（CLAUDE.md §5の既存方針）。
 */

import { parseDateOnly } from "./dateRangeDrag";

export type TaskRange = {
  id: string;
  startDate: string; // "YYYY-MM-DD"
  dueDate: string; // "YYYY-MM-DD"
};

export type WeekSegment = {
  taskId: string;
  /** 週の何日目から描画するか（0=日曜〜6=土曜、7列グリッド前提） */
  startCol: number;
  /** 何日ぶんの幅で描画するか（1〜7） */
  span: number;
  /** 縦方向のスタック段（0始まり）。同じ週で重なるタスクをずらして表示する */
  lane: number;
  /** 実際の開始日がこの週より前から続いている（左端を丸めない目印） */
  continuesLeft: boolean;
  /** 実際の期限がこの週より後まで続いている（右端を丸めない目印） */
  continuesRight: boolean;
};

function diffDays(aIso: string, bIso: string): number {
  const a = parseDateOnly(aIso);
  const b = parseDateOnly(bIso);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDaysIso(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * weekStart（週の初日、日曜想定）〜weekStart+6日の週に対して、tasksのうち
 * この週と交差するものだけをセグメント化し、日カラムが重ならないよう
 * 貪欲法でレーンへ割り当てる。startCol順・同着は長い方を先に処理することで、
 * 同じ入力に対して常に同じレーン割り当てになる（決定的）。
 */
export function layoutWeekSegments(
  tasks: readonly TaskRange[],
  weekStart: string
): WeekSegment[] {
  const weekEnd = addDaysIso(weekStart, 6);

  const intersecting = tasks
    .filter((t) => t.startDate <= weekEnd && t.dueDate >= weekStart)
    .map((t) => {
      const segStart = t.startDate < weekStart ? weekStart : t.startDate;
      const segEnd = t.dueDate > weekEnd ? weekEnd : t.dueDate;
      return {
        taskId: t.id,
        startCol: diffDays(weekStart, segStart),
        span: diffDays(segStart, segEnd) + 1,
        continuesLeft: t.startDate < weekStart,
        continuesRight: t.dueDate > weekEnd,
      };
    })
    .sort((a, b) => a.startCol - b.startCol || b.span - a.span);

  const laneEndCols: number[] = [];
  const result: WeekSegment[] = [];
  for (const seg of intersecting) {
    let lane = laneEndCols.findIndex((endCol) => endCol < seg.startCol);
    const endCol = seg.startCol + seg.span - 1;
    if (lane === -1) {
      lane = laneEndCols.length;
      laneEndCols.push(endCol);
    } else {
      laneEndCols[lane] = endCol;
    }
    result.push({ ...seg, lane });
  }
  return result;
}

/**
 * ガント・カレンダーの「バーの端をドラッグして開始日/期限を変える」操作を
 * 支える純粋関数。日付の表現はDBのdate型と同じ "YYYY-MM-DD" 文字列。
 * UIコンポーネント側はピクセル量・pointerイベントの配線のみを持ち、
 * 日付計算はすべてここに集約する（CLAUDE.md §5の既存方針）。
 */

export type DateRange = { startDate: string; dueDate: string };
export type DragEdge = "start" | "due";

export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  d.setDate(d.getDate() + days);
  return formatDateOnly(d);
}

/**
 * ドラッグ量(px)を日数に変換する。dayWidthPxで割って四捨五入する。
 * dayWidthPxが0以下の場合は0を返す（呼び出し側の防御。ゼロ除算回避）。
 */
export function pixelDeltaToDayDelta(
  deltaPx: number,
  dayWidthPx: number
): number {
  if (dayWidthPx <= 0) return 0;
  return Math.round(deltaPx / dayWidthPx);
}

/**
 * ドラッグ中の端（"start"=開始日側／"due"=期限側）を、dayDelta日ぶんずらした
 * 新しい範囲を返す。開始日が期限を追い越す（またはその逆）場合は、
 * 反対側の端と同じ日にクランプする（1日だけのタスクになる。それより
 * 短い範囲は作らない）。文字列比較で日付の前後を判定できる
 * （"YYYY-MM-DD"形式は辞書順＝時系列順に一致するため）。
 */
export function applyDragToRange(
  current: DateRange,
  edge: DragEdge,
  dayDelta: number
): DateRange {
  if (edge === "start") {
    const newStart = addDays(current.startDate, dayDelta);
    if (newStart > current.dueDate) {
      return { startDate: current.dueDate, dueDate: current.dueDate };
    }
    return { startDate: newStart, dueDate: current.dueDate };
  }
  const newDue = addDays(current.dueDate, dayDelta);
  if (newDue < current.startDate) {
    return { startDate: current.startDate, dueDate: current.startDate };
  }
  return { startDate: current.startDate, dueDate: newDue };
}

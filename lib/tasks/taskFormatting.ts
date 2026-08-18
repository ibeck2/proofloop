/**
 * タスクの優先度表示・期限表示のフォーマット関数。
 * 優先度は装飾ではなく意味なので、色相ではなく紺の濃淡で表す
 * （全部同じ見た目にすると、かんばん上で高優先のタスクを一目で拾えなくなる）。
 */

const PRIORITY_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_BADGE_CLASS: Record<string, string> = {
  high: "border border-ink bg-ink text-paper",
  medium: "border border-rule bg-mist text-ink",
  low: "border border-rule bg-paper text-graphite",
};
const DEFAULT_PRIORITY_BADGE_CLASS = "border border-rule bg-paper text-graphite";

export function priorityBadgeClass(priority: string | null | undefined): string {
  return PRIORITY_BADGE_CLASS[priority ?? ""] ?? DEFAULT_PRIORITY_BADGE_CLASS;
}

export function priorityLabel(priority: string | null | undefined): string {
  return (priority && PRIORITY_LABEL[priority]) || "—";
}

export function formatDue(iso: string | null | undefined): string {
  if (!iso) return "期限なし";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * カンバンカードの「2/5」のような進捗バッジ用ラベル。
 * チェックリスト項目が1件も無いタスクにはバッジ自体を出さないため null を返す。
 */
export function checklistProgressLabel(
  done: number,
  total: number
): string | null {
  if (total <= 0) return null;
  return `${done}/${total}`;
}

/**
 * 添付ファイルの一覧表示用に、バイト数を人間可読な文字列に変換する。
 * B → KB → MB のしきい値は 1024 単位（1000 ではない）。
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * コメントのタイムスタンプ表示用。日付だけの formatDue と異なり時刻も含める。
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

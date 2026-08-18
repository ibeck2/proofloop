/**
 * 定期タスク（繰り返し）の次回生成ロジック。
 * DBアクセスをせず、「元タスクの値＋チェックリスト項目の配列」を受け取り、
 * 「次回タスクのinsertペイロード＋チェックリストのinsertペイロード配列」を
 * 返す。recurrence_ruleが未設定・不正な値ならnullを返す（呼び出し側の判定
 * 漏れやDBのCHECK制約をすり抜けたケースに対する最後の砦として、この関数
 * 自体もガードを持つ）。
 */

import type { TaskStatus } from "@/lib/types/task";

export type RecurrenceRule = "weekly" | "biweekly" | "monthly";

const RECURRENCE_RULES: readonly RecurrenceRule[] = [
  "weekly",
  "biweekly",
  "monthly",
];

export function isRecurrenceRule(
  value: string | null | undefined
): value is RecurrenceRule {
  return !!value && (RECURRENCE_RULES as readonly string[]).includes(value);
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ruleに応じて基準日から次回日付を計算する。monthlyはJS Dateのネイティブな
 * setMonth()の挙動（例：1/31 + 1ヶ月 → 2月が31日まで無いため3/3に繰り上がる）
 * をそのまま採用する。月末に丸めるクランプ処理は今回のスコープ外（YAGNI）。
 */
function addInterval(base: Date, rule: RecurrenceRule): Date {
  const next = new Date(base.getTime());
  if (rule === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + (rule === "weekly" ? 7 : 14));
  }
  return next;
}

export function nextDueDate(
  dueDate: string | null,
  rule: RecurrenceRule,
  today: Date = new Date()
): string {
  const base = dueDate ? parseDateOnly(dueDate) : today;
  return formatDateOnly(addInterval(base, rule));
}

export interface RecurringTaskSource {
  organization_id: string;
  title: string;
  category: string | null;
  priority: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  due_date: string | null;
  recurrence_rule: string | null;
}

export interface RecurringTaskInsert {
  organization_id: string;
  title: string;
  category: string | null;
  priority: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  due_date: string;
  status: TaskStatus;
  recurrence_rule: RecurrenceRule;
}

export interface RecurringChecklistItemInsert {
  text: string;
  position: number;
  is_done: false;
}

export interface RecurringTaskGeneration {
  task: RecurringTaskInsert;
  checklistItems: RecurringChecklistItemInsert[];
}

export function buildRecurringTask(
  source: RecurringTaskSource,
  checklistItems: ReadonlyArray<{ text: string; position: number }>,
  today: Date = new Date()
): RecurringTaskGeneration | null {
  if (!isRecurrenceRule(source.recurrence_rule)) return null;
  const rule = source.recurrence_rule;

  return {
    task: {
      organization_id: source.organization_id,
      title: source.title,
      category: source.category,
      priority: source.priority,
      assignee_id: source.assignee_id,
      reviewer_id: source.reviewer_id,
      due_date: nextDueDate(source.due_date, rule, today),
      status: "todo",
      recurrence_rule: rule,
    },
    checklistItems: [...checklistItems]
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({
        text: item.text,
        position: index,
        is_done: false as const,
      })),
  };
}

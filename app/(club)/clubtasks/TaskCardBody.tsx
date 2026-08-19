"use client";

import { CalendarDays, Eye, ListChecks, Repeat, User, type LucideIcon } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  checklistProgressLabel,
  formatDue,
  priorityBadgeClass,
  priorityLabel,
  recurrenceLabel,
} from "@/lib/tasks/taskFormatting";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";

type Props = {
  task: TaskRow;
  status: TaskStatus;
  memberNameById: Record<string, string>;
  checklistCountByTaskId: Record<string, { done: number; total: number }>;
  onOpen: (task: TaskRow) => void;
};

type Chip = { key: string; icon: LucideIcon; label: string };

export default function TaskCardBody({
  task,
  status,
  memberNameById,
  checklistCountByTaskId,
  onOpen,
}: Props) {
  const checklistProgress = checklistCountByTaskId[task.id];
  const checklistLabel = checklistProgress
    ? checklistProgressLabel(checklistProgress.done, checklistProgress.total)
    : null;
  const recurrence = recurrenceLabel(task.recurrence_rule);
  const catColor = categoryColor(task.category);

  /**
   * 担当者・レビュー者・チェックリスト進捗・繰り返しは、タスクによって
   * 有無がバラつく「付随情報」。以前は各項目を縦に1行ずつ積んでいたため、
   * 情報量が多いタスクほどカードが縦に伸び、同じレーン内で高さが不揃いに
   * なっていた。横並びのチップにしてflex-wrapで折り返すことで、
   * 情報0件のタスクは何も描画されず、情報4件のタスクでも高さの増分を
   * 最小限に抑える。
   */
  const chips: Chip[] = [];
  if (task.assignee_id && memberNameById[task.assignee_id]) {
    chips.push({
      key: "assignee",
      icon: User,
      label: memberNameById[task.assignee_id],
    });
  }
  if (
    status === "in_review" &&
    task.reviewer_id &&
    memberNameById[task.reviewer_id]
  ) {
    chips.push({
      key: "reviewer",
      icon: Eye,
      label: memberNameById[task.reviewer_id],
    });
  }
  if (checklistLabel) {
    chips.push({ key: "checklist", icon: ListChecks, label: checklistLabel });
  }
  if (recurrence) {
    chips.push({ key: "recurrence", icon: Repeat, label: recurrence });
  }

  return (
    <button
      type="button"
      className="flex-1 min-w-0 p-3 text-left"
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="font-medium text-ink text-sm leading-snug line-clamp-2">
          {task.title}
        </p>
        <span
          className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${priorityBadgeClass(task.priority)}`}
        >
          {priorityLabel(task.priority)}
        </span>
      </div>
      {task.category && catColor && (
        <span
          className="inline-flex items-center gap-1 mb-1 text-[10px] font-medium px-1.5 py-0.5 rounded border text-graphite"
          style={{
            backgroundColor: catColor.tint,
            borderColor: catColor.border,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: catColor.dot }}
            aria-hidden="true"
          />
          {task.category}
        </span>
      )}
      <p className="text-xs text-graphite/70 flex items-center gap-1">
        <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
        {formatDue(task.due_date)}
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
          {chips.map((chip) => {
            const Icon = chip.icon;
            return (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 text-[10px] text-graphite/70"
              >
                <Icon className="w-[12px] h-[12px]" aria-hidden="true" />
                {chip.label}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}

"use client";

import { CalendarDays, Eye, ListChecks, User } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  checklistProgressLabel,
  formatDue,
  priorityBadgeClass,
  priorityLabel,
} from "@/lib/tasks/taskFormatting";

type Props = {
  task: TaskRow;
  status: TaskStatus;
  memberNameById: Record<string, string>;
  checklistCountByTaskId: Record<string, { done: number; total: number }>;
  onOpen: (task: TaskRow) => void;
};

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

  return (
    <button
      type="button"
      className="flex-1 min-w-0 p-3 pr-4 pt-3 text-left"
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
      {task.category && (
        <span className="inline-block mb-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-rule text-graphite/70">
          {task.category}
        </span>
      )}
      <p className="text-xs text-graphite/70 flex items-center gap-1">
        <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
        {formatDue(task.due_date)}
      </p>
      {task.assignee_id && memberNameById[task.assignee_id] && (
        <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
          <User className="w-[14px] h-[14px]" aria-hidden="true" />
          {memberNameById[task.assignee_id]}
        </p>
      )}
      {status === "in_review" &&
        task.reviewer_id &&
        memberNameById[task.reviewer_id] && (
          <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
            <Eye className="w-[14px] h-[14px]" aria-hidden="true" />
            {memberNameById[task.reviewer_id]}
          </p>
        )}
      {checklistLabel && (
        <p className="text-xs text-graphite/70 flex items-center gap-1 mt-0.5">
          <ListChecks className="w-[14px] h-[14px]" aria-hidden="true" />
          {checklistLabel}
        </p>
      )}
    </button>
  );
}

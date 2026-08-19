"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  formatDue,
  priorityBadgeClass,
  priorityLabel,
} from "@/lib/tasks/taskFormatting";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";

type SortKey =
  | "title"
  | "status"
  | "priority"
  | "assignee"
  | "category"
  | "due_date";

type Props = {
  tasks: TaskRow[];
  laneTitleById: Record<TaskStatus, string>;
  memberNameById: Record<string, string>;
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
  onOpen: (task: TaskRow) => void;
};

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "タイトル" },
  { key: "status", label: "ステータス" },
  { key: "priority", label: "優先度" },
  { key: "assignee", label: "担当者" },
  { key: "category", label: "種別" },
  { key: "due_date", label: "期限" },
];

function compareBy(
  key: SortKey,
  laneTitleById: Record<TaskStatus, string>,
  memberNameById: Record<string, string>,
  normalizeStatus: (s: string | null | undefined) => TaskStatus
) {
  return (a: TaskRow, b: TaskRow): number => {
    switch (key) {
      case "title":
        return a.title.localeCompare(b.title, "ja");
      case "status":
        return laneTitleById[normalizeStatus(a.status)].localeCompare(
          laneTitleById[normalizeStatus(b.status)],
          "ja"
        );
      case "priority": {
        const ra = PRIORITY_RANK[a.priority ?? ""] ?? 99;
        const rb = PRIORITY_RANK[b.priority ?? ""] ?? 99;
        return ra - rb;
      }
      case "assignee": {
        const na = (a.assignee_id && memberNameById[a.assignee_id]) || "";
        const nb = (b.assignee_id && memberNameById[b.assignee_id]) || "";
        return na.localeCompare(nb, "ja");
      }
      case "category":
        return (a.category ?? "").localeCompare(b.category ?? "", "ja");
      case "due_date": {
        const da = a.due_date
          ? new Date(a.due_date).getTime()
          : Number.POSITIVE_INFINITY;
        const db = b.due_date
          ? new Date(b.due_date).getTime()
          : Number.POSITIVE_INFINITY;
        return da === db ? 0 : da - db;
      }
    }
  };
}

export default function TableView({
  tasks,
  laneTitleById,
  memberNameById,
  normalizeStatus,
  onOpen,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const sorted = useMemo(() => {
    const cmp = compareBy(sortKey, laneTitleById, memberNameById, normalizeStatus);
    return [...tasks].sort((a, b) => sortDir * cmp(a, b));
  }, [tasks, sortKey, sortDir, laneTitleById, memberNameById, normalizeStatus]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-mist p-6 text-center text-sm text-graphite/70">
        表示できるタスクがありません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-rule bg-paper">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-mist border-b border-rule">
            {COLUMNS.map((col) => (
              <th key={col.key} className="text-left px-3 py-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="font-bold text-ink hover:underline"
                >
                  {col.label}
                  {sortKey === col.key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => {
            const catColor = categoryColor(task.category);
            return (
              <tr
                key={task.id}
                className="border-b border-rule last:border-b-0 hover:bg-mist cursor-pointer"
                onClick={() => onOpen(task)}
              >
                <td className="px-3 py-2 text-ink font-medium">{task.title}</td>
                <td className="px-3 py-2 text-graphite">
                  {laneTitleById[normalizeStatus(task.status)]}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${priorityBadgeClass(task.priority)}`}
                  >
                    {priorityLabel(task.priority)}
                  </span>
                </td>
                <td className="px-3 py-2 text-graphite">
                  {task.assignee_id
                    ? memberNameById[task.assignee_id] ?? "（元メンバー）"
                    : "未定"}
                </td>
                <td className="px-3 py-2 text-graphite">
                  {task.category ? (
                    <span className="inline-flex items-center gap-1.5">
                      {catColor && (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: catColor.hex }}
                          aria-hidden="true"
                        />
                      )}
                      {task.category}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-graphite whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
                    {formatDue(task.due_date)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

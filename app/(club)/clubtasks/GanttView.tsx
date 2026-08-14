"use client";

import { useMemo } from "react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";

type Props = {
  tasks: TaskRow[];
  laneTitleById: Record<TaskStatus, string>;
  laneTintById: Record<TaskStatus, string | null>;
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
};

const DAY_WIDTH = 28;
const LABEL_COL_WIDTH = 200;

function toDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export default function GanttView({
  tasks,
  laneTitleById,
  laneTintById,
  normalizeStatus,
}: Props) {
  const rows = useMemo(() => {
    return tasks
      .filter((t): t is TaskRow & { due_date: string } => Boolean(t.due_date))
      .map((t) => {
        const due = toDateOnly(t.due_date);
        const startRaw = t.created_at ? toDateOnly(t.created_at) : due;
        const start = startRaw.getTime() <= due.getTime() ? startRaw : due;
        return { task: t, start, due };
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [tasks]);

  const hiddenCount = tasks.length - rows.length;

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-mist p-6 text-center text-sm text-graphite/70">
        期限が設定されているタスクがありません。ガントチャートには期限のあるタスクのみ表示されます。
      </div>
    );
  }

  const rangeStart = rows.reduce(
    (min, r) => (r.start < min ? r.start : min),
    rows[0].start
  );
  const today = toDateOnly(new Date().toISOString());
  const latestDue = rows.reduce(
    (max, r) => (r.due > max ? r.due : max),
    rows[0].due
  );
  const rangeEnd = latestDue > today ? latestDue : today;
  const totalDays = Math.max(diffDays(rangeStart, rangeEnd) + 1, 1);
  const todayOffset = diffDays(rangeStart, today);

  return (
    <div className="rounded-xl border border-rule bg-paper overflow-hidden">
      {hiddenCount > 0 && (
        <p className="px-4 py-2 text-xs text-graphite/70 border-b border-rule bg-mist">
          期限未設定のタスク{hiddenCount}件は表示していません。
        </p>
      )}
      <div className="overflow-x-auto">
        <div
          className="relative"
          style={{ minWidth: totalDays * DAY_WIDTH + LABEL_COL_WIDTH }}
        >
          <div className="flex border-b border-rule bg-mist">
            <div
              className="shrink-0 px-3 py-2 text-xs font-bold text-graphite/70"
              style={{ width: LABEL_COL_WIDTH }}
            >
              タスク
            </div>
            <div className="relative flex-1" style={{ height: 32 }}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = new Date(rangeStart);
                d.setDate(d.getDate() + i);
                const showLabel =
                  totalDays <= 31 || d.getDate() === 1 || d.getDay() === 1;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full border-l border-rule/60 text-[10px] text-graphite/60 pl-1 pt-1"
                    style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                  >
                    {showLabel ? `${d.getMonth() + 1}/${d.getDate()}` : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {rows.map(({ task, start, due }) => {
            const status = normalizeStatus(task.status);
            const tint = laneTintById[status] ?? "#002B5C";
            const offset = diffDays(rangeStart, start);
            const span = Math.max(diffDays(start, due) + 1, 1);
            return (
              <div key={task.id} className="flex border-b border-rule last:border-b-0">
                <div
                  className="shrink-0 px-3 py-2 text-xs text-ink truncate"
                  style={{ width: LABEL_COL_WIDTH }}
                  title={task.title}
                >
                  {task.title}
                  {task.category && (
                    <span className="ml-1 text-[10px] text-graphite/60">
                      （{task.category}）
                    </span>
                  )}
                </div>
                <div className="relative flex-1" style={{ height: 36 }}>
                  <div
                    className="absolute top-1.5 h-3 rounded-full"
                    style={{
                      left: offset * DAY_WIDTH,
                      width: span * DAY_WIDTH - 4,
                      backgroundColor: tint,
                    }}
                    title={`${laneTitleById[status]}・${task.title}`}
                  />
                </div>
              </div>
            );
          })}

          {todayOffset >= 0 && todayOffset < totalDays && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-ink/60"
              style={{ left: LABEL_COL_WIDTH + todayOffset * DAY_WIDTH }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </div>
  );
}

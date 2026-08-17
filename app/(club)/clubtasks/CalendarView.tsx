"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TaskRow } from "@/lib/types/task";
import { priorityBadgeClass } from "@/lib/tasks/taskFormatting";

type Props = {
  tasks: TaskRow[];
  onOpen: (task: TaskRow) => void;
};

function toDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarView({ tasks, onOpen }: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const key = dateKey(toDateOnly(t.due_date));
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [tasks]);

  const hiddenCount = tasks.filter((t) => !t.due_date).length;

  const weeks = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(
        new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
      );
    }
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }
    return rows;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
  });
  const todayKey = dateKey(toDateOnly(new Date().toISOString()));

  return (
    <div className="rounded-xl border border-rule bg-paper overflow-hidden">
      {hiddenCount > 0 && (
        <p className="px-4 py-2 text-xs text-graphite/70 border-b border-rule bg-mist">
          期限未設定のタスク{hiddenCount}件は表示していません。
        </p>
      )}
      <div className="flex items-center justify-between px-4 py-3 border-b border-rule">
        <button
          type="button"
          onClick={() =>
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))
          }
          className="p-1.5 rounded-lg text-graphite hover:bg-mist"
          aria-label="前の月"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>
        <h3 className="font-bold text-ink font-numeric">{monthLabel}</h3>
        <button
          type="button"
          onClick={() =>
            setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))
          }
          className="p-1.5 rounded-lg text-graphite hover:bg-mist"
          aria-label="次の月"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-rule bg-mist">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className="px-2 py-1.5 text-center text-xs font-bold text-graphite/70"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const inMonth = day.getMonth() === cursor.getMonth();
          const key = dateKey(day);
          const dayTasks = tasksByDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`min-h-[92px] border-b border-r border-rule p-1.5 ${
                inMonth ? "bg-paper" : "bg-mist/50"
              }`}
            >
              <p
                className={`text-xs font-numeric mb-1 ${
                  isToday
                    ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink text-paper"
                    : inMonth
                      ? "text-graphite"
                      : "text-graphite/40"
                }`}
              >
                {day.getDate()}
              </p>
              <div className="space-y-1">
                {dayTasks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpen(t)}
                    className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate ${priorityBadgeClass(t.priority)}`}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

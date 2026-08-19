"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TaskRow } from "@/lib/types/task";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";
import {
  applyDragToRange,
  formatDateOnly,
  parseDateOnly,
  pixelDeltaToDayDelta,
  type DateRange,
  type DragEdge,
} from "@/lib/tasks/dateRangeDrag";
import { layoutWeekSegments, type TaskRange } from "@/lib/tasks/calendarWeekLayout";

type Props = {
  tasks: TaskRow[];
  onOpen: (task: TaskRow) => void;
  onDateRangeChange: (taskId: string, range: DateRange, edge: DragEdge) => void;
  isDragDisabled?: boolean;
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
const DAY_NUM_HEIGHT = 22;
const BAR_HEIGHT = 18;
const BAR_GAP = 3;
const BOTTOM_PAD = 6;
const FALLBACK_BAR_COLOR = "#9AA5B1";

type DragState = {
  taskId: string;
  edge: DragEdge;
  pointerId: number;
  startClientX: number;
  dayWidthPx: number;
  originalRange: DateRange;
};

export default function CalendarView({
  tasks,
  onOpen,
  onDateRangeChange,
  isDragDisabled = false,
}: Props) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [previewRanges, setPreviewRanges] = useState<
    Record<string, DateRange>
  >({});

  const tasksById = useMemo(() => {
    const map = new Map<string, TaskRow>();
    for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  /**
   * ドラッグ開始前の「確定済み」の範囲。start_date優先・無ければcreated_at
   * にフォールバックし、開始日が期限を超えないようクランプ済み（Gantt側と
   * 同じロジック）。ドラッグの`originalRange`には必ずこちらを使う
   * （previewの値を渡すと、そのプレビュー自体が既にクランプ後の値なので
   * 二重クランプにはならないが、pointerdownは新規ドラッグ開始前にしか
   * 発火しないため、この時点のpreviewは常に空＝base値と一致する）。
   */
  const baseRangesById = useMemo(() => {
    const map = new Map<string, DateRange>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      const due = toDateOnly(t.due_date);
      const startRaw = t.start_date
        ? parseDateOnly(t.start_date)
        : t.created_at
          ? toDateOnly(t.created_at)
          : due;
      const start = startRaw.getTime() <= due.getTime() ? startRaw : due;
      map.set(t.id, {
        startDate: formatDateOnly(start),
        dueDate: formatDateOnly(due),
      });
    }
    return map;
  }, [tasks]);

  const taskRanges = useMemo<TaskRange[]>(() => {
    return Array.from(baseRangesById.entries()).map(([id, base]) => {
      const effective = previewRanges[id] ?? base;
      return { id, startDate: effective.startDate, dueDate: effective.dueDate };
    });
  }, [baseRangesById, previewRanges]);

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

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      taskId: string,
      edge: DragEdge,
      range: DateRange
    ) => {
      if (isDragDisabled || drag) return;
      e.stopPropagation();
      const weekRow = e.currentTarget.closest(".cal-week") as HTMLElement | null;
      const dayWidthPx = weekRow ? weekRow.getBoundingClientRect().width / 7 : 0;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        taskId,
        edge,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        dayWidthPx,
        originalRange: range,
      });
    },
    [isDragDisabled, drag]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const deltaPx = e.clientX - drag.startClientX;
      const dayDelta = pixelDeltaToDayDelta(deltaPx, drag.dayWidthPx);
      const nextRange = applyDragToRange(drag.originalRange, drag.edge, dayDelta);
      setPreviewRanges((prev) => ({ ...prev, [drag.taskId]: nextRange }));
    },
    [drag]
  );

  const clearDrag = useCallback((taskId: string) => {
    setDrag(null);
    setPreviewRanges((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      const taskId = drag.taskId;
      const finalRange = previewRanges[taskId];
      const changed =
        finalRange &&
        (finalRange.startDate !== drag.originalRange.startDate ||
          finalRange.dueDate !== drag.originalRange.dueDate);
      if (changed) {
        onDateRangeChange(taskId, finalRange, drag.edge);
      }
      clearDrag(taskId);
    },
    [drag, previewRanges, onDateRangeChange, clearDrag]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      clearDrag(drag.taskId);
    },
    [drag, clearDrag]
  );

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
      {weeks.map((week) => {
        const weekStartIso = dateKey(week[0]);
        const segments = layoutWeekSegments(taskRanges, weekStartIso);
        const maxLane = segments.reduce((m, s) => Math.max(m, s.lane), -1);
        const barsAreaHeight = (maxLane + 1) * (BAR_HEIGHT + BAR_GAP);
        return (
          <div
            key={weekStartIso}
            className="cal-week relative grid grid-cols-7"
            style={{ minHeight: DAY_NUM_HEIGHT + barsAreaHeight + BOTTOM_PAD + 4 }}
          >
            {week.map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const key = dateKey(day);
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`border-b border-r border-rule p-1.5 ${
                    inMonth ? "bg-paper" : "bg-mist/50"
                  }`}
                >
                  <p
                    className={`text-xs font-numeric ${
                      isToday
                        ? "inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink text-paper"
                        : inMonth
                          ? "text-graphite"
                          : "text-graphite/40"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                </div>
              );
            })}
            {segments.map((seg) => {
              const task = tasksById.get(seg.taskId);
              if (!task) return null;
              const catColor = categoryColor(task.category);
              const isDraggingThisTask = drag?.taskId === seg.taskId;
              const range = baseRangesById.get(seg.taskId);
              if (!range) return null;
              return (
                <button
                  key={seg.taskId}
                  type="button"
                  onClick={() => onOpen(task)}
                  className={`absolute text-[10px] leading-tight px-1.5 truncate text-left overflow-hidden ${
                    isDraggingThisTask ? "ring-2 ring-ink/40" : ""
                  }`}
                  style={{
                    left: `${(seg.startCol / 7) * 100}%`,
                    width: `${(seg.span / 7) * 100}%`,
                    top: DAY_NUM_HEIGHT + seg.lane * (BAR_HEIGHT + BAR_GAP),
                    height: BAR_HEIGHT,
                    backgroundColor: catColor?.tint ?? "#F2F4F7",
                    borderTop: `1px solid ${catColor?.border ?? "#C9D2DC"}`,
                    borderBottom: `1px solid ${catColor?.border ?? "#C9D2DC"}`,
                    borderLeft: seg.continuesLeft
                      ? "none"
                      : `3px solid ${catColor?.hex ?? FALLBACK_BAR_COLOR}`,
                    borderRight: seg.continuesRight
                      ? "none"
                      : `1px solid ${catColor?.border ?? "#C9D2DC"}`,
                    borderTopLeftRadius: seg.continuesLeft ? 0 : 4,
                    borderBottomLeftRadius: seg.continuesLeft ? 0 : 4,
                    borderTopRightRadius: seg.continuesRight ? 0 : 4,
                    borderBottomRightRadius: seg.continuesRight ? 0 : 4,
                  }}
                  title={task.title}
                >
                  {task.title}
                  {!isDragDisabled && !seg.continuesLeft && (
                    <div
                      className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown(e, seg.taskId, "start", range);
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      onLostPointerCapture={handlePointerCancel}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {!isDragDisabled && !seg.continuesRight && (
                    <div
                      className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown(e, seg.taskId, "due", range);
                      }}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      onLostPointerCapture={handlePointerCancel}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

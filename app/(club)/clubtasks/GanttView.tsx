"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";
import {
  applyDragToRange,
  formatDateOnly,
  pixelDeltaToDayDelta,
  type DateRange,
  type DragEdge,
} from "@/lib/tasks/dateRangeDrag";

type Props = {
  tasks: TaskRow[];
  laneTitleById: Record<TaskStatus, string>;
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
  onDateRangeChange: (taskId: string, range: DateRange) => void;
  isDragDisabled?: boolean;
};

const DAY_WIDTH = 28;
const LABEL_COL_WIDTH = 200;
const FALLBACK_BAR_COLOR = "#9AA5B1";

function toDateOnly(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

type DragState = {
  taskId: string;
  edge: DragEdge;
  pointerId: number;
  startClientX: number;
  originalRange: DateRange;
};

export default function GanttView({
  tasks,
  laneTitleById,
  normalizeStatus,
  onDateRangeChange,
  isDragDisabled = false,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [previewRanges, setPreviewRanges] = useState<
    Record<string, DateRange>
  >({});

  const rows = useMemo(() => {
    return tasks
      .filter((t): t is TaskRow & { due_date: string } => Boolean(t.due_date))
      .map((t) => {
        const due = toDateOnly(t.due_date);
        const startSource = t.start_date ?? t.created_at ?? null;
        const startRaw = startSource ? toDateOnly(startSource) : due;
        const start = startRaw.getTime() <= due.getTime() ? startRaw : due;
        return { task: t, start, due };
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [tasks]);

  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      taskId: string,
      edge: DragEdge,
      range: DateRange
    ) => {
      if (isDragDisabled || drag) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({
        taskId,
        edge,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        originalRange: range,
      });
    },
    [isDragDisabled, drag]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const deltaPx = e.clientX - drag.startClientX;
      const dayDelta = pixelDeltaToDayDelta(deltaPx, DAY_WIDTH);
      const nextRange = applyDragToRange(
        drag.originalRange,
        drag.edge,
        dayDelta
      );
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
        onDateRangeChange(taskId, finalRange);
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
            const catColor = categoryColor(task.category);
            const barColor = catColor?.hex ?? FALLBACK_BAR_COLOR;
            const baseRange: DateRange = {
              startDate: formatDateOnly(start),
              dueDate: formatDateOnly(due),
            };
            const effectiveRange = previewRanges[task.id] ?? baseRange;
            const effectiveStart = toDateOnly(effectiveRange.startDate);
            const effectiveDue = toDateOnly(effectiveRange.dueDate);
            const offset = diffDays(rangeStart, effectiveStart);
            const span = Math.max(diffDays(effectiveStart, effectiveDue) + 1, 1);
            const isDraggingThisTask = drag?.taskId === task.id;
            return (
              <div key={task.id} className="flex border-b border-rule last:border-b-0">
                <div
                  className="shrink-0 px-3 py-2 text-xs text-ink truncate"
                  style={{ width: LABEL_COL_WIDTH }}
                  title={task.title}
                >
                  {task.title}
                  {task.category && catColor && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-graphite/60">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: catColor.hex }}
                        aria-hidden="true"
                      />
                      （{task.category}）
                    </span>
                  )}
                </div>
                <div className="relative flex-1" style={{ height: 36 }}>
                  <div
                    className={`absolute top-1.5 h-3 rounded-full flex items-center justify-center ${
                      isDraggingThisTask ? "ring-2 ring-ink/40" : ""
                    }`}
                    style={{
                      left: offset * DAY_WIDTH,
                      width: span * DAY_WIDTH - 4,
                      backgroundColor: barColor,
                    }}
                    title={`${laneTitleById[status]}・${task.title}`}
                  >
                    {status === "done" && (
                      <CheckCircle2
                        className="w-[10px] h-[10px] text-paper"
                        aria-hidden="true"
                      />
                    )}
                    {!isDragDisabled && (
                      <>
                        <div
                          className="absolute -left-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                          onPointerDown={(e) =>
                            handlePointerDown(e, task.id, "start", baseRange)
                          }
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerCancel}
                          onLostPointerCapture={handlePointerCancel}
                          aria-label={`${task.title}の開始日を変更`}
                        />
                        <div
                          className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize touch-none"
                          onPointerDown={(e) =>
                            handlePointerDown(e, task.id, "due", baseRange)
                          }
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerCancel}
                          onLostPointerCapture={handlePointerCancel}
                          aria-label={`${task.title}の期限を変更`}
                        />
                      </>
                    )}
                  </div>
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

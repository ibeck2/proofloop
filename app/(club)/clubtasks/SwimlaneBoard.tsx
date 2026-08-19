"use client";

import { useMemo } from "react";
import { Droppable } from "@hello-pangea/dnd";
import { CheckCircle2 } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import {
  encodeSwimlaneDroppableId,
  groupTasksIntoSwimlanes,
  UNASSIGNED_SWIMLANE_KEY,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import { categoryColor } from "@/lib/tasks/taskCategoryColor";
import DraggableTaskCard from "./DraggableTaskCard";

type LaneMeta = { id: TaskStatus; title: string };

type Props = {
  tasks: TaskRow[];
  axis: SwimlaneAxis;
  lanes: LaneMeta[];
  laneTintById: Record<TaskStatus, string | null>;
  whiteTextLanes: TaskStatus[];
  normalizeStatus: (s: string | null | undefined) => TaskStatus;
  sortTasksInLane: (a: TaskRow, b: TaskRow) => number;
  memberNameById: Record<string, string>;
  checklistCountByTaskId: Record<string, { done: number; total: number }>;
  onOpen: (task: TaskRow) => void;
  isDropDisabled: boolean;
  isDragDisabled?: boolean;
};

function rowLabel(
  key: string,
  axis: SwimlaneAxis,
  memberNameById: Record<string, string>
): string {
  if (key === UNASSIGNED_SWIMLANE_KEY) {
    return axis === "category" ? "種別未設定" : "担当者未定";
  }
  return axis === "category" ? key : memberNameById[key] ?? "（元メンバー）";
}

export default function SwimlaneBoard({
  tasks,
  axis,
  lanes,
  laneTintById,
  whiteTextLanes,
  normalizeStatus,
  sortTasksInLane,
  memberNameById,
  checklistCountByTaskId,
  onOpen,
  isDropDisabled,
  isDragDisabled = false,
}: Props) {
  const rows = useMemo(() => {
    const statuses = lanes.map((l) => l.id);
    return groupTasksIntoSwimlanes(
      tasks,
      axis,
      statuses,
      normalizeStatus,
      sortTasksInLane
    );
  }, [tasks, axis, lanes, normalizeStatus, sortTasksInLane]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-rule bg-mist p-6 text-center text-sm text-graphite/70">
        表示できるタスクがありません。
      </div>
    );
  }

  return (
    <div className="min-w-max px-2 space-y-6">
      {rows.map((row) => {
        const catColor =
          axis === "category" && row.key !== UNASSIGNED_SWIMLANE_KEY
            ? categoryColor(row.key)
            : null;
        return (
        <div
          key={row.key}
          className="rounded-xl border border-rule overflow-hidden"
        >
          <div
            className={`px-4 py-2 bg-mist border-b border-rule ${
              catColor ? "border-l-4" : ""
            }`}
            style={catColor ? { borderLeftColor: catColor.hex } : undefined}
          >
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              {catColor && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: catColor.hex }}
                  aria-hidden="true"
                />
              )}
              {rowLabel(row.key, axis, memberNameById)}
            </h3>
          </div>
          <div className="flex gap-4 p-3 overflow-x-auto">
            {lanes.map((lane) => {
              const isDone = lane.id === "done";
              const tint = laneTintById[lane.id];
              const whiteText = whiteTextLanes.includes(lane.id);
              const items = row.tasksByStatus[lane.id] ?? [];
              const droppableId = encodeSwimlaneDroppableId(row.key, lane.id);

              return (
                <div
                  key={lane.id}
                  className="w-[280px] flex-shrink-0 rounded-lg border border-rule bg-mist overflow-hidden flex flex-col"
                >
                  <div
                    className={`px-3 py-2 border-b border-rule bg-paper shrink-0 border-l-4 ${
                      isDone ? "border-l-ink" : ""
                    }`}
                    style={tint ? { borderLeftColor: tint } : undefined}
                  >
                    <h4 className="font-bold text-xs flex items-center gap-2">
                      {isDone && (
                        <CheckCircle2
                          className="w-[14px] h-[14px] text-ink shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-ink">{lane.title}</span>
                      <span
                        className="inline-flex items-center justify-center min-w-[1.5rem] px-1 py-0.5 rounded-full text-[10px] font-bold font-numeric tabular-nums"
                        style={{
                          backgroundColor: isDone ? "#002B5C" : tint ?? undefined,
                          color: whiteText ? "#FFFFFF" : "#002B5C",
                        }}
                      >
                        （{items.length}）
                      </span>
                    </h4>
                  </div>
                  <Droppable
                    droppableId={droppableId}
                    isDropDisabled={isDropDisabled}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="p-2 space-y-2 min-h-[100px] flex-1"
                      >
                        {items.map((task, index) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            index={index}
                            status={lane.id}
                            isDone={isDone}
                            tint={tint}
                            memberNameById={memberNameById}
                            checklistCountByTaskId={checklistCountByTaskId}
                            onOpen={onOpen}
                            isDragDisabled={isDragDisabled}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}

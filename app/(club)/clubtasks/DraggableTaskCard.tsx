"use client";

import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import TaskCardBody from "./TaskCardBody";

type Props = {
  task: TaskRow;
  index: number;
  status: TaskStatus;
  isDone: boolean;
  tint: string | null;
  memberNameById: Record<string, string>;
  onOpen: (task: TaskRow) => void;
};

export default function DraggableTaskCard({
  task,
  index,
  status,
  isDone,
  tint,
  memberNameById,
  onOpen,
}: Props) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(draggableProvided, snapshot) => (
        <div
          ref={draggableProvided.innerRef}
          {...draggableProvided.draggableProps}
          className={`rounded-lg border border-rule border-l-4 bg-paper transition-shadow flex ${
            isDone ? "border-l-ink" : ""
          } ${
            snapshot.isDragging
              ? "shadow-xl opacity-95 scale-[1.02] ring-2 ring-ink/30 z-50"
              : "shadow-sm hover:shadow-md"
          }`}
          style={!isDone && tint ? { borderLeftColor: tint } : undefined}
        >
          <div
            {...draggableProvided.dragHandleProps}
            className="flex-shrink-0 p-2 self-start cursor-grab active:cursor-grabbing text-graphite/70 hover:text-graphite touch-none"
            onClick={(e) => e.stopPropagation()}
            aria-label="ドラッグして移動"
          >
            <GripVertical className="w-5 h-5" aria-hidden="true" />
          </div>
          <TaskCardBody
            task={task}
            status={status}
            memberNameById={memberNameById}
            onOpen={onOpen}
          />
        </div>
      )}
    </Draggable>
  );
}

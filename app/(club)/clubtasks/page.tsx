"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@/components/ui";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

const LANES: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "未対応" },
  { id: "in_progress", title: "進行中" },
  { id: "done", title: "完了" },
];

const PRIORITY_OPTIONS = [
  { value: "高", label: "高" },
  { value: "中", label: "中" },
  { value: "低", label: "低" },
] as const;

function normalizeStatus(s: string | null | undefined): TaskStatus {
  const v = (s || "todo").toLowerCase().trim();
  if (v === "in_progress" || v === "progress" || v === "doing") return "in_progress";
  if (v === "done" || v === "completed" || v === "complete") return "done";
  if (v === "todo" || v === "pending" || v === "未対応") return "todo";
  return "todo";
}

function priorityBadgeClass(priority: string | null | undefined): string {
  switch (priority) {
    case "高":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
    case "中":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "低":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    default:
      return "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600";
  }
}

function sortTasksInLane(a: TaskRow, b: TaskRow): number {
  const da = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
  const db = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
  const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
  if (ca !== cb) return cb - ca;
  return (b.id || "").localeCompare(a.id || "");
}

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "中",
  due_date: "",
};

export default function ClubTasksPage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, due_date"
      )
      .eq("organization_id", orgId);

    if (error) {
      console.error("tasks fetch error:", error);
      toast.error("タスクの読み込みに失敗しました");
      setTasks([]);
      return;
    }
    setTasks((data as TaskRow[]) ?? []);
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadTasks();
  }, [orgId, loadTasks]);

  const tasksByLane = useMemo(() => {
    return LANES.map((lane) => ({
      lane,
      items: tasks
        .filter((t) => normalizeStatus(t.status) === lane.id)
        .sort(sortTasksInLane),
    }));
  }, [tasks]);

  const openNewModal = () => {
    setEditingTask(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  };

  const openEditModal = (task: TaskRow) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description ?? "",
      status: normalizeStatus(task.status),
      priority: task.priority && ["高", "中", "低"].includes(task.priority) ? task.priority : "中",
      due_date: task.due_date
        ? task.due_date.slice(0, 10)
        : "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTask(null);
    setForm(emptyForm);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    const title = form.title.trim();
    if (!title) {
      toast.error("タイトルは必須です");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        title,
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority || null,
        due_date: form.due_date || null,
        assignee_id: editingTask?.assignee_id ?? null,
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            due_date: payload.due_date,
          })
          .eq("id", editingTask.id);
        if (error) throw error;
        toast.success("タスクを更新しました");
      } else {
        const { error } = await supabase.from("tasks").insert({
          ...payload,
          assignee_id: null,
        });
        if (error) throw error;
        toast.success("タスクを追加しました");
      }
      await loadTasks();
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const task = tasks.find((t) => t.id === draggableId);
      if (!task) return;

      const fromLane = source.droppableId as TaskStatus;
      const toLane = destination.droppableId as TaskStatus;

      if (fromLane === toLane) {
        const laneTasks = tasks
          .filter((t) => normalizeStatus(t.status) === fromLane)
          .sort(sortTasksInLane);
        const reordered = reorder(laneTasks, source.index, destination.index);
        const others = tasks.filter(
          (t) => normalizeStatus(t.status) !== fromLane
        );
        setTasks([...others, ...reordered]);
        return;
      }

      const newStatus = toLane;
      const prevTasks = tasks;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggableId ? { ...t, status: newStatus } : t
        )
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", draggableId);

      if (error) {
        setTasks(prevTasks);
        toast.error("ステータスの更新に失敗しました");
        return;
      }
      toast.success("移動しました");
    },
    [tasks]
  );

  const formatDue = (iso: string | null | undefined) => {
    if (!iso) return "期限なし";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (ctxLoading) {
    return (
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500 dark:text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!ctxLoading && (hasNoMemberships || !isReady || !orgId)) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            管理できる団体がありません
          </p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            プロフィール編集で団体を登録してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            タスク管理
          </h1>
          {orgName && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {orgName} の業務タスク
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={openNewModal}
          className="inline-flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          ＋ 新規タスク追加
        </Button>
      </div>

      <div className="overflow-x-auto pb-4 -mx-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max px-2">
            {tasksByLane.map(({ lane, items }) => (
              <div
                key={lane.id}
                className="w-[300px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden flex flex-col"
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                    <span>{lane.title}</span>
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                      （{items.length}）
                    </span>
                  </h2>
                </div>
                <Droppable droppableId={lane.id}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="p-3 space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto flex-1 min-h-[120px]"
                    >
                      {items.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                        >
                          {(draggableProvided, snapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              className={`rounded-lg border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 transition-shadow flex ${
                                snapshot.isDragging
                                  ? "shadow-xl opacity-95 scale-[1.02] ring-2 ring-primary/30 z-50"
                                  : "shadow-sm hover:shadow-md"
                              }`}
                            >
                              <div
                                {...draggableProvided.dragHandleProps}
                                className="flex-shrink-0 p-2 self-start cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="ドラッグして移動"
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  drag_indicator
                                </span>
                              </div>
                              <button
                                type="button"
                                className="flex-1 min-w-0 p-3 pr-4 pt-3 text-left"
                                onClick={() => openEditModal(task)}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="font-medium text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                                    {task.title}
                                  </p>
                                  <span
                                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded border ${priorityBadgeClass(
                                      task.priority
                                    )}`}
                                  >
                                    {task.priority || "—"}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">
                                    calendar_today
                                  </span>
                                  {formatDue(task.due_date)}
                                </p>
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
              <h2
                id="task-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                {editingTask ? "タスクを編集" : "新規タスク"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="閉じる"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  タイトル<span className="text-red-500"> *</span>
                </label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="タスクのタイトル"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  詳細説明
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="補足・手順など"
                  rows={4}
                  disabled={saving}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ステータス
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as TaskStatus,
                      }))
                    }
                    disabled={saving}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="todo">未対応</option>
                    <option value="in_progress">進行中</option>
                    <option value="done">完了</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    優先度
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priority: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {PRIORITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  期限
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outlineMuted"
                  onClick={closeModal}
                  disabled={saving}
                >
                  キャンセル
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

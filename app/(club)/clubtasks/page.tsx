"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Plus, GripVertical, CalendarDays, CheckCircle2, X } from "lucide-react";
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

/**
 * 優先度は装飾ではなく意味なので、色相ではなく紺の濃淡で表す。
 * 全部同じ見た目にすると、かんばん上で高優先のタスクを一目で拾えなくなる。
 * clubats/page.tsx と同じ定義（ファイル間で共有モジュールを増やさないためここでも定義）。
 */
const PRIORITY_BADGE_CLASS: Record<string, string> = {
  高: "border border-ink bg-ink text-paper",
  中: "border border-rule bg-mist text-ink",
  低: "border border-rule bg-paper text-graphite",
};
const DEFAULT_PRIORITY_BADGE_CLASS = "border border-rule bg-paper text-graphite";

function priorityBadgeClass(priority: string | null | undefined): string {
  return PRIORITY_BADGE_CLASS[priority ?? ""] ?? DEFAULT_PRIORITY_BADGE_CLASS;
}

/**
 * ステータスの配色は clubats のファネル配色と同じ言語を使う：
 * 未対応＝紺の最も薄い階調、進行中＝中間階調、完了＝ink（最終形）＋チェックアイコン。
 * components/home/OrganizationField.tsx で使っている4階調のうちの2つを流用する。
 */
const STATUS_TINT: Record<TaskStatus, string | null> = {
  todo: "#AEBFD0",
  in_progress: "#7391AF",
  done: null, // ink 固定（Tailwindクラスで指定）
};

function normalizeStatus(s: string | null | undefined): TaskStatus {
  const v = (s || "todo").toLowerCase().trim();
  if (v === "in_progress" || v === "progress" || v === "doing") return "in_progress";
  if (v === "done" || v === "completed" || v === "complete") return "done";
  if (v === "todo" || v === "pending" || v === "未対応") return "todo";
  return "todo";
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
          <p className="text-graphite/70">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!ctxLoading && (hasNoMemberships || !isReady || !orgId)) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-rule border-l-4 border-l-seal bg-mist p-6 text-center">
          <p className="text-ink font-medium">
            管理できる団体がありません
          </p>
          <p className="text-graphite text-sm mt-1">
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
          <h1 className="text-2xl font-bold text-ink font-mincho">
            タスク管理
          </h1>
          {orgName && (
            <p className="text-graphite text-sm mt-1">
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
          <Plus className="w-5 h-5" aria-hidden="true" />
          ＋ 新規タスク追加
        </Button>
      </div>

      <div className="overflow-x-auto pb-4 -mx-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max px-2">
            {tasksByLane.map(({ lane, items }) => {
              const isDone = lane.id === "done";
              const tint = STATUS_TINT[lane.id];

              return (
                <div
                  key={lane.id}
                  className="w-[300px] flex-shrink-0 rounded-xl border border-rule bg-mist overflow-hidden flex flex-col"
                >
                  <div
                    className={`px-4 py-3 border-b border-rule bg-paper shrink-0 border-l-4 ${
                      isDone ? "border-l-ink" : ""
                    }`}
                    style={tint ? { borderLeftColor: tint } : undefined}
                  >
                    <h2 className="font-bold text-sm flex items-center gap-2">
                      {isDone && <CheckCircle2 className="w-[18px] h-[18px] text-ink shrink-0" aria-hidden="true" />}
                      <span className="text-ink">{lane.title}</span>
                      <span
                        className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-xs font-bold font-numeric tabular-nums"
                        style={{
                          backgroundColor: isDone ? "#002B5C" : tint ?? undefined,
                          color: isDone || lane.id === "in_progress" ? "#FFFFFF" : "#002B5C",
                        }}
                      >
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
                                <button
                                  type="button"
                                  className="flex-1 min-w-0 p-3 pr-4 pt-3 text-left"
                                  onClick={() => openEditModal(task)}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-medium text-ink text-sm leading-snug line-clamp-2">
                                      {task.title}
                                    </p>
                                    <span
                                      className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${priorityBadgeClass(task.priority)}`}
                                    >
                                      {task.priority || "—"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-graphite/70 flex items-center gap-1">
                                    <CalendarDays className="w-[14px] h-[14px]" aria-hidden="true" />
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
              );
            })}
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
            className="w-full max-w-lg rounded-xl bg-paper border border-rule shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-rule flex items-center justify-between gap-4">
              <h2
                id="task-modal-title"
                className="text-lg font-bold text-ink"
              >
                {editingTask ? "タスクを編集" : "新規タスク"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg text-graphite hover:bg-mist"
                aria-label="閉じる"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-ink mb-1">
                  タイトル<span className="text-ink"> *</span>
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
                <label className="block text-sm font-bold text-ink mb-1">
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
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
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
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  >
                    <option value="todo">未対応</option>
                    <option value="in_progress">進行中</option>
                    <option value="done">完了</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    優先度
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, priority: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
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
                <label className="block text-sm font-bold text-ink mb-1">
                  期限
                </label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, due_date: e.target.value }))
                  }
                  disabled={saving}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
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

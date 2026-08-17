"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import { Plus, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@/components/ui";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import {
  shouldNotifyReviewAssigned,
  shouldNotifyAssigneeChanged,
} from "@/lib/tasks/taskNotificationTriggers";
import {
  decodeSwimlaneDroppableId,
  resolveSwimlaneRowChange,
  swimlaneRowKeyForTask,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import ChecklistSection from "./ChecklistSection";
import GanttView from "./GanttView";
import TableView from "./TableView";
import CalendarView from "./CalendarView";
import DraggableTaskCard from "./DraggableTaskCard";
import SwimlaneBoard from "./SwimlaneBoard";

const LANES: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "未対応" },
  { id: "in_progress", title: "進行中" },
  { id: "in_review", title: "レビュー待ち" },
  { id: "on_hold", title: "保留中" },
  { id: "done", title: "完了" },
];

const LANE_TITLE_BY_ID = Object.fromEntries(
  LANES.map((l) => [l.id, l.title])
) as Record<TaskStatus, string>;

/** バッジ・レーンヘッダーの円で白文字にするレーン（背景が濃い） */
const WHITE_TEXT_LANES: TaskStatus[] = ["in_progress", "in_review", "done"];

/**
 * DBの tasks_priority_check 制約は low/medium/high の英語canonical値のみを許可する。
 * status（todo/in_progress/done）と同じパターンで、DBは英語・UIは日本語ラベルに分離する。
 * 以前はここが日本語（高/中/低）のまま送信されており、制約違反で新規タスクの保存が常に失敗していた。
 */
const PRIORITY_OPTIONS = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
] as const;

/**
 * ステータスの配色は clubats のファネル配色と同じ言語を使う：
 * 未対応＝紺の最も薄い階調、進行中＝中間階調、完了＝ink（最終形）＋チェックアイコン。
 * components/home/OrganizationField.tsx で使っている4階調のうちの2つを流用する。
 */
const STATUS_TINT: Record<TaskStatus, string | null> = {
  todo: "#AEBFD0",
  in_progress: "#7391AF",
  in_review: "#4F6E91",
  on_hold: "#9AA5B1",
  done: null, // ink 固定（Tailwindクラスで指定）
};

function normalizeStatus(s: string | null | undefined): TaskStatus {
  const v = (s || "todo").toLowerCase().trim();
  if (v === "in_review" || v === "review" || v === "レビュー待ち") return "in_review";
  if (v === "on_hold" || v === "hold" || v === "paused" || v === "保留中") return "on_hold";
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
  priority: "medium",
  due_date: "",
  assignee_id: "",
  reviewer_id: "",
  category: "",
};

type MemberOption = { user_id: string; name: string; title: string | null; email: string | null };

function formatMemberOption(m: MemberOption): string {
  return m.title ? `${m.name}（${m.title}）` : m.name;
}

export default function ClubTasksPage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [view, setView] = useState<"kanban" | "gantt" | "table" | "calendar">(
    "kanban"
  );
  const [swimlaneAxis, setSwimlaneAxis] = useState<SwimlaneAxis | "flat">(
    "flat"
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checklistCountByTaskId, setChecklistCountByTaskId] = useState<
    Record<string, { done: number; total: number }>
  >({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const loadTasks = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, created_at"
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

  const loadMembers = useCallback(async () => {
    if (!orgId) return;
    const { data: memData, error: memErr } = await supabase
      .from("organization_members")
      .select("user_id, title")
      .eq("organization_id", orgId);
    if (memErr || !memData) {
      console.error("members fetch error:", memErr);
      setMembers([]);
      return;
    }
    const titleByUserId: Record<string, string | null> = {};
    for (const m of memData as Array<{ user_id: string; title: string | null }>) {
      titleByUserId[m.user_id] = m.title;
    }
    const ids = memData.map((m) => m.user_id).filter(Boolean);
    if (ids.length === 0) {
      setMembers([]);
      return;
    }
    const { data: profData, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, display_name, email")
      .in("id", ids);
    if (profErr || !profData) {
      console.error("profiles fetch error:", profErr);
      setMembers([]);
      return;
    }
    setMembers(
      (
        profData as Array<{
          id: string;
          full_name: string | null;
          display_name: string | null;
          email: string | null;
        }>
      ).map((p) => ({
        user_id: p.id,
        name: p.full_name?.trim() || p.display_name?.trim() || "（氏名未設定）",
        title: titleByUserId[p.id]?.trim() || null,
        email: p.email?.trim() || null,
      }))
    );
  }, [orgId]);

  const loadChecklistCounts = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("task_checklist_items")
      .select("task_id, is_done")
      .eq("organization_id", orgId);
    if (error) {
      console.error("checklist counts fetch error:", error);
      return;
    }
    const counts: Record<string, { done: number; total: number }> = {};
    for (const row of (data as Array<{ task_id: string; is_done: boolean }>) ?? []) {
      const c = counts[row.task_id] ?? { done: 0, total: 0 };
      c.total += 1;
      if (row.is_done) c.done += 1;
      counts[row.task_id] = c;
    }
    setChecklistCountByTaskId(counts);
  }, [orgId]);

  useEffect(() => {
    if (orgId) {
      loadTasks();
      loadMembers();
      loadChecklistCounts();
    }
  }, [orgId, loadTasks, loadMembers, loadChecklistCounts]);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.user_id] = formatMemberOption(m);
    return map;
  }, [members]);

  const memberEmailById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) {
      if (m.email) map[m.user_id] = m.email;
    }
    return map;
  }, [members]);

  const handleChecklistCountChange = useCallback(
    (taskId: string, done: number, total: number) => {
      setChecklistCountByTaskId((prev) => ({
        ...prev,
        [taskId]: { done, total },
      }));
    },
    []
  );

  const notifyTaskChange = useCallback(
    async (params: {
      type: "task_review_assigned" | "task_assignee_changed";
      recipientId: string;
      taskTitle: string;
    }) => {
      if (!orgId || !orgName) return;
      if (!currentUserId) return;
      const email = memberEmailById[params.recipientId];
      if (!email) return;

      const { data: enabled, error } = await supabase.rpc(
        "is_notification_enabled",
        {
          p_user_id: params.recipientId,
          p_notification_type: params.type,
          p_organization_id: orgId,
        }
      );
      if (error) {
        console.error("is_notification_enabled error:", error);
        // フェイルセーフ：判定に失敗しても通知を止めない（既定ON）
      } else if (enabled === false) {
        return;
      }

      const actorName = memberNameById[currentUserId] || "運営メンバー";
      const {
        data: { session },
      } = await supabase.auth.getSession();
      fetch("/api/emails/task-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : "",
        },
        body: JSON.stringify({
          type: params.type,
          email,
          recipientName: memberNameById[params.recipientId] ?? "メンバー",
          actorName,
          taskTitle: params.taskTitle,
          organizationName: orgName,
        }),
      }).catch((err) => {
        console.error("task-notification email error:", err);
      });
    },
    [orgId, orgName, memberEmailById, memberNameById, currentUserId]
  );

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        tasks
          .map((t) => t.category?.trim())
          .filter((c): c is string => Boolean(c))
      )
    );
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    if (!categoryFilter) return tasks;
    return tasks.filter((t) => (t.category ?? "").trim() === categoryFilter);
  }, [tasks, categoryFilter]);

  const tasksByLane = useMemo(() => {
    return LANES.map((lane) => ({
      lane,
      items: visibleTasks
        .filter((t) => normalizeStatus(t.status) === lane.id)
        .sort(sortTasksInLane),
    }));
  }, [visibleTasks]);

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
      priority: task.priority && ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
      due_date: task.due_date
        ? task.due_date.slice(0, 10)
        : "",
      assignee_id: task.assignee_id ?? "",
      reviewer_id: task.reviewer_id ?? "",
      category: task.category ?? "",
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
        assignee_id: form.assignee_id || null,
        reviewer_id: form.reviewer_id || null,
        category: form.category.trim() || null,
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
            assignee_id: payload.assignee_id,
            reviewer_id: payload.reviewer_id,
            category: payload.category,
          })
          .eq("id", editingTask.id);
        if (error) throw error;
        toast.success("タスクを更新しました");

        const prevReview = {
          status: normalizeStatus(editingTask.status),
          reviewerId: editingTask.reviewer_id,
        };
        const nextReview = {
          status: payload.status,
          reviewerId: payload.reviewer_id,
        };
        if (shouldNotifyReviewAssigned(prevReview, nextReview, currentUserId)) {
          void notifyTaskChange({
            type: "task_review_assigned",
            recipientId: payload.reviewer_id!,
            taskTitle: payload.title,
          });
        }

        const prevAssignee = { assigneeId: editingTask.assignee_id };
        const nextAssignee = { assigneeId: payload.assignee_id };
        if (shouldNotifyAssigneeChanged(prevAssignee, nextAssignee, currentUserId)) {
          void notifyTaskChange({
            type: "task_assignee_changed",
            recipientId: payload.assignee_id!,
            taskTitle: payload.title,
          });
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("tasks").insert({
          ...payload,
          created_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success("タスクを追加しました");

        const nextReview = {
          status: payload.status,
          reviewerId: payload.reviewer_id,
        };
        if (shouldNotifyReviewAssigned(null, nextReview, currentUserId)) {
          void notifyTaskChange({
            type: "task_review_assigned",
            recipientId: payload.reviewer_id!,
            taskTitle: payload.title,
          });
        }

        const nextAssignee = { assigneeId: payload.assignee_id };
        if (shouldNotifyAssigneeChanged(null, nextAssignee, currentUserId)) {
          void notifyTaskChange({
            type: "task_assignee_changed",
            recipientId: payload.assignee_id!,
            taskTitle: payload.title,
          });
        }
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

      const sourceDecoded = decodeSwimlaneDroppableId(source.droppableId);
      const destDecoded = decodeSwimlaneDroppableId(destination.droppableId);

      const fromLane = sourceDecoded
        ? sourceDecoded.status
        : (source.droppableId as TaskStatus);
      const toLane = destDecoded
        ? destDecoded.status
        : (destination.droppableId as TaskStatus);
      const fromRowKey = sourceDecoded?.rowKey ?? null;
      const toRowKey = destDecoded?.rowKey ?? null;

      const sameLane = fromLane === toLane;
      const sameRow = fromRowKey === toRowKey;

      if (sameLane && sameRow) {
        const laneTasks = tasks
          .filter((t) => normalizeStatus(t.status) === fromLane)
          .filter((t) =>
            swimlaneAxis === "flat" || fromRowKey === null
              ? true
              : swimlaneRowKeyForTask(t, swimlaneAxis) === fromRowKey
          )
          .sort(sortTasksInLane);
        const reordered = reorder(laneTasks, source.index, destination.index);
        const laneTaskIds = new Set(laneTasks.map((t) => t.id));
        const others = tasks.filter((t) => !laneTaskIds.has(t.id));
        setTasks([...others, ...reordered]);
        return;
      }

      const newStatus = toLane;
      const rowChange: Partial<Pick<TaskRow, "category" | "assignee_id">> =
        destDecoded && swimlaneAxis !== "flat" && !sameRow
          ? resolveSwimlaneRowChange(swimlaneAxis, destDecoded.rowKey)
          : {};

      const prevTasks = tasks;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggableId ? { ...t, status: newStatus, ...rowChange } : t
        )
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, ...rowChange })
        .eq("id", draggableId);

      if (error) {
        setTasks(prevTasks);
        toast.error("移動に失敗しました");
        return;
      }

      const prevReview = {
        status: normalizeStatus(task.status),
        reviewerId: task.reviewer_id,
      };
      const nextReview = { status: newStatus, reviewerId: task.reviewer_id };
      if (shouldNotifyReviewAssigned(prevReview, nextReview, currentUserId)) {
        void notifyTaskChange({
          type: "task_review_assigned",
          recipientId: task.reviewer_id!,
          taskTitle: task.title,
        });
      }

      const prevAssignee = { assigneeId: task.assignee_id };
      const nextAssignee = {
        assigneeId:
          "assignee_id" in rowChange
            ? (rowChange.assignee_id ?? null)
            : task.assignee_id,
      };
      if (shouldNotifyAssigneeChanged(prevAssignee, nextAssignee, currentUserId)) {
        void notifyTaskChange({
          type: "task_assignee_changed",
          recipientId: nextAssignee.assigneeId!,
          taskTitle: task.title,
        });
      }

      toast.success("移動しました");
    },
    [tasks, notifyTaskChange, currentUserId, swimlaneAxis]
  );

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
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          新規タスク追加
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="category-filter" className="text-sm text-graphite/70 shrink-0">
            種別で絞り込み
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-rule rounded-lg px-2 py-1.5 text-sm bg-paper text-ink"
          >
            <option value="">すべて</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {view === "kanban" && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="swimlane-axis"
              className="text-sm text-graphite/70 shrink-0"
            >
              グルーピング
            </label>
            <select
              id="swimlane-axis"
              value={swimlaneAxis}
              onChange={(e) =>
                setSwimlaneAxis(e.target.value as SwimlaneAxis | "flat")
              }
              className="border border-rule rounded-lg px-2 py-1.5 text-sm bg-paper text-ink"
            >
              <option value="flat">フラット</option>
              <option value="category">種別ごと</option>
              <option value="assignee">担当者ごと</option>
            </select>
          </div>
        )}
        <div className="inline-flex rounded-lg border border-rule overflow-hidden shrink-0 w-fit flex-wrap">
          {(
            [
              { id: "kanban", label: "カンバン" },
              { id: "table", label: "表" },
              { id: "calendar", label: "カレンダー" },
              { id: "gantt", label: "ガントチャート" },
            ] as const
          ).map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 text-sm font-medium ${
                i > 0 ? "border-l border-rule" : ""
              } ${
                view === v.id
                  ? "bg-ink text-paper"
                  : "bg-paper text-graphite hover:bg-mist"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === "gantt" ? (
        <GanttView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          laneTintById={STATUS_TINT}
          normalizeStatus={normalizeStatus}
        />
      ) : view === "calendar" ? (
        <CalendarView tasks={visibleTasks} onOpen={openEditModal} />
      ) : view === "table" ? (
        <TableView
          tasks={visibleTasks}
          laneTitleById={LANE_TITLE_BY_ID}
          memberNameById={memberNameById}
          normalizeStatus={normalizeStatus}
          onOpen={openEditModal}
        />
      ) : (
      <div className="overflow-x-auto pb-4 -mx-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          {swimlaneAxis === "flat" ? (
            <div className="flex gap-4 min-w-max px-2">
              {tasksByLane.map(({ lane, items }) => {
                const isDone = lane.id === "done";
                const tint = STATUS_TINT[lane.id];
                const whiteText = WHITE_TEXT_LANES.includes(lane.id);

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
                            color: whiteText ? "#FFFFFF" : "#002B5C",
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
                            <DraggableTaskCard
                              key={task.id}
                              task={task}
                              index={index}
                              status={lane.id}
                              isDone={isDone}
                              tint={tint}
                              memberNameById={memberNameById}
                              checklistCountByTaskId={checklistCountByTaskId}
                              onOpen={openEditModal}
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
          ) : (
            <SwimlaneBoard
              tasks={visibleTasks}
              axis={swimlaneAxis}
              lanes={LANES}
              laneTintById={STATUS_TINT}
              whiteTextLanes={WHITE_TEXT_LANES}
              normalizeStatus={normalizeStatus}
              sortTasksInLane={sortTasksInLane}
              memberNameById={memberNameById}
              checklistCountByTaskId={checklistCountByTaskId}
              onOpen={openEditModal}
            />
          )}
        </DragDropContext>
      </div>
      )}

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
              {editingTask && editingTask.created_by && (
                <p className="text-xs text-graphite/70">
                  作成者：{memberNameById[editingTask.created_by] ?? "（元メンバー）"}
                </p>
              )}
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
                    <option value="in_review">レビュー待ち</option>
                    <option value="on_hold">保留中</option>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    担当者
                  </label>
                  <select
                    value={form.assignee_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, assignee_id: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  >
                    <option value="">未定</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {formatMemberOption(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    種別
                  </label>
                  <Input
                    list="task-category-suggestions"
                    value={form.category}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, category: e.target.value }))
                    }
                    placeholder="例：デザイン、広報、物品準備"
                    disabled={saving}
                    className="w-full"
                  />
                  <datalist id="task-category-suggestions">
                    {categoryOptions.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    レビュー者
                  </label>
                  <select
                    value={form.reviewer_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reviewer_id: e.target.value }))
                    }
                    disabled={saving}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  >
                    <option value="">未定</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {formatMemberOption(m)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editingTask ? (
                <ChecklistSection
                  taskId={editingTask.id}
                  onCountChange={handleChecklistCountChange}
                />
              ) : (
                <p className="text-xs text-graphite/60">
                  チェックリストは保存後に追加できます。
                </p>
              )}
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

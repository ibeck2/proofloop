"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DragDropContext,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  Plus,
  CheckCircle2,
  X,
  Archive,
  Lock,
  Undo2,
  Table,
  Kanban,
  Calendar,
  ChartGantt,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@/components/ui";
import type { TaskRow, TaskStatus } from "@/lib/types/task";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import {
  shouldNotifyReviewAssigned,
  shouldNotifyAssigneeChanged,
  shouldGenerateRecurringTask,
  commentNotificationRecipients,
} from "@/lib/tasks/taskNotificationTriggers";
import {
  decodeSwimlaneDroppableId,
  resolveSwimlaneRowChange,
  swimlaneRowKeyForTask,
  type SwimlaneAxis,
} from "@/lib/tasks/taskSwimlanes";
import {
  buildRecurringTask,
  type RecurringTaskSource,
} from "@/lib/tasks/taskRecurrence";
import {
  filterTasksByArchiveView,
  type ArchiveView,
} from "@/lib/tasks/taskArchive";
import ChecklistSection from "./ChecklistSection";
import AttachmentSection from "./AttachmentSection";
import CommentSection from "./CommentSection";
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
  start_date: "",
  assignee_id: "",
  reviewer_id: "",
  category: "",
  recurrence_rule: "",
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
    activeRole,
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
    "table"
  );
  const [swimlaneAxis, setSwimlaneAxis] = useState<SwimlaneAxis | "flat">(
    "flat"
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checklistCountByTaskId, setChecklistCountByTaskId] = useState<
    Record<string, { done: number; total: number }>
  >({});
  const [archiveView, setArchiveView] = useState<ArchiveView>({
    type: "current",
  });
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveLabelInput, setArchiveLabelInput] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveLabelOpts, setArchiveLabelOpts] = useState<string[]>([]);
  const [unarchiveModalOpen, setUnarchiveModalOpen] = useState(false);
  const [unarchiving, setUnarchiving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const loadTasks = useCallback(async () => {
    if (!orgId) return;
    let query = supabase
      .from("tasks")
      .select(
        "id, organization_id, title, description, status, priority, assignee_id, reviewer_id, created_by, category, due_date, start_date, created_at, recurrence_rule, archived_at, archive_label"
      )
      .eq("organization_id", orgId);
    if (archiveView.type === "current") {
      query = query.is("archived_at", null);
    } else {
      query = query.eq("archive_label", archiveView.label);
    }
    const { data, error } = await query;

    if (error) {
      console.error("tasks fetch error:", error);
      toast.error("タスクの読み込みに失敗しました");
      setTasks([]);
      return;
    }
    setTasks((data as TaskRow[]) ?? []);
  }, [orgId, archiveView]);

  const loadArchiveLabels = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase.rpc(
      "list_organization_archive_labels",
      { p_organization_id: orgId }
    );
    if (error) {
      console.error("archive labels fetch error:", error);
      return;
    }
    setArchiveLabelOpts(
      (
        data as Array<{ archive_label: string; latest_archived_at: string }>
      ).map((row) => row.archive_label)
    );
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
    let query = supabase
      .from("task_checklist_items")
      .select("task_id, is_done, tasks!inner(archived_at, archive_label)")
      .eq("organization_id", orgId);
    query =
      archiveView.type === "current"
        ? query.is("tasks.archived_at", null)
        : query.eq("tasks.archive_label", archiveView.label);
    const { data, error } = await query;
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
  }, [orgId, archiveView]);

  useEffect(() => {
    if (orgId) {
      loadMembers();
    }
  }, [orgId, loadMembers]);

  useEffect(() => {
    if (orgId) {
      loadTasks();
      loadChecklistCounts();
    }
  }, [orgId, loadTasks, loadChecklistCounts]);

  useEffect(() => {
    if (orgId) {
      loadArchiveLabels();
    }
  }, [orgId, loadArchiveLabels]);

  useEffect(() => {
    setCategoryFilter("");
  }, [archiveView]);

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
      type:
        | "task_review_assigned"
        | "task_assignee_changed"
        | "task_comment_added";
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

  const handleCommentAdded = useCallback(async () => {
    if (!editingTask) return;
    const recipients = commentNotificationRecipients(
      {
        assigneeId: editingTask.assignee_id,
        reviewerId: editingTask.reviewer_id,
        createdBy: editingTask.created_by,
      },
      currentUserId ?? ""
    );
    // 逐次await：複数人に同時発火するとResendのレート制限に触れて
    // 一部だけ無言で失敗しうるため、直列に送ってその余地を無くす。
    for (const recipientId of recipients) {
      await notifyTaskChange({
        type: "task_comment_added",
        recipientId,
        taskTitle: editingTask.title,
      });
    }
  }, [editingTask, currentUserId, notifyTaskChange]);

  /**
   * タスクが「完了」に新しく遷移した際、recurrence_ruleが設定されていれば
   * 次回分のタスクを1件自動生成する（Todoist方式）。生成に失敗しても
   * 呼び出し元の保存・移動操作自体は失敗させない（付随処理として扱う）。
   */
  const maybeGenerateRecurringTask = useCallback(
    async (source: RecurringTaskSource, sourceTaskId: string) => {
      try {
        if (!source.recurrence_rule) return;

        const { data: checklistData, error: checklistError } = await supabase
          .from("task_checklist_items")
          .select("text, position")
          .eq("task_id", sourceTaskId)
          .order("position", { ascending: true })
          .order("created_at", { ascending: true });
        if (checklistError) {
          console.error(
            "recurring task checklist fetch error:",
            checklistError
          );
          toast.error(
            "チェックリストの取得に失敗したため、定期タスクの自動生成を中止しました"
          );
          return;
        }

        const generation = buildRecurringTask(
          source,
          (checklistData as Array<{ text: string; position: number }>) ?? []
        );
        if (!generation) return;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data: newTask, error: insertError } = await supabase
          .from("tasks")
          .insert({ ...generation.task, created_by: user?.id ?? null })
          .select("id")
          .single();
        if (insertError || !newTask) {
          console.error("recurring task insert error:", insertError);
          toast.error("定期タスクの自動生成に失敗しました");
          return;
        }

        let checklistInsertFailed = false;
        if (generation.checklistItems.length > 0) {
          const { error: checklistInsertError } = await supabase
            .from("task_checklist_items")
            .insert(
              generation.checklistItems.map((item) => ({
                task_id: newTask.id,
                text: item.text,
                position: item.position,
                is_done: item.is_done,
              }))
            );
          if (checklistInsertError) {
            console.error(
              "recurring task checklist insert error:",
              checklistInsertError
            );
            toast.error("チェックリストの引き継ぎに失敗しました（タスク自体は作成されています）");
            checklistInsertFailed = true;
          }
        }

        if (!checklistInsertFailed) {
          toast.success("次回分の定期タスクを自動生成しました");
        }
        await loadTasks();
        await loadChecklistCounts();
      } catch (err) {
        console.error("recurring task generation error:", err);
        toast.error("定期タスクの自動生成に失敗しました");
      }
    },
    [loadTasks, loadChecklistCounts]
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

  const isViewingArchiveHistory = archiveView.type !== "current";

  const visibleTasks = useMemo(() => {
    const archived = filterTasksByArchiveView(tasks, archiveView);
    if (!categoryFilter) return archived;
    return archived.filter(
      (t) => (t.category ?? "").trim() === categoryFilter
    );
  }, [tasks, archiveView, categoryFilter]);

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
      start_date: task.start_date
        ? task.start_date.slice(0, 10)
        : "",
      assignee_id: task.assignee_id ?? "",
      reviewer_id: task.reviewer_id ?? "",
      category: task.category ?? "",
      recurrence_rule: task.recurrence_rule ?? "",
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
    if (isViewingArchiveHistory) return;
    if (!orgId) return;
    const title = form.title.trim();
    if (!title) {
      toast.error("タイトルは必須です");
      return;
    }
    if (form.start_date && form.due_date && form.start_date > form.due_date) {
      toast.error("開始日は期限より後にできません");
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
        start_date: form.start_date || null,
        assignee_id: form.assignee_id || null,
        reviewer_id: form.reviewer_id || null,
        category: form.category.trim() || null,
        recurrence_rule: form.recurrence_rule || null,
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
            start_date: payload.start_date,
            assignee_id: payload.assignee_id,
            reviewer_id: payload.reviewer_id,
            category: payload.category,
            recurrence_rule: payload.recurrence_rule,
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

        if (
          shouldGenerateRecurringTask(
            {
              status: normalizeStatus(editingTask.status),
              recurrenceRule: editingTask.recurrence_rule,
            },
            { status: payload.status, recurrenceRule: payload.recurrence_rule }
          )
        ) {
          await maybeGenerateRecurringTask(
            {
              organization_id: orgId,
              title: payload.title,
              description: payload.description,
              category: payload.category,
              priority: payload.priority,
              assignee_id: payload.assignee_id,
              reviewer_id: payload.reviewer_id,
              due_date: payload.due_date,
              recurrence_rule: payload.recurrence_rule,
            },
            editingTask.id
          );
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
      if (archiveView.type !== "current") return;
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

      if (
        shouldGenerateRecurringTask(
          {
            status: normalizeStatus(task.status),
            recurrenceRule: task.recurrence_rule ?? null,
          },
          { status: newStatus, recurrenceRule: task.recurrence_rule ?? null }
        )
      ) {
        await maybeGenerateRecurringTask(
          {
            organization_id: task.organization_id,
            title: task.title,
            description: task.description,
            category:
              "category" in rowChange
                ? (rowChange.category ?? null)
                : task.category,
            priority: task.priority,
            assignee_id: nextAssignee.assigneeId,
            reviewer_id: task.reviewer_id,
            due_date: task.due_date,
            recurrence_rule: task.recurrence_rule ?? null,
          },
          task.id
        );
      }
    },
    [
      tasks,
      notifyTaskChange,
      currentUserId,
      swimlaneAxis,
      maybeGenerateRecurringTask,
      archiveView,
    ]
  );

  const handleArchive = async () => {
    if (!orgId) return;
    const label = archiveLabelInput.trim();
    if (!label) {
      toast.error("アーカイブ名を入力してください");
      return;
    }
    setArchiving(true);
    const { data, error } = await supabase.rpc("archive_organization_tasks", {
      p_organization_id: orgId,
      p_archive_label: label,
    });
    setArchiving(false);
    if (error) {
      console.error("archive_organization_tasks error:", error);
      toast.error("アーカイブに失敗しました");
      return;
    }
    const archivedCount = data ?? 0;
    if (archivedCount > 0) {
      toast.success(`${archivedCount}件のタスクをアーカイブしました`);
    } else {
      toast.error("アーカイブ対象のタスクがありませんでした");
    }
    setArchiveModalOpen(false);
    setArchiveLabelInput("");
    await loadTasks();
    await loadArchiveLabels();
    await loadChecklistCounts();
  };

  const handleUnarchive = async () => {
    if (!orgId || archiveView.type !== "label") return;
    const label = archiveView.label;
    setUnarchiving(true);
    const { data, error } = await supabase.rpc(
      "unarchive_organization_label",
      { p_organization_id: orgId, p_archive_label: label }
    );
    setUnarchiving(false);
    if (error) {
      console.error("unarchive_organization_label error:", error);
      toast.error("アーカイブの取り消しに失敗しました");
      return;
    }
    const restoredCount = data ?? 0;
    if (restoredCount > 0) {
      toast.success(`${restoredCount}件のタスクを現在のタスクに戻しました`);
    } else {
      toast.error("対象のタスクが見つかりませんでした");
    }
    setUnarchiveModalOpen(false);
    // "current"に戻すことで、loadTasks/loadChecklistCountsがarchiveView
    // への依存経由で自動的に再取得する（表示ドロップダウンの切替と同じ
    // 仕組み。ここで明示的にloadTasksを呼ぶと、このクロージャが束縛して
    // いる「取り消し前のarchiveView」向けのクエリを再実行してしまうため
    // 呼ばない）。loadArchiveLabelsはarchiveViewに依存しない独立effectの
    // ため、ここで明示的に呼ぶ必要がある。
    setArchiveView({ type: "current" });
    await loadArchiveLabels();
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
        <div className="flex items-center gap-2 shrink-0">
          {(activeRole === "owner" || activeRole === "admin") && (
            <Button
              type="button"
              variant="outlineMuted"
              onClick={() => setArchiveModalOpen(true)}
              disabled={isViewingArchiveHistory}
              title={
                isViewingArchiveHistory
                  ? "アーカイブ履歴を閲覧中は年度アーカイブを実行できません"
                  : undefined
              }
              className="inline-flex items-center gap-2"
            >
              <Archive className="w-5 h-5" aria-hidden="true" />
              年度アーカイブ
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            onClick={openNewModal}
            disabled={isViewingArchiveHistory}
            title={
              isViewingArchiveHistory
                ? "アーカイブ履歴を閲覧中は新規タスクを追加できません"
                : undefined
            }
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            新規タスク追加
          </Button>
        </div>
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
        {archiveLabelOpts.length > 0 && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="archive-view"
              className="text-sm text-graphite/70 shrink-0"
            >
              表示
            </label>
            <select
              id="archive-view"
              value={archiveView.type === "current" ? "" : archiveView.label}
              onChange={(e) =>
                setArchiveView(
                  e.target.value
                    ? { type: "label", label: e.target.value }
                    : { type: "current" }
                )
              }
              className="border border-rule rounded-lg px-2 py-1.5 text-sm bg-paper text-ink"
            >
              <option value="">現在のタスク</option>
              {archiveLabelOpts.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
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
        <div className="overflow-x-auto min-w-0">
          <div className="inline-grid grid-flow-col auto-cols-fr min-w-max rounded-lg border border-rule overflow-hidden">
            {(
              [
                { id: "table", label: "表", icon: Table },
                { id: "kanban", label: "カンバン", icon: Kanban },
                { id: "calendar", label: "カレンダー", icon: Calendar },
                { id: "gantt", label: "ガントチャート", icon: ChartGantt },
              ] as const
            ).map((v, i) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                    i > 0 ? "border-l border-rule" : ""
                  } ${
                    view === v.id
                      ? "bg-ink text-paper"
                      : "bg-paper text-graphite hover:bg-mist"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isViewingArchiveHistory && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-rule bg-mist px-4 py-2 text-sm text-graphite">
          <span className="flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
            「{archiveView.type === "label" ? archiveView.label : ""}」のアーカイブ履歴を閲覧中です（参照専用。ドラッグでの移動・新規タスク追加はできません）
          </span>
          {(activeRole === "owner" || activeRole === "admin") && (
            <Button
              type="button"
              variant="outlineMuted"
              onClick={() => setUnarchiveModalOpen(true)}
              className="inline-flex items-center gap-2 shrink-0"
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
              このアーカイブを取り消す
            </Button>
          )}
        </div>
      )}

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
                    <Droppable
                      droppableId={lane.id}
                      isDropDisabled={isViewingArchiveHistory}
                    >
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
                              isDragDisabled={isViewingArchiveHistory}
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
              isDropDisabled={isViewingArchiveHistory}
              isDragDisabled={isViewingArchiveHistory}
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
                {editingTask
                  ? isViewingArchiveHistory
                    ? "タスクを閲覧"
                    : "タスクを編集"
                  : "新規タスク"}
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
                  disabled={saving || isViewingArchiveHistory}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
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
                  disabled={saving || isViewingArchiveHistory}
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
                    disabled={saving || isViewingArchiveHistory}
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
                    disabled={saving || isViewingArchiveHistory}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-ink mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_date: e.target.value }))
                    }
                    disabled={saving || isViewingArchiveHistory}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                  />
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
                    disabled={saving || isViewingArchiveHistory}
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
                    disabled={saving || isViewingArchiveHistory}
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
                    disabled={saving || isViewingArchiveHistory}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
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
                    disabled={saving || isViewingArchiveHistory}
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
              <div>
                <label className="block text-sm font-bold text-ink mb-1">
                  繰り返し
                </label>
                <select
                  value={form.recurrence_rule}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      recurrence_rule: e.target.value,
                    }))
                  }
                  disabled={saving || isViewingArchiveHistory}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                >
                  <option value="">なし</option>
                  <option value="weekly">毎週</option>
                  <option value="biweekly">隔週</option>
                  <option value="monthly">毎月</option>
                </select>
                <p className="text-xs text-graphite/60 mt-1">
                  設定すると、このタスクが「完了」になった時点で次回分を自動的に作成します。
                </p>
              </div>
              {editingTask ? (
                <>
                  <ChecklistSection
                    taskId={editingTask.id}
                    onCountChange={handleChecklistCountChange}
                    readOnly={isViewingArchiveHistory}
                  />
                  <AttachmentSection
                    taskId={editingTask.id}
                    organizationId={editingTask.organization_id}
                    readOnly={isViewingArchiveHistory}
                  />
                  <CommentSection
                    taskId={editingTask.id}
                    memberNameById={memberNameById}
                    onCommentAdded={handleCommentAdded}
                    readOnly={isViewingArchiveHistory}
                  />
                </>
              ) : (
                <p className="text-xs text-graphite/60">
                  チェックリスト・添付ファイル・コメントは保存後に追加できます。
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outlineMuted"
                  onClick={closeModal}
                  disabled={saving}
                >
                  {isViewingArchiveHistory ? "閉じる" : "キャンセル"}
                </Button>
                {!isViewingArchiveHistory && (
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? "保存中..." : "保存"}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {archiveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !archiving) {
              setArchiveModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-paper border border-rule shadow-xl">
            <div className="p-5 border-b border-rule">
              <h2
                id="archive-modal-title"
                className="text-lg font-bold text-ink"
              >
                年度アーカイブ
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-graphite">
                現在アーカイブされていない全てのタスクに、入力したアーカイブ名を付けて一括でアーカイブします。アーカイブ後は既存の表示から除外されますが、コメント・添付ファイル・チェックリストを含め削除はされず、「表示」の絞り込みからいつでも参照できます。間違えてアーカイブした場合は、「表示」でこのラベルを選び、表示されるバナーの「このアーカイブを取り消す」から一括で元に戻せます。
              </p>
              <div>
                <label className="block text-sm font-bold text-ink mb-1">
                  アーカイブ名
                </label>
                <Input
                  value={archiveLabelInput}
                  onChange={(e) => setArchiveLabelInput(e.target.value)}
                  placeholder="例：2026年度"
                  disabled={archiving}
                  maxLength={100}
                  className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outlineMuted"
                  onClick={() => setArchiveModalOpen(false)}
                  disabled={archiving}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleArchive}
                  disabled={archiving || !archiveLabelInput.trim()}
                >
                  {archiving ? "アーカイブ中..." : "アーカイブする"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {unarchiveModalOpen && archiveView.type === "label" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unarchive-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !unarchiving) {
              setUnarchiveModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-paper border border-rule shadow-xl">
            <div className="p-5 border-b border-rule">
              <h2
                id="unarchive-modal-title"
                className="text-lg font-bold text-ink"
              >
                アーカイブの取り消し
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-graphite">
                「{archiveView.label}」を取り消し、{tasks.length}
                件のタスクを現在のタスクへ戻します。チェックリスト・添付ファイル・コメントも通常通り編集できる状態に戻ります。取り消したタスクは現在のタスクと区別が付かなくなり、この取り消し自体を元に戻すことはできません（再度アーカイブすると、そのとき未アーカイブの全タスクが対象になります）。
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outlineMuted"
                  onClick={() => setUnarchiveModalOpen(false)}
                  disabled={unarchiving}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleUnarchive}
                  disabled={unarchiving}
                >
                  {unarchiving ? "取り消し中..." : "取り消す"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

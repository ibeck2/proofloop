"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { ApplicationWithProfile } from "@/lib/types/application";
import ChatRoom from "@/components/ChatRoom";
import { Input, Button } from "@/components/ui";

const SOURCE_OPTIONS = [
  { value: "LINE", label: "LINE" },
  { value: "Google Form", label: "Google Form" },
  { value: "その他", label: "その他" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "高", label: "高" },
  { value: "中", label: "中" },
  { value: "低", label: "低" },
  { value: "未設定", label: "未設定" },
] as const;

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

type SelectionFlowStep = {
  name: string;
  date_type: string;
  date_value: string;
  description: string;
  url: string;
};

type OrgRow = {
  id: string;
  name: string | null;
  selection_flow: SelectionFlowStep[] | null;
  planned_hire_count: number | null;
  step_target_rates: Record<string, number> | null;
};

type LaneDef = { id: string; title: string };

/** 「内定」「完了」「内定・完了」に完全一致または部分一致するステップ名か（システムデフォルト「内定・完了」レーンに統合するため） */
function isAcceptedLikeStep(stepName: string): boolean {
  const n = (stepName || "").trim();
  if (n === "内定" || n === "完了" || n === "内定・完了") return true;
  if (n.includes("内定") || n.includes("完了")) return true;
  return false;
}

function getLaneId(app: ApplicationWithProfile, _steps: SelectionFlowStep[]): string {
  if (app.status === "no_reply") return "no_reply";
  if (app.status === "accepted") return "accepted";
  if (app.status === "rejected") return "rejected";
  if (app.current_step === "新規応募") return "new";
  if (isAcceptedLikeStep(app.current_step)) return "accepted";
  if (_steps.some((s) => s.name === app.current_step)) return app.current_step;
  return "new";
}

function formatAppDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** レーンID → DB更新用の status / current_step */
function laneIdToPayload(laneId: string): { status: string; current_step: string } {
  if (laneId === "accepted") return { status: "accepted", current_step: "内定・完了" };
  if (laneId === "rejected") return { status: "rejected", current_step: "お見送り" };
  if (laneId === "no_reply") return { status: "no_reply", current_step: "返信なし" };
  if (laneId === "new") return { status: "active", current_step: "新規応募" };
  return { status: "active", current_step: laneId };
}

export default function ClubAtsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [selectionFlow, setSelectionFlow] = useState<SelectionFlowStep[]>([]);
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailApp, setDetailApp] = useState<ApplicationWithProfile | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualUniversity, setManualUniversity] = useState("");
  const [manualSource, setManualSource] = useState<string>("その他");
  const [manualStep, setManualStep] = useState("新規応募");
  const [manualPriority, setManualPriority] = useState<string>("未設定");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [plannedHireCount, setPlannedHireCount] = useState<number | "">("");
  const [stepTargetRates, setStepTargetRates] = useState<Record<string, number>>({});
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [unreadApplicationIds, setUnreadApplicationIds] = useState<Set<string>>(new Set());
  const stepTargetRatesRef = useRef<Record<string, number>>({});
  stepTargetRatesRef.current = stepTargetRates;

  const loadOrg = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    setUserId(session.user.id);
    const { data: rows } = await supabase
      .from("organizations")
      .select("id, name, selection_flow, planned_hire_count, step_target_rates")
      .eq("user_id", session.user.id)
      .limit(1);
    const org = (rows as OrgRow[] | null)?.[0];
    if (org) {
      setOrgId(org.id);
      setOrgName(org.name ?? null);
      const flow = org.selection_flow && Array.isArray(org.selection_flow) ? org.selection_flow : [];
      setSelectionFlow(flow);
      setPlannedHireCount(org.planned_hire_count ?? "");
      setStepTargetRates(typeof org.step_target_rates === "object" && org.step_target_rates ? org.step_target_rates : {});
    }
    setLoading(false);
  }, []);

  const loadApplications = useCallback(async () => {
    if (!orgId) return;
    const { data: appRows, error: appError } = await supabase
      .from("applications")
      .select("id, user_id, organization_id, status, current_step, applicant_message, created_at, priority, manual_name, manual_university, source")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (appError) {
      console.error("applications fetch error:", appError);
      setApplications([]);
      return;
    }

    const appList = (appRows ?? []) as Omit<ApplicationWithProfile, "profiles">[];
    const userIds = [...new Set(appList.map((a) => a.user_id).filter(Boolean))] as string[];

    if (userIds.length === 0) {
      setApplications(appList.map((a) => ({ ...a, profiles: null })));
      return;
    }

    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, display_name, university, faculty, enrollment_year, email")
      .in("id", userIds);

    const profileMap = new Map<string, NonNullable<ApplicationWithProfile["profiles"]>>();
    for (const p of profileRows ?? []) {
      profileMap.set((p as { id: string }).id, p as NonNullable<ApplicationWithProfile["profiles"]>);
    }

    setApplications(
      appList.map((a) => ({
        ...a,
        profiles: a.user_id ? profileMap.get(a.user_id) ?? null : null,
      }))
    );

    const appIds = appList.map((a) => a.id);
    if (appIds.length > 0) {
      const { data: unreadRows } = await supabase
        .from("application_messages")
        .select("application_id")
        .in("application_id", appIds)
        .eq("is_from_club", false)
        .is("read_at", null);
      const ids = [...new Set((unreadRows ?? []).map((r: { application_id: string }) => r.application_id))];
      setUnreadApplicationIds(new Set(ids));
    } else {
      setUnreadApplicationIds(new Set());
    }
  }, [orgId]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    if (orgId) loadApplications();
  }, [orgId, loadApplications]);

  const lanes: LaneDef[] = [
    { id: "new", title: "新規応募" },
    ...selectionFlow.filter((s) => !isAcceptedLikeStep(s.name)).map((s) => ({ id: s.name, title: s.name })),
    { id: "accepted", title: "内定・完了" },
    { id: "rejected", title: "お見送り" },
    { id: "no_reply", title: "返信なし" },
  ];

  const totalValidApplicants = applications.filter((a) => a.status !== "rejected").length;
  const plannedNum = typeof plannedHireCount === "number" ? plannedHireCount : null;
  const overallTargetRatePct =
    totalValidApplicants > 0 && plannedNum !== null
      ? (plannedNum / totalValidApplicants) * 100
      : null;
  const overallTargetMultiple =
    overallTargetRatePct != null && overallTargetRatePct > 0 ? 100 / overallTargetRatePct : null;

  const combinedSimulatedRate =
    selectionFlow.length === 0
      ? 1
      : selectionFlow.reduce((acc, s) => {
          const pct = stepTargetRates[s.name] ?? 100;
          return acc * (Math.min(100, Math.max(0, pct)) / 100);
        }, 1);
  const predictedPassCount = totalValidApplicants * combinedSimulatedRate;
  const simulatorTooStrict =
    plannedNum != null &&
    plannedNum > 0 &&
    totalValidApplicants > 0 &&
    predictedPassCount < plannedNum;

  const savePlannedHireCount = useCallback(
    async (value: number | "") => {
      if (!orgId) return;
      const num = value === "" ? null : value;
      setSavingPlan(true);
      try {
        const { error } = await supabase.from("organizations").update({ planned_hire_count: num }).eq("id", orgId);
        if (error) throw error;
        setPlannedHireCount(value);
        toast.success("計画採用人数を保存しました");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "保存に失敗しました");
      } finally {
        setSavingPlan(false);
      }
    },
    [orgId]
  );

  const saveStepTargetRates = useCallback(
    async (rates: Record<string, number>) => {
      if (!orgId) return;
      setSavingPlan(true);
      try {
        const { error } = await supabase.from("organizations").update({ step_target_rates: rates }).eq("id", orgId);
        if (error) throw error;
        setStepTargetRates(rates);
        toast.success("目標通過率を保存しました");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "保存に失敗しました");
      } finally {
        setSavingPlan(false);
      }
    },
    [orgId]
  );

  const appsByLane = lanes.map((lane) => ({
    lane,
    apps: applications.filter((a) => getLaneId(a, selectionFlow) === lane.id),
  }));

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !manualName.trim()) {
      toast.error("氏名は必須です");
      return;
    }
    setManualSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .insert({
          user_id: null,
          organization_id: orgId,
          status: "active",
          current_step: manualStep,
          priority: manualPriority || null,
          manual_name: manualName.trim(),
          manual_university: manualUniversity.trim() || null,
          source: manualSource,
          applicant_message: null,
        })
        .select("id, user_id, organization_id, status, current_step, applicant_message, created_at, priority, manual_name, manual_university, source")
        .single();
      if (error) throw error;
      setApplications((prev) => [{ ...(data as ApplicationWithProfile), profiles: null }, ...prev]);
      setManualModalOpen(false);
      setManualName("");
      setManualUniversity("");
      setManualSource("その他");
      setManualStep("新規応募");
      setManualPriority("未設定");
      toast.success("候補者を追加しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setManualSubmitting(false);
    }
  };

  const handlePriorityChange = async (appId: string, newPriority: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    try {
      const { error } = await supabase.from("applications").update({ priority: newPriority }).eq("id", appId);
      if (error) throw error;
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, priority: newPriority } : a)));
      if (detailApp?.id === appId) setDetailApp((d) => (d ? { ...d, priority: newPriority } : null));
      toast.success("優先度を更新しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新に失敗しました");
    }
  };

  const handleStatusChange = async (appId: string, newLaneId: string) => {
    const app = applications.find((a) => a.id === appId);
    if (!app) return;
    setUpdatingId(appId);
    try {
      const payload = laneIdToPayload(newLaneId);
      const { error } = await supabase.from("applications").update(payload).eq("id", appId);
      if (error) throw error;
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, ...payload } : a))
      );
      if (detailApp?.id === appId) {
        setDetailApp((d) => (d ? { ...d, ...payload } : null));
      }
      toast.success("ステータスを更新しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination || destination.droppableId === source.droppableId) return;
      const app = applications.find((a) => a.id === draggableId);
      if (!app) return;

      const payload = laneIdToPayload(destination.droppableId);
      const prevApplications = applications;
      const prevDetailApp = detailApp;

      setApplications((prev) =>
        prev.map((a) => (a.id === draggableId ? { ...a, ...payload } : a))
      );
      if (detailApp?.id === draggableId) {
        setDetailApp((d) => (d ? { ...d, ...payload } : null));
      }

      const { error } = await supabase.from("applications").update(payload).eq("id", draggableId);
      if (error) {
        setApplications(prevApplications);
        setDetailApp(prevDetailApp);
        toast.error("ステータスの更新に失敗しました");
        return;
      }
      toast.success("ステータスを更新しました");
    },
    [applications, detailApp]
  );

  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium">団体が登録されていません</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">プロフィール編集で団体を登録してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">採用管理（ATS）</h1>
          {orgName && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{orgName} の応募者を管理します</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/clubmessages"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">mail</span>
            メッセージ一覧を開く
          </Link>
          <button
            type="button"
            onClick={() => setManualModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-primary text-primary hover:bg-primary/10 font-medium text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            ＋ 候補者を手動追加
          </button>
        </div>
      </div>

      {/* ファネル分析ダッシュボード */}
      <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">応募者総数（有効）</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalValidApplicants} 名</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">お見送りを除く選考中＋内定</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">計画採用人数</p>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min={0}
                value={plannedHireCount === "" ? "" : plannedHireCount}
                onChange={(e) => {
                  const v = e.target.value;
                  setPlannedHireCount(v === "" ? "" : Math.max(0, parseInt(v, 10) || 0));
                }}
                onBlur={(e) => {
                  const v = e.target.value;
                  const num = v === "" ? "" : Math.max(0, parseInt(v, 10) || 0);
                  savePlannedHireCount(num);
                }}
                className="w-24 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-lg font-bold bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary"
              />
              <span className="text-slate-600 dark:text-slate-300">名</span>
              {savingPlan && <span className="text-xs text-slate-400">保存中...</span>}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">全体目標通過率</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {overallTargetRatePct != null
                ? `${overallTargetRatePct.toFixed(1)}%${overallTargetMultiple != null ? `（${overallTargetMultiple.toFixed(1)}倍）` : ""}`
                : "—"}
            </p>
            {totalValidApplicants === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">応募者がいると計算されます</p>
            )}
          </div>
        </div>

        {/* 選考シミュレーター（アコーディオン） */}
        <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
          <button
            type="button"
            onClick={() => setSimulatorOpen((o) => !o)}
            className="flex items-center justify-between w-full text-left font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg px-3 py-2 -mx-3 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">insights</span>
              選考シミュレーター
            </span>
            <span className="material-symbols-outlined text-slate-400 transition-transform" style={{ transform: simulatorOpen ? "rotate(180deg)" : undefined }}>
              expand_more
            </span>
          </button>
          {simulatorOpen && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                各ステップの目標通過率（%）を入力すると、総合予測通過率が計算されます。未入力は100%として計算します。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectionFlow.length === 0 ? (
                  <p className="text-slate-500 text-sm">プロフィールで選考フローを設定すると、ここで目標通過率を入力できます。</p>
                ) : (
                  selectionFlow.map((step) => (
                    <div key={step.name}>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{step.name}（%）</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={stepTargetRates[step.name] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? "" : Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0));
                            setStepTargetRates(
                              v === "" ? (() => { const { [step.name]: _, ...r } = stepTargetRates; return r; })() : { ...stepTargetRates, [step.name]: v }
                            );
                          }}
                          onBlur={() => saveStepTargetRates(stepTargetRatesRef.current)}
                          placeholder="100"
                          className="w-20 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                        <span className="text-slate-500">%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  総合予測通過率: <span className="font-bold text-primary">{(combinedSimulatedRate * 100).toFixed(1)}%</span>
                  {totalValidApplicants > 0 && (
                    <span className="text-slate-500 font-normal ml-1">
                      （予測通過人数: 約{Math.round(predictedPassCount)}名）
                    </span>
                  )}
                </p>
              </div>
              {simulatorTooStrict && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    ※各ステップの通過率が低すぎます。このままでは計画採用人数を下回る可能性があります。
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    予測通過: 約{Math.round(predictedPassCount)}名 / 計画: {plannedNum}名
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* カンバンボード（DnD） */}
      <div className="overflow-x-auto pb-4 -mx-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 min-w-max px-2">
            {appsByLane.map(({ lane, apps }) => (
              <div
                key={lane.id}
                className="w-[300px] flex-shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden flex flex-col"
              >
                <div
                  className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0 ${
                    (() => {
                      if (lane.id === "rejected" || lane.id === "accepted" || lane.id === "new") return "bg-white dark:bg-slate-800";
                      const rate = stepTargetRates[lane.id];
                      if (rate == null || totalValidApplicants === 0) return "bg-white dark:bg-slate-800";
                      const prevLaneIdx = lanes.findIndex((l) => l.id === lane.id) - 1;
                      if (prevLaneIdx < 0) return "bg-white dark:bg-slate-800";
                      const prevApps = appsByLane[prevLaneIdx]?.apps.length ?? 0;
                      const expected = Math.floor(prevApps * (rate / 100));
                      return apps.length < expected * 0.9 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-slate-800";
                    })()
                  }`}
                >
                  <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 flex-wrap">
                    {lane.id === "accepted" && (
                      <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                    )}
                    {lane.id === "rejected" && (
                      <span className="material-symbols-outlined text-slate-500 text-lg">cancel</span>
                    )}
                    <span>{lane.title}</span>
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                      （{apps.length}）
                    </span>
                  </h2>
                </div>
                <Droppable droppableId={lane.id}>
                  {(droppableProvided) => (
                    <div
                      ref={droppableProvided.innerRef}
                      {...droppableProvided.droppableProps}
                      className="p-3 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto flex-1 min-h-[80px]"
                    >
                      {apps.map((app, index) => {
                        const isProofLoop = !!app.user_id;
                        const displayName = isProofLoop && app.profiles
                          ? app.profiles.display_name || "（名前未設定）"
                          : (app.manual_name || "（名前未設定）");
                        const displaySub = isProofLoop && app.profiles
                          ? [app.profiles.university, app.profiles.faculty].filter(Boolean).join(" · ") || "—"
                          : (app.manual_university || "—");
                        const displayMeta = isProofLoop && app.profiles
                          ? `入学年度: ${app.profiles.enrollment_year || "—"} · 応募日: ${formatAppDate(app.created_at)}`
                          : `応募日: ${formatAppDate(app.created_at)}`;
                        return (
                          <Draggable key={app.id} draggableId={app.id} index={index}>
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
                                  <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                                </div>
                                <div
                                  className="flex-1 min-w-0 p-3 pr-4 pt-3 cursor-pointer relative"
                                  onClick={() => setDetailApp(app)}
                                >
                                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                                    {unreadApplicationIds.has(app.id) && (
                                      <span className="relative flex h-2.5 w-2.5 shrink-0" title="未読メッセージあり">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                                      </span>
                                    )}
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${priorityBadgeClass(app.priority)}`}>
                                      {app.priority || "未設定"}
                                    </span>
                                  </div>
                                  {!isProofLoop && app.source && (
                                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-500 mt-1">
                                      {app.source}
                                    </span>
                                  )}
                                  <p className="font-medium text-slate-900 dark:text-white truncate pr-16">
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                    {displaySub}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                    {displayMeta}
                                  </p>
                                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">ステータス変更</label>
                                    <select
                                      value={getLaneId(app, selectionFlow)}
                                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                                      disabled={updatingId === app.id}
                                      className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary"
                                    >
                                      {lanes.map((l) => (
                                        <option key={l.id} value={l.id}>
                                          {l.title}
                                        </option>
                                      ))}
                                    </select>
                                    {updatingId === app.id && (
                                      <p className="text-xs text-primary mt-1">更新中...</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {droppableProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* 応募者詳細モーダル */}
      {detailApp && (
        <>
          <div
            role="presentation"
            aria-hidden
            className="fixed inset-0 z-[200] bg-black/50"
            onClick={() => setDetailApp(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="applicant-detail-title"
            className="fixed left-1/2 top-1/2 z-[210] w-[min(520px,92vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-600">
              <h3 id="applicant-detail-title" className="text-lg font-bold text-slate-900 dark:text-white">
                応募者詳細
              </h3>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setDetailApp(null)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
              {/* 優先度変更 */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">優先度</h4>
                <select
                  value={detailApp.priority ?? "未設定"}
                  onChange={(e) => handlePriorityChange(detailApp.id, e.target.value)}
                  className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">プロフィール</h4>
                {detailApp.user_id && detailApp.profiles ? (
                  <dl className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 divide-y divide-slate-200 dark:divide-slate-600">
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">氏名</dt>
                      <dd className="text-slate-900 dark:text-white text-sm font-medium">{detailApp.profiles.display_name ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">メール</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{detailApp.profiles.email ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">大学名</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{detailApp.profiles.university ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">学部・学科</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{detailApp.profiles.faculty ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">入学年度</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{detailApp.profiles.enrollment_year ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">応募日</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{formatAppDate(detailApp.created_at)}</dd>
                    </div>
                  </dl>
                ) : (
                  <dl className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 divide-y divide-slate-200 dark:divide-slate-600">
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">氏名</dt>
                      <dd className="text-slate-900 dark:text-white text-sm font-medium">{detailApp.manual_name ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">大学・学年など</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{detailApp.manual_university ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">流入経路</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{detailApp.source ?? "—"}</dd>
                    </div>
                    <div className="px-4 py-2 flex justify-between gap-4">
                      <dt className="text-slate-500 dark:text-slate-400 text-sm">追加日</dt>
                      <dd className="text-slate-900 dark:text-white text-sm">{formatAppDate(detailApp.created_at)}</dd>
                    </div>
                  </dl>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">志望動機・自己PR</h4>
                <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">
                    {detailApp.applicant_message?.trim() || "（未入力）"}
                  </p>
                </div>
              </div>

              {/* メッセージ履歴・連絡（ProofLoop応募者のみ） */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">メッセージ履歴・連絡</h4>
                {!detailApp.user_id ? (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                    <p className="text-amber-800 dark:text-amber-200 text-sm">
                      ※外部からの応募者のため、システム内メッセージは利用できません。LINE等で直接ご連絡ください。
                    </p>
                  </div>
                ) : userId ? (
                  <ChatRoom
                    applicationId={detailApp.id}
                    userId={userId}
                    viewerIsClub
                    onMarkedAsRead={(id) => setUnreadApplicationIds((prev) => { const n = new Set(prev); n.delete(id); return n; })}
                    placeholder="面接日程・Zoomリンク・合否連絡などを入力..."
                    fillHeight={false}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 候補者手動追加モーダル */}
      {manualModalOpen && (
        <>
          <div
            role="presentation"
            aria-hidden
            className="fixed inset-0 z-[200] bg-black/50"
            onClick={() => !manualSubmitting && setManualModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-add-title"
            className="fixed left-1/2 top-1/2 z-[210] w-[min(440px,92vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-600">
              <h3 id="manual-add-title" className="text-lg font-bold text-slate-900 dark:text-white">
                候補者を手動追加
              </h3>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => !manualSubmitting && setManualModalOpen(false)}
                disabled={manualSubmitting}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleManualAddSubmit} className="px-6 py-4 overflow-y-auto space-y-4">
              <div>
                <label htmlFor="manual-name" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  氏名 <span className="text-red-500">必須</span>
                </label>
                <Input
                  id="manual-name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="例: 山田 太郎"
                  required
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="manual-university" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  大学・学年など <span className="text-slate-400 font-normal">任意</span>
                </label>
                <Input
                  id="manual-university"
                  value={manualUniversity}
                  onChange={(e) => setManualUniversity(e.target.value)}
                  placeholder="例: 〇〇大学 2年"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="manual-source" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  流入経路
                </label>
                <select
                  id="manual-source"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary"
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="manual-step" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  初期ステップ
                </label>
                <select
                  id="manual-step"
                  value={manualStep}
                  onChange={(e) => setManualStep(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary"
                >
                  <option value="新規応募">新規応募</option>
                  {selectionFlow.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="manual-priority" className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                  優先度
                </label>
                <select
                  id="manual-priority"
                  value={manualPriority}
                  onChange={(e) => setManualPriority(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setManualModalOpen(false)}
                  disabled={manualSubmitting}
                  className="flex-1"
                >
                  キャンセル
                </Button>
                <Button type="submit" variant="primary" disabled={manualSubmitting} className="flex-1">
                  {manualSubmitting ? "追加中..." : "追加する"}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

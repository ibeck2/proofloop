"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

const BRAND_STROKE = "#002b5c";

function startOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function thirtyDaysAgoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function aggregateViewsByDay(
  rows: { created_at: string }[]
): { date: string; label: string; views: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const out: { date: string; label: string; views: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    out.push({ date: key, label, views: map.get(key) ?? 0 });
  }
  return out;
}

type DashboardTooltipProps = {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { label: string; views: number } }>;
};

function DashboardTooltip({ active, payload }: DashboardTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg text-sm">
      <p className="font-bold text-slate-900 dark:text-white">{p.label}</p>
      <p className="text-primary dark:text-blue-300 mt-1">
        閲覧 <span className="font-bold tabular-nums">{p.views}</span> 回
      </p>
    </div>
  );
}

export default function ClubDashboardContent() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName,
    hasNoMemberships,
    isReady,
    withOrgQuery,
  } = useClubOrganization();

  const [statsLoading, setStatsLoading] = useState(true);
  const [monthlyViews, setMonthlyViews] = useState<number | null>(null);
  const [monthlyEntries, setMonthlyEntries] = useState<number | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number | null>(null);
  const [chartSeries, setChartSeries] = useState<
    { date: string; label: string; views: number }[]
  >([]);

  const loadStats = useCallback(async () => {
    if (!orgId) return;
    setStatsLoading(true);
    const monthStart = startOfMonthISO();
    const since30 = thirtyDaysAgoISO();

    try {
      const [
        viewsRes,
        appsRes,
        appIdsRes,
        trendRes,
      ] = await Promise.all([
        supabase
          .from("organization_page_views")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .gte("created_at", monthStart),
        supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .neq("is_chat_only", true)
          .gte("created_at", monthStart),
        supabase
          .from("applications")
          .select("id")
          .eq("organization_id", orgId)
          .neq("is_chat_only", true),
        supabase
          .from("organization_page_views")
          .select("created_at")
          .eq("organization_id", orgId)
          .gte("created_at", since30),
      ]);

      setMonthlyViews(
        viewsRes.error ? null : viewsRes.count ?? 0
      );
      setMonthlyEntries(
        appsRes.error ? null : appsRes.count ?? 0
      );

      const appIds = (appIdsRes.data ?? []).map(
        (r: { id: string }) => r.id
      );
      if (appIds.length === 0) {
        setUnreadMessages(0);
      } else {
        const { count: unreadCount, error: unreadErr } = await supabase
          .from("application_messages")
          .select("*", { count: "exact", head: true })
          .in("application_id", appIds)
          .eq("is_from_club", false)
          .is("read_at", null);
        setUnreadMessages(unreadErr ? null : unreadCount ?? 0);
      }

      if (trendRes.error) {
        setChartSeries(aggregateViewsByDay([]));
      } else {
        setChartSeries(
          aggregateViewsByDay(
            (trendRes.data ?? []) as { created_at: string }[]
          )
        );
      }
    } catch (e) {
      console.error("dashboard stats:", e);
      setMonthlyViews(null);
      setMonthlyEntries(null);
      setUnreadMessages(null);
      setChartSeries(aggregateViewsByDay([]));
    } finally {
      setStatsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId && isReady) loadStats();
  }, [orgId, isReady, loadStats]);

  const welcomeTitle = activeOrgName
    ? `${activeOrgName} 管理ページへようこそ`
    : ctxLoading
      ? "読み込み中..."
      : "団体管理ページへようこそ";

  if (ctxLoading) {
    return (
      <div className="max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-10 flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            管理できる団体がありません
          </p>
        </div>
      </div>
    );
  }

  const formatKpi = (v: number | null) => {
    if (statsLoading) return "…";
    if (v === null) return "—";
    return v.toLocaleString("ja-JP");
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-primary dark:text-white text-2xl md:text-3xl font-bold tracking-tight">
            {welcomeTitle}
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded shadow-sm transition-all hover:shadow-md whitespace-nowrap font-bold text-sm"
          href="/schedule"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            add
          </span>
          新しい新歓イベントを登録する
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm mb-2">
            今月の閲覧数
          </h3>
          <p className="text-3xl font-bold tabular-nums text-primary dark:text-blue-200">
            {formatKpi(monthlyViews)}
          </p>
          <p className="text-text-sub dark:text-slate-500 text-xs mt-2">
            団体詳細ページの閲覧ログ（当月）
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm mb-2">
            今月の新規エントリー数
          </h3>
          <p className="text-3xl font-bold tabular-nums text-primary dark:text-blue-200">
            {formatKpi(monthlyEntries)}
          </p>
          <p className="text-text-sub dark:text-slate-500 text-xs mt-2">
            当月に作成された応募
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm mb-2">
            未読メッセージ
          </h3>
          <p className="text-3xl font-bold tabular-nums text-primary dark:text-blue-200">
            {formatKpi(unreadMessages)}
          </p>
          <p className="text-text-sub dark:text-slate-500 text-xs mt-2">
            応募者からの未読チャット件数
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 md:p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-primary dark:text-white text-lg font-bold mb-1">
            ページ閲覧数の推移
          </h3>
          <p className="text-text-sub dark:text-slate-400 text-sm mb-6">
            過去30日間（団体詳細ページ）
          </p>
          {statsLoading ? (
            <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
              読み込み中...
            </div>
          ) : (
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartSeries}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                    className="dark:stroke-slate-600"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={{ stroke: "#cbd5e1" }}
                    width={36}
                  />
                  <Tooltip content={<DashboardTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="views"
                    name="閲覧数"
                    stroke={BRAND_STROKE}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: BRAND_STROKE, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: BRAND_STROKE }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-primary dark:text-white text-lg font-bold mb-4">
            直近の実績・イベント
          </h3>
          <p className="text-text-sub dark:text-slate-400 text-sm mb-4">
            口コミ・レビュー管理から承認済みの声を確認できます。
          </p>
          <Link
            href={withOrgQuery("/clubdashboard/reviews")}
            className="block w-full py-2 text-center text-sm font-bold text-primary dark:text-blue-300 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            口コミ・レビュー管理へ
          </Link>
          <Link
            href={withOrgQuery("/clubmessages")}
            className="block w-full py-2 mt-2 text-center text-sm font-bold text-primary dark:text-blue-300 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            メッセージへ
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { COLORS } from "@/lib/design/tokens";

// recharts は className ではなく実際の色値を要求するため、トークンの値をそのまま使う。
const BRAND_STROKE = COLORS.ink;
const GRID_STROKE = COLORS.rule;
const TICK_FILL = COLORS.graphite;

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
    <div className="rounded-md border border-rule bg-paper px-3 py-2 shadow-lg text-sm font-body">
      <p className="font-bold text-graphite">{p.label}</p>
      <p className="text-ink mt-1">
        閲覧 <span className="font-bold font-numeric tabular-nums">{p.views}</span> 回
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
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-10">
        <div className="border border-rule border-l-4 border-l-seal bg-mist p-6 text-center">
          <p className="text-ink font-bold font-body">
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
          <h2 className="font-mincho text-ink text-2xl md:text-3xl font-bold tracking-tight">
            {welcomeTitle}
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 bg-ink hover:bg-ink/90 text-paper px-6 py-3 rounded shadow-sm transition-all hover:shadow-md whitespace-nowrap font-bold text-sm font-body"
          href="/schedule"
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          新しい新歓イベントを登録する
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-paper p-8 rounded shadow-sm border border-rule">
          <h3 className="text-graphite/70 font-medium text-sm mb-2 font-body">
            今月の閲覧数
          </h3>
          <p className="text-3xl font-bold font-numeric tabular-nums text-ink">
            {formatKpi(monthlyViews)}
          </p>
          <p className="text-graphite/70 text-xs mt-2 font-body">
            団体詳細ページの閲覧ログ（当月）
          </p>
        </div>
        <div className="bg-paper p-8 rounded shadow-sm border border-rule">
          <h3 className="text-graphite/70 font-medium text-sm mb-2 font-body">
            今月の新規エントリー数
          </h3>
          <p className="text-3xl font-bold font-numeric tabular-nums text-ink">
            {formatKpi(monthlyEntries)}
          </p>
          <p className="text-graphite/70 text-xs mt-2 font-body">
            当月に作成された応募
          </p>
        </div>
        <div className="bg-paper p-8 rounded shadow-sm border border-rule">
          <h3 className="text-graphite/70 font-medium text-sm mb-2 font-body">
            未読メッセージ
          </h3>
          <p className="text-3xl font-bold font-numeric tabular-nums text-ink">
            {formatKpi(unreadMessages)}
          </p>
          <p className="text-graphite/70 text-xs mt-2 font-body">
            応募者からの未読チャット件数
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-paper p-6 md:p-8 rounded shadow-sm border border-rule">
          <h3 className="text-ink text-lg font-bold mb-1 font-body">
            ページ閲覧数の推移
          </h3>
          <p className="text-graphite/70 text-sm mb-6 font-body">
            過去30日間（団体詳細ページ）
          </p>
          {statsLoading ? (
            <div className="h-[300px] flex items-center justify-center text-graphite/70 text-sm">
              読み込み中...
            </div>
          ) : (
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartSeries}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={{ stroke: GRID_STROKE }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: TICK_FILL }}
                    tickLine={false}
                    axisLine={{ stroke: GRID_STROKE }}
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
        <div className="lg:col-span-1 bg-paper p-8 rounded shadow-sm border border-rule">
          <h3 className="text-ink text-lg font-bold mb-4 font-body">
            直近の実績・イベント
          </h3>
          <p className="text-graphite/70 text-sm mb-4 font-body">
            口コミ・レビュー管理から承認済みの声を確認できます。
          </p>
          <Link
            href={withOrgQuery("/clubdashboard/reviews")}
            className="block w-full py-2 text-center text-sm font-bold text-ink border border-rule rounded hover:bg-mist transition-colors font-body"
          >
            口コミ・レビュー管理へ
          </Link>
          <Link
            href={withOrgQuery("/clubmessages")}
            className="block w-full py-2 mt-2 text-center text-sm font-bold text-ink border border-rule rounded hover:bg-mist transition-colors font-body"
          >
            メッセージへ
          </Link>
        </div>
      </div>
    </div>
  );
}

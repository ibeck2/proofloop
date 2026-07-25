"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import type { FinanceBudget, FinanceCategory, FinancePeriod, FinanceProject, FinanceTransaction } from "@/lib/finance/types";
import { aggregateByCategory, summarize, buildLedgerRows, type CategoryAggregate } from "@/lib/finance/aggregate";
import { buildFinanceWorkbookBlob, reportFileName, type FinanceReportData } from "@/lib/finance/xlsx";

function yen(n: number): string { return `¥${n.toLocaleString("ja-JP")}`; }

export default function FinanceReportContent() {
  const { loading: ctxLoading, activeOrgId: orgId, activeOrgName: orgName, isReady, hasNoMemberships } = useClubOrganization();
  const [period, setPeriod] = useState<FinancePeriod | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [txns, setTxns] = useState<FinanceTransaction[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data: periods } = await supabase.from("finance_periods")
      .select("*").eq("organization_id", orgId).order("starts_on", { ascending: false });
    const p = (periods?.[0] as FinancePeriod) ?? null;
    setPeriod(p);
    const { data: cats } = await supabase.from("finance_categories")
      .select("*").eq("organization_id", orgId).order("sort_order", { ascending: true });
    setCategories((cats as FinanceCategory[]) ?? []);
    const { data: projs } = await supabase.from("finance_projects").select("*").eq("organization_id", orgId);
    setProjects((projs as FinanceProject[]) ?? []);
    if (p) {
      const { data: tx } = await supabase.from("finance_transactions").select("*").eq("organization_id", orgId).eq("period_id", p.id);
      setTxns((tx as FinanceTransaction[]) ?? []);
      const { data: bd } = await supabase.from("finance_budgets").select("*").eq("organization_id", orgId).eq("period_id", p.id);
      setBudgets((bd as FinanceBudget[]) ?? []);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { if (orgId) load(); }, [orgId, load]);

  const agg = useMemo(() => aggregateByCategory(categories, txns, budgets), [categories, txns, budgets]);
  const income = agg.filter((a) => a.kind === "income");
  const expense = agg.filter((a) => a.kind === "expense");
  const summary = period ? summarize(period.opening_balance, txns) : null;

  const handleExport = async () => {
    if (!period || !summary) return;
    setExporting(true);
    try {
      const data: FinanceReportData = {
        orgName: orgName ?? "学生団体",
        period,
        summary,
        incomeRows: income,
        expenseRows: expense,
        ledgerRows: buildLedgerRows(period.opening_balance, txns, categories, projects),
      };
      const blob = await buildFinanceWorkbookBlob(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reportFileName(data.orgName, period.name);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Excelの生成に失敗しました");
    } finally {
      setExporting(false);
    }
  };

  if (ctxLoading) return <div className="p-6 md:p-10"><p className="text-graphite/70 py-20 text-center">読み込み中...</p></div>;
  if (hasNoMemberships || !isReady || !orgId) {
    return <div className="p-6 md:p-10"><div className="rounded-lg border border-rule bg-mist p-6 text-center text-graphite">会計データがありません。</div></div>;
  }
  if (loading) return <div className="p-6 md:p-10"><p className="text-graphite/70 py-20 text-center">読み込み中...</p></div>;
  if (!period || !summary) {
    return <div className="p-6 md:p-10"><div className="rounded-lg border border-rule bg-mist p-6 text-center text-graphite">会計データがありません。</div></div>;
  }

  const Table = ({ title, rows, totalLabel, total }: { title: string; rows: CategoryAggregate[]; totalLabel: string; total: number }) => (
    <div className="rounded-xl border border-rule bg-paper overflow-x-auto mb-6">
      <div className="px-4 py-2 bg-mist font-bold text-ink">{title}</div>
      <table className="w-full text-sm min-w-[520px]">
        <thead className="text-graphite">
          <tr>
            <th className="text-left px-3 py-2">費目</th>
            <th className="text-right px-3 py-2">予算</th>
            <th className="text-right px-3 py-2">実績</th>
            <th className="text-right px-3 py-2">差額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category_id} className="border-t border-rule">
              <td className="px-3 py-2">{r.category_name}</td>
              <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(r.planned)}</td>
              <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(r.actual)}</td>
              <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(r.diff)}</td>
            </tr>
          ))}
          <tr className="border-t border-rule bg-mist font-bold">
            <td className="px-3 py-2">{totalLabel}</td>
            <td></td>
            <td className="px-3 py-2 text-right font-numeric tabular-nums">{yen(total)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink font-mincho">集計・レポート</h1>
          <p className="text-graphite text-sm mt-1">{orgName}・{period.name}</p>
          <Link href={`/clubfinance?orgId=${orgId}`} className="text-sm text-ink underline">← 出納帳に戻る</Link>
        </div>
        <Button variant="primary" onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2">
          <Download className="w-5 h-5" aria-hidden="true" />{exporting ? "生成中..." : "Excelで出力"}
        </Button>
      </div>

      <Table title="収入の部" rows={income} totalLabel="収入合計" total={summary.incomeTotal} />
      <Table title="支出の部" rows={expense} totalLabel="支出合計" total={summary.expenseTotal} />

      <div className="rounded-xl border border-rule bg-paper p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><p className="text-xs text-graphite">前期繰越金</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.openingBalance)}</p></div>
        <div><p className="text-xs text-graphite">当期収入</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.incomeTotal)}</p></div>
        <div><p className="text-xs text-graphite">当期支出</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.expenseTotal)}</p></div>
        <div><p className="text-xs text-graphite">期末残高</p><p className="text-lg font-bold text-ink font-numeric tabular-nums">{yen(summary.closingBalance)}</p></div>
      </div>
    </div>
  );
}

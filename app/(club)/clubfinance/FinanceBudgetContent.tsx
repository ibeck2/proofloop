"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import type { FinanceBudget, FinanceCategory, FinanceKind, FinancePeriod } from "@/lib/finance/types";

const CATEGORY_KINDS: FinanceKind[] = ["income", "expense"];
const CATEGORY_KIND_LABEL: Record<FinanceKind, string> = {
  income: "収入",
  expense: "支出",
};

function toPlannedAmount(raw: string): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export default function FinanceBudgetContent() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [canManage, setCanManage] = useState(false);
  const [period, setPeriod] = useState<FinancePeriod | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;
    let manage = false;
    if (uid) {
      const { data: mem } = await supabase
        .from("organization_members")
        .select("can_manage_finance")
        .eq("organization_id", orgId)
        .eq("user_id", uid)
        .maybeSingle();
      manage = !!(mem as { can_manage_finance?: boolean } | null)?.can_manage_finance;
    }
    setCanManage(manage);

    const { data: periods } = await supabase
      .from("finance_periods")
      .select("*")
      .eq("organization_id", orgId)
      .order("starts_on", { ascending: false });
    const activePeriod = (periods?.[0] as FinancePeriod) ?? null;
    setPeriod(activePeriod);

    const { data: cats } = await supabase
      .from("finance_categories")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_archived", false)
      .order("sort_order", { ascending: true });
    setCategories((cats as FinanceCategory[]) ?? []);

    if (activePeriod) {
      const { data: buds } = await supabase
        .from("finance_budgets")
        .select("*")
        .eq("period_id", activePeriod.id);
      const map: Record<string, string> = {};
      ((buds as FinanceBudget[]) ?? []).forEach((b) => {
        map[b.category_id] = String(b.planned_amount);
      });
      setAmounts(map);
    } else {
      setAmounts({});
    }

    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (orgId) load();
  }, [orgId, load]);

  const handleSave = async () => {
    if (!orgId || !period) return;
    setSaving(true);
    try {
      const rows = categories.map((cat) => ({
        organization_id: orgId,
        period_id: period.id,
        category_id: cat.id,
        kind: cat.kind,
        planned_amount: toPlannedAmount(amounts[cat.id] ?? ""),
      }));
      if (rows.length > 0) {
        const { error } = await supabase
          .from("finance_budgets")
          .upsert(rows, { onConflict: "period_id,category_id" });
        if (error) throw error;
      }
      toast.success("予算を保存しました");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (ctxLoading) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-graphite/70 py-20 text-center">読み込み中...</p>
      </div>
    );
  }
  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-rule border-l-4 border-l-seal bg-mist p-6 text-center">
          <p className="text-ink font-medium">管理できる団体がありません</p>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="p-6 md:p-10">
        <p className="text-graphite/70 py-20 text-center">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <Link
          href={`/clubfinance?orgId=${orgId}`}
          className="inline-flex items-center gap-1 text-sm text-graphite hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          会計・財務に戻る
        </Link>
        <h1 className="text-2xl font-bold text-ink font-mincho mt-2">予算</h1>
        <p className="text-graphite text-sm mt-1">
          {orgName}
          {period && `・${period.name}`}
        </p>
        {!canManage && (
          <p className="text-graphite text-xs mt-2">閲覧のみ可能です（編集には会計担当の権限が必要です）。</p>
        )}
      </div>

      {!period ? (
        <div className="rounded-lg border border-rule bg-mist p-6 text-center">
          <p className="text-ink font-medium">会計はまだ初期設定されていません</p>
          <p className="text-graphite text-sm mt-1">会計担当が「会計・財務」ページに最初にアクセスすると自動で初期設定されます。</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {CATEGORY_KINDS.map((kind) => (
              <div key={kind} className="rounded-xl border border-rule bg-paper p-4">
                <h2 className="text-sm font-bold text-ink mb-3">{CATEGORY_KIND_LABEL[kind]}費目の予算</h2>
                <div className="space-y-2">
                  {categories
                    .filter((c) => c.kind === kind)
                    .map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-ink">{cat.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-graphite">¥</span>
                          <Input
                            type="number"
                            value={amounts[cat.id] ?? ""}
                            onChange={(e) =>
                              setAmounts((prev) => ({ ...prev, [cat.id]: e.target.value }))
                            }
                            disabled={!canManage}
                            className="text-sm text-right font-numeric tabular-nums w-32"
                          />
                        </div>
                      </div>
                    ))}
                  {categories.filter((c) => c.kind === kind).length === 0 && (
                    <p className="text-graphite/70 text-sm">費目がまだありません。</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canManage && (
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

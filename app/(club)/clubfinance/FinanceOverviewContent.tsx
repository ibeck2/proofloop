"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";
import type { FinanceCategory, FinancePeriod, FinanceProject, FinanceTransaction } from "@/lib/finance/types";
import { DEFAULT_CATEGORIES, FEE_CATEGORY_NAME, defaultPeriodForDate, nextReceiptNo } from "@/lib/finance/defaults";
import { currentBalance, sumByKind, sortForLedger } from "@/lib/finance/balance";
import { buildFeePayload, planFeeReconciliation, type NewTxnPayload } from "@/lib/finance/fee";
import TransactionModal, { type TxnSubmit } from "./TransactionModal";

function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function FinanceOverviewContent() {
  const { loading: ctxLoading, activeOrgId: orgId, activeOrgName: orgName, hasNoMemberships, isReady } = useClubOrganization();

  const [canManage, setCanManage] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [period, setPeriod] = useState<FinancePeriod | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [projects, setProjects] = useState<FinanceProject[]>([]);
  const [txns, setTxns] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);

    // 権限
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;
    setUserId(uid);
    let manage = false;
    if (uid) {
      const { data: mem } = await supabase.from("organization_members")
        .select("can_manage_finance").eq("organization_id", orgId).eq("user_id", uid).maybeSingle();
      manage = !!(mem as { can_manage_finance?: boolean } | null)?.can_manage_finance;
    }
    setCanManage(manage);

    // 期間（無ければ会計担当が作成）
    const { data: periods, error: periodsErr } = await supabase.from("finance_periods")
      .select("*").eq("organization_id", orgId).order("starts_on", { ascending: false });
    if (periodsErr) {
      toast.error("会計期間の読み込みに失敗しました");
      setLoading(false);
      return;
    }
    let periodList = (periods as FinancePeriod[]) ?? [];
    if (periodList.length === 0 && manage) {
      const def = defaultPeriodForDate(new Date());
      const { data: created, error } = await supabase.from("finance_periods")
        .insert({ organization_id: orgId, ...def, opening_balance: 0 }).select("*").single();
      if (error) {
        // 競合（他の会計担当が同時に作成）の可能性 → 再読込で既存を採用
        const { data: reread } = await supabase.from("finance_periods")
          .select("*").eq("organization_id", orgId).order("starts_on", { ascending: false });
        periodList = (reread as FinancePeriod[]) ?? [];
        if (periodList.length === 0) toast.error("会計期間の作成に失敗しました");
      } else if (created) {
        periodList = [created as FinancePeriod];
      }
    }
    const activePeriod = periodList[0] ?? null;
    setPeriod(activePeriod);

    // 費目（無ければ会計担当が初期投入）
    const { data: cats, error: catsErr } = await supabase.from("finance_categories")
      .select("*").eq("organization_id", orgId).order("sort_order", { ascending: true });
    if (catsErr) {
      toast.error("費目の読み込みに失敗しました");
      setLoading(false);
      return;
    }
    let catList = (cats as FinanceCategory[]) ?? [];
    if (catList.length === 0 && manage) {
      const rows = DEFAULT_CATEGORIES.map((c, i) => ({ organization_id: orgId, name: c.name, kind: c.kind, sort_order: i }));
      const { data: inserted, error: insErr } = await supabase.from("finance_categories").insert(rows).select("*");
      if (insErr) {
        // 競合の可能性 → 再読込で既存を採用
        const { data: reread } = await supabase.from("finance_categories")
          .select("*").eq("organization_id", orgId).order("sort_order", { ascending: true });
        catList = (reread as FinanceCategory[]) ?? [];
      } else {
        catList = (inserted as FinanceCategory[]) ?? [];
      }
    }
    setCategories(catList);

    const { data: projs } = await supabase.from("finance_projects")
      .select("*").eq("organization_id", orgId).order("created_at", { ascending: true });
    setProjects((projs as FinanceProject[]) ?? []);

    if (activePeriod) {
      const { data: tx } = await supabase.from("finance_transactions")
        .select("*").eq("organization_id", orgId).eq("period_id", activePeriod.id);
      setTxns((tx as FinanceTransaction[]) ?? []);
    } else {
      setTxns([]);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => { if (orgId) load(); }, [orgId, load]);

  const ledger = useMemo(() => sortForLedger(txns), [txns]);
  const balance = period ? currentBalance(period.opening_balance, txns) : 0;
  const feeCategory = categories.find((c) => c.kind === "expense" && c.name === FEE_CATEGORY_NAME) ?? null;

  const openNew = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t: FinanceTransaction) => { setEditing(t); setModalOpen(true); };

  const openReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("finance-receipts").createSignedUrl(path, 60);
    if (error || !data) { toast.error("領収書を開けませんでした"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleSubmit = async ({ values, file }: TxnSubmit) => {
    if (!orgId || !period) return;
    const amount = Math.round(Number(values.amount));
    if (!values.category_id || !Number.isFinite(amount) || amount < 0) {
      toast.error("費目と金額を正しく入力してください");
      return;
    }
    setSaving(true);
    let feeUnrecorded = false;
    try {
      const base: NewTxnPayload = {
        organization_id: orgId, period_id: period.id, occurred_on: values.occurred_on,
        kind: values.kind, category_id: values.category_id,
        project_id: values.project_id || null, amount, memo: values.memo.trim() || null,
        receipt_no: values.receipt_no.trim() || null, parent_transaction_id: null,
      };

      let txnId: string;
      if (editing) {
        const { error } = await supabase.from("finance_transactions")
          .update({ ...base, updated_at: new Date().toISOString() }).eq("id", editing.id);
        if (error) throw error;
        txnId = editing.id;
      } else {
        const { data, error } = await supabase.from("finance_transactions").insert({ ...base, created_by: userId }).select("id").single();
        if (error) throw error;
        txnId = (data as { id: string }).id;
      }

      // 領収書アップロード（差し替え時は旧オブジェクトを削除して孤児化を防ぐ）
      if (file) {
        const oldPath = editing?.receipt_path ?? null;
        const path = `${orgId}/${txnId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("finance-receipts").upload(path, file, { upsert: true });
        if (upErr) { toast.error("領収書の保存に失敗しました"); }
        else {
          await supabase.from("finance_transactions").update({ receipt_path: path }).eq("id", txnId);
          if (oldPath && oldPath !== path) {
            await supabase.storage.from("finance-receipts").remove([oldPath]);
          }
        }
      }

      // 手数料行の同期（新規・編集どちらも。手数料を持つのは支出のみ）
      const feeAmount = Math.round(Number(values.fee));
      const existingFee = editing ? txns.find((x) => x.parent_transaction_id === editing.id) ?? null : null;
      const feeAction = planFeeReconciliation({
        kind: values.kind,
        newFeeAmount: feeAmount,
        hasExistingFee: !!existingFee,
      });
      if (feeAction === "insert") {
        if (!feeCategory) { feeUnrecorded = true; }
        else {
          const feePayload = buildFeePayload(base, feeCategory.id, feeAmount, txnId);
          if (feePayload) {
            const { error: feeErr } = await supabase.from("finance_transactions").insert(feePayload);
            if (feeErr) throw feeErr;
          }
        }
      } else if (feeAction === "update" && existingFee) {
        const { error: feeErr } = await supabase.from("finance_transactions")
          .update({ amount: feeAmount, occurred_on: base.occurred_on, project_id: base.project_id, updated_at: new Date().toISOString() })
          .eq("id", existingFee.id);
        if (feeErr) throw feeErr;
      } else if (feeAction === "delete" && existingFee) {
        const { error: feeErr } = await supabase.from("finance_transactions").delete().eq("id", existingFee.id);
        if (feeErr) throw feeErr;
      }

      if (feeUnrecorded) {
        toast.error("取引は保存しましたが、支払手数料の費目が見つからず手数料を記録できませんでした。設定で費目を確認してください");
      } else {
        toast.success(editing ? "取引を更新しました" : "取引を追加しました");
      }
      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: FinanceTransaction) => {
    // 子（手数料行）は DB の ON DELETE CASCADE で消えるが、Storage は連動しない。
    // 親・子の領収書オブジェクトを集めて削除し、孤児化を防ぐ。
    const childFee = txns.find((x) => x.parent_transaction_id === t.id) ?? null;
    const paths = [t.receipt_path, childFee?.receipt_path].filter((p): p is string => !!p);
    const { error } = await supabase.from("finance_transactions").delete().eq("id", t.id);
    if (error) { toast.error("削除に失敗しました"); return; }
    if (paths.length > 0) {
      await supabase.storage.from("finance-receipts").remove(paths);
    }
    toast.success("削除しました");
    await load();
  };

  if (ctxLoading) {
    return <div className="p-6 md:p-10"><p className="text-graphite/70 py-20 text-center">読み込み中...</p></div>;
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
    return <div className="p-6 md:p-10"><p className="text-graphite/70 py-20 text-center">読み込み中...</p></div>;
  }
  if (!period) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-rule bg-mist p-6 text-center">
          <p className="text-ink font-medium">会計はまだ初期設定されていません</p>
          <p className="text-graphite text-sm mt-1">会計担当が最初にアクセスすると自動で初期設定されます。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink font-mincho">会計・財務</h1>
          <p className="text-graphite text-sm mt-1">{orgName}・{period.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/clubfinance/report?orgId=${orgId}`}><Button variant="outlineMuted">集計・Excel出力</Button></Link>
          <Link href={`/clubfinance/budget?orgId=${orgId}`}><Button variant="outlineMuted">予算</Button></Link>
          <Link href={`/clubfinance/settings?orgId=${orgId}`}><Button variant="outlineMuted">設定</Button></Link>
          {canManage && (
            <Button variant="primary" onClick={openNew} className="inline-flex items-center gap-2">
              <Plus className="w-5 h-5" aria-hidden="true" />取引を追加
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-rule bg-paper p-4">
          <p className="text-xs text-graphite">現在残高</p>
          <p className="text-2xl font-bold text-ink font-numeric tabular-nums">{yen(balance)}</p>
        </div>
        <div className="rounded-xl border border-rule bg-paper p-4">
          <p className="text-xs text-graphite">当期収入計</p>
          <p className="text-2xl font-bold text-ink font-numeric tabular-nums">{yen(sumByKind(txns, "income"))}</p>
        </div>
        <div className="rounded-xl border border-rule bg-paper p-4">
          <p className="text-xs text-graphite">当期支出計</p>
          <p className="text-2xl font-bold text-ink font-numeric tabular-nums">{yen(sumByKind(txns, "expense"))}</p>
        </div>
      </div>

      {ledger.length === 0 ? (
        <div className="rounded-lg border border-rule bg-mist p-6 text-center text-graphite">まだ取引がありません。</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-rule bg-paper">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-mist text-graphite">
              <tr>
                <th className="text-left px-3 py-2">日付</th>
                <th className="text-left px-3 py-2">費目</th>
                <th className="text-left px-3 py-2">事業</th>
                <th className="text-left px-3 py-2">摘要</th>
                <th className="text-right px-3 py-2">収入</th>
                <th className="text-right px-3 py-2">支出</th>
                <th className="px-3 py-2"></th>
                {canManage && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {ledger.map((t) => {
                const cat = categories.find((c) => c.id === t.category_id);
                const proj = projects.find((p) => p.id === t.project_id);
                return (
                  <tr key={t.id} className="border-t border-rule">
                    <td className="px-3 py-2 font-numeric tabular-nums">{t.occurred_on}</td>
                    <td className="px-3 py-2">{cat?.name ?? ""}{t.parent_transaction_id && <span className="text-xs text-graphite/60">（手数料）</span>}</td>
                    <td className="px-3 py-2">{proj?.name ?? ""}</td>
                    <td className="px-3 py-2">{t.memo ?? ""}</td>
                    <td className="px-3 py-2 text-right font-numeric tabular-nums">{t.kind === "income" ? yen(t.amount) : ""}</td>
                    <td className="px-3 py-2 text-right font-numeric tabular-nums">{t.kind === "expense" ? yen(t.amount) : ""}</td>
                    <td className="px-3 py-2 text-center">
                      {t.receipt_path && (
                        <button
                          type="button"
                          onClick={() => openReceipt(t.receipt_path!)}
                          aria-label="領収書を開く"
                          className="inline-flex items-center justify-center text-graphite/70 hover:text-ink"
                        >
                          <Paperclip className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {!t.parent_transaction_id && <button className="text-xs text-ink underline mr-2" onClick={() => openEdit(t)}>編集</button>}
                        <button className="text-xs text-seal underline" onClick={() => handleDelete(t)}>削除</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <TransactionModal
          open={modalOpen}
          editing={editing}
          categories={categories}
          projects={projects}
          defaultReceiptNo={nextReceiptNo(txns)}
          defaultFee={editing ? (txns.find((x) => x.parent_transaction_id === editing.id)?.amount ?? 0) : 0}
          saving={saving}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

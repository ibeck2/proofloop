"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { aggregateByCategory, summarize } from "@/lib/finance/aggregate";
import type { FinanceKind, FinanceTransaction } from "@/lib/finance/types";
import {
  DEMO_BUDGETS,
  DEMO_CATEGORIES,
  DEMO_DEFAULT_DATE,
  DEMO_OPENING_BALANCE,
  DEMO_ORG_NAME,
  DEMO_PERIOD_NAME,
  DEMO_TRANSACTIONS,
  makeDemoTransaction,
} from "@/lib/for-clubs/financeDemoData";

const yen = new Intl.NumberFormat("ja-JP");

export default function FinanceDemo() {
  const [txns, setTxns] = useState<FinanceTransaction[]>(DEMO_TRANSACTIONS);
  const [seq, setSeq] = useState(0);
  const [date, setDate] = useState(DEMO_DEFAULT_DATE);
  const [kind, setKind] = useState<FinanceKind>("expense");
  const [categoryId, setCategoryId] = useState("cat-venue");
  const [amount, setAmount] = useState("8000");
  const [memo, setMemo] = useState("スタジオ利用料（7月）");

  const summary = useMemo(() => summarize(DEMO_OPENING_BALANCE, txns), [txns]);
  const rows = useMemo(
    () => aggregateByCategory(DEMO_CATEGORIES, txns, DEMO_BUDGETS),
    [txns]
  );
  const recent = useMemo(
    () => [...txns].sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1)).slice(0, 5),
    [txns]
  );

  const selectable = DEMO_CATEGORIES.filter((c) => c.kind === kind);

  function handleKindChange(next: FinanceKind) {
    setKind(next);
    const first = DEMO_CATEGORIES.find((c) => c.kind === next);
    if (first) setCategoryId(first.id);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const next = seq + 1;
    setSeq(next);
    setTxns((prev) => [
      ...prev,
      makeDemoTransaction({
        id: `demo-new-${next}`,
        occurred_on: date,
        kind,
        category_id: categoryId,
        amount: Math.round(value),
        memo: memo.trim() || "（摘要なし）",
      }),
    ]);
    setAmount("");
    setMemo("");
  }

  function handleReset() {
    setTxns(DEMO_TRANSACTIONS);
    setSeq(0);
    setDate(DEMO_DEFAULT_DATE);
    handleKindChange("expense");
    setAmount("8000");
    setMemo("スタジオ利用料（7月）");
  }

  const field =
    "w-full border border-rule bg-paper px-3 py-2 text-sm text-graphite focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ink";

  return (
    <div className="border border-rule bg-paper">
      {/* 見出し */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule bg-mist px-5 py-3">
        <span className="text-sm font-bold text-ink">{DEMO_ORG_NAME}</span>
        <span className="text-xs text-graphite">{DEMO_PERIOD_NAME}の会計</span>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-2">
        {/* 左：残高と予算対比 */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs text-graphite">現在の残高</p>
            <p className="font-numeric tabular-nums text-3xl font-black text-ink">
              ¥{yen.format(summary.closingBalance)}
            </p>
            <div className="mt-2 flex gap-4 text-xs text-graphite">
              <span>
                収入{" "}
                <strong className="font-numeric tabular-nums text-ink">
                  ¥{yen.format(summary.incomeTotal)}
                </strong>
              </span>
              <span>
                支出{" "}
                <strong className="font-numeric tabular-nums text-ink">
                  ¥{yen.format(summary.expenseTotal)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-ink">費目別の予算対比</p>
            {rows.map((r) => {
              const ratio = r.planned > 0 ? Math.min(r.actual / r.planned, 1) : 0;
              return (
                <div key={r.category_id} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-graphite">{r.category_name}</span>
                    <span className="font-numeric tabular-nums text-graphite">
                      {yen.format(r.actual)} / {yen.format(r.planned)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-mist">
                    <div
                      className="h-1.5 bg-ink transition-all duration-300"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右：入力と履歴 */}
        <div className="flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-xs font-bold text-ink">記録してみる</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                aria-label="日付"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={field}
              />
              <select
                aria-label="収支区分"
                value={kind}
                onChange={(e) => handleKindChange(e.target.value as FinanceKind)}
                className={field}
              >
                <option value="expense">支出</option>
                <option value="income">収入</option>
              </select>
              <select
                aria-label="費目"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={field}
              >
                {selectable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                aria-label="金額"
                placeholder="金額"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${field} font-numeric tabular-nums`}
              />
            </div>
            <input
              type="text"
              aria-label="摘要"
              placeholder="摘要"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className={field}
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="bg-ink px-5 py-2 text-sm font-bold text-paper transition hover:bg-ink/90"
              >
                記録する
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 text-xs text-graphite underline transition hover:text-ink"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                最初に戻す
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-1 border-t border-rule pt-3">
            <p className="text-xs font-bold text-ink">最近の記録</p>
            <ul className="flex flex-col">
              {recent.map((t) => {
                const cat = DEMO_CATEGORIES.find((c) => c.id === t.category_id);
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 border-b border-rule py-1.5 text-xs last:border-0"
                  >
                    <span className="font-numeric tabular-nums text-graphite">{t.occurred_on}</span>
                    <span className="flex-1 truncate text-graphite">
                      {cat?.name}／{t.memo}
                    </span>
                    <span className="font-numeric tabular-nums font-bold text-ink">
                      {t.kind === "income" ? "+" : "−"}
                      {yen.format(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <p className="border-t border-rule bg-mist px-5 py-3 text-xs text-graphite">
        この計算は製品と同じコードが動いています（残高・費目別集計・予算対比）。
      </p>
    </div>
  );
}

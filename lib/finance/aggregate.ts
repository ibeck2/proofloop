import type {
  FinanceBudget, FinanceCategory, FinanceProject, FinanceTransaction,
} from "./types";
import { sumByKind, withRunningBalance } from "./balance";

export type CategoryAggregate = {
  category_id: string;
  category_name: string;
  kind: "income" | "expense";
  planned: number;
  actual: number;
  diff: number; // planned - actual
};

export function aggregateByCategory(
  categories: FinanceCategory[],
  txns: FinanceTransaction[],
  budgets: FinanceBudget[]
): CategoryAggregate[] {
  const actualByCat = new Map<string, number>();
  for (const t of txns) {
    actualByCat.set(t.category_id, (actualByCat.get(t.category_id) ?? 0) + t.amount);
  }
  const plannedByCat = new Map<string, number>();
  for (const b of budgets) {
    plannedByCat.set(b.category_id, b.planned_amount);
  }
  return categories.map((c) => {
    const actual = actualByCat.get(c.id) ?? 0;
    const planned = plannedByCat.get(c.id) ?? 0;
    return {
      category_id: c.id,
      category_name: c.name,
      kind: c.kind,
      planned,
      actual,
      diff: planned - actual,
    };
  });
}

export type FinancialSummary = {
  incomeTotal: number;
  expenseTotal: number;
  openingBalance: number;
  closingBalance: number;
};

export function summarize(
  openingBalance: number,
  txns: FinanceTransaction[]
): FinancialSummary {
  const incomeTotal = sumByKind(txns, "income");
  const expenseTotal = sumByKind(txns, "expense");
  return {
    incomeTotal,
    expenseTotal,
    openingBalance,
    closingBalance: openingBalance + incomeTotal - expenseTotal,
  };
}

export type LedgerRow = {
  id: string;
  occurred_on: string;
  kindLabel: string;
  category_name: string;
  project_name: string;
  memo: string;
  income: number;
  expense: number;
  running_balance: number;
  receipt_no: string;
};

export function buildLedgerRows(
  openingBalance: number,
  txns: FinanceTransaction[],
  categories: FinanceCategory[],
  projects: FinanceProject[]
): LedgerRow[] {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const projName = new Map(projects.map((p) => [p.id, p.name]));
  return withRunningBalance(openingBalance, txns).map((t) => ({
    id: t.id,
    occurred_on: t.occurred_on,
    kindLabel: t.kind === "income" ? "収入" : "支出",
    category_name: catName.get(t.category_id) ?? "",
    project_name: t.project_id ? projName.get(t.project_id) ?? "" : "",
    memo: t.memo ?? "",
    income: t.kind === "income" ? t.amount : 0,
    expense: t.kind === "expense" ? t.amount : 0,
    running_balance: t.running_balance,
    receipt_no: t.receipt_no ?? "",
  }));
}

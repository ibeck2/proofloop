import { describe, it, expect } from "vitest";
import { aggregateByCategory, summarize, buildLedgerRows } from "./aggregate";
import type { FinanceCategory, FinanceProject, FinanceTransaction, FinanceBudget } from "./types";

const cats: FinanceCategory[] = [
  { id: "c1", organization_id: "o", name: "協賛金", kind: "income", sort_order: 0, is_archived: false },
  { id: "c2", organization_id: "o", name: "会場費", kind: "expense", sort_order: 1, is_archived: false },
];
const projs: FinanceProject[] = [
  { id: "p1", organization_id: "o", name: "夏合宿", kind: "event", is_archived: false },
];
function tx(p: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: "x", organization_id: "o", period_id: "per",
    occurred_on: "2026-05-01", kind: "expense", category_id: "c2",
    project_id: null, amount: 0, memo: null, receipt_path: null,
    receipt_no: null, parent_transaction_id: null, created_by: null,
    created_at: "2026-05-01T00:00:00Z", ...p,
  };
}

describe("aggregateByCategory", () => {
  it("費目別に実績と予算差を出す", () => {
    const txns = [tx({ category_id: "c1", kind: "income", amount: 10000 }), tx({ category_id: "c2", kind: "expense", amount: 3000 })];
    const budgets: FinanceBudget[] = [
      { id: "b1", organization_id: "o", period_id: "per", category_id: "c2", kind: "expense", planned_amount: 5000 },
    ];
    const agg = aggregateByCategory(cats, txns, budgets);
    const venue = agg.find((a) => a.category_id === "c2")!;
    expect(venue.actual).toBe(3000);
    expect(venue.planned).toBe(5000);
    expect(venue.diff).toBe(2000); // planned - actual
    const spon = agg.find((a) => a.category_id === "c1")!;
    expect(spon.actual).toBe(10000);
    expect(spon.planned).toBe(0);
  });
});

describe("summarize", () => {
  it("収支と期末残高", () => {
    const txns = [tx({ kind: "income", amount: 10000 }), tx({ kind: "expense", amount: 3000 })];
    const s = summarize(2000, txns);
    expect(s.incomeTotal).toBe(10000);
    expect(s.expenseTotal).toBe(3000);
    expect(s.openingBalance).toBe(2000);
    expect(s.closingBalance).toBe(9000);
  });
});

describe("buildLedgerRows", () => {
  it("収入/支出を分けて費目名・事業名・累計残高を付ける", () => {
    const txns = [
      tx({ id: "a", occurred_on: "2026-05-01", category_id: "c1", kind: "income", amount: 10000, project_id: "p1", receipt_no: "1" }),
      tx({ id: "b", occurred_on: "2026-05-02", category_id: "c2", kind: "expense", amount: 3000 }),
    ];
    const rows = buildLedgerRows(0, txns, cats, projs);
    expect(rows[0]).toMatchObject({ id: "a", category_name: "協賛金", project_name: "夏合宿", income: 10000, expense: 0, running_balance: 10000, receipt_no: "1" });
    expect(rows[1]).toMatchObject({ id: "b", category_name: "会場費", project_name: "", income: 0, expense: 3000, running_balance: 7000 });
  });
});

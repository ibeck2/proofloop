import { describe, it, expect } from "vitest";
import { sumByKind, currentBalance, withRunningBalance } from "./balance";
import type { FinanceTransaction } from "./types";

function tx(p: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: "x", organization_id: "o", period_id: "p",
    occurred_on: "2026-05-01", kind: "expense", category_id: "c",
    project_id: null, amount: 0, memo: null, receipt_path: null,
    receipt_no: null, parent_transaction_id: null, created_by: null,
    created_at: "2026-05-01T00:00:00Z", ...p,
  };
}

describe("sumByKind", () => {
  it("種別ごとに合計", () => {
    const list = [tx({ kind: "income", amount: 1000 }), tx({ kind: "expense", amount: 300 }), tx({ kind: "income", amount: 500 })];
    expect(sumByKind(list, "income")).toBe(1500);
    expect(sumByKind(list, "expense")).toBe(300);
  });
});

describe("currentBalance", () => {
  it("期首+収入-支出", () => {
    const list = [tx({ kind: "income", amount: 1000 }), tx({ kind: "expense", amount: 300 })];
    expect(currentBalance(2000, list)).toBe(2700);
  });
});

describe("withRunningBalance", () => {
  it("日付順に累計残高を付与", () => {
    const list = [
      tx({ id: "b", occurred_on: "2026-05-02", kind: "expense", amount: 200, created_at: "2026-05-02T00:00:00Z" }),
      tx({ id: "a", occurred_on: "2026-05-01", kind: "income", amount: 1000, created_at: "2026-05-01T00:00:00Z" }),
    ];
    const out = withRunningBalance(0, list);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
    expect(out[0].running_balance).toBe(1000);
    expect(out[1].running_balance).toBe(800);
  });
});

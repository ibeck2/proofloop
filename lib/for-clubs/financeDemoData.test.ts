import { describe, expect, it } from "vitest";
import { aggregateByCategory, summarize } from "@/lib/finance/aggregate";
import { currentBalance } from "@/lib/finance/balance";
import {
  DEMO_BUDGETS,
  DEMO_CATEGORIES,
  DEMO_OPENING_BALANCE,
  DEMO_TRANSACTIONS,
  makeDemoTransaction,
} from "./financeDemoData";

describe("デモデータの整合", () => {
  // LPに出す数字が合っていないと逆効果になるため、製品の関数で検算する。
  it("期首残高＋収入−支出が残高と一致する", () => {
    const s = summarize(DEMO_OPENING_BALANCE, DEMO_TRANSACTIONS);
    expect(s.closingBalance).toBe(currentBalance(DEMO_OPENING_BALANCE, DEMO_TRANSACTIONS));
    expect(s.closingBalance).toBe(DEMO_OPENING_BALANCE + s.incomeTotal - s.expenseTotal);
  });

  it("費目別集計の合計が収支サマリと一致する（取引の取りこぼしが無い）", () => {
    const s = summarize(DEMO_OPENING_BALANCE, DEMO_TRANSACTIONS);
    const rows = aggregateByCategory(DEMO_CATEGORIES, DEMO_TRANSACTIONS, DEMO_BUDGETS);
    const income = rows.filter((r) => r.kind === "income").reduce((a, r) => a + r.actual, 0);
    const expense = rows.filter((r) => r.kind === "expense").reduce((a, r) => a + r.actual, 0);
    expect(income).toBe(s.incomeTotal);
    expect(expense).toBe(s.expenseTotal);
  });

  it("予算はすべて実在する費目に紐づいている", () => {
    const ids = new Set(DEMO_CATEGORIES.map((c) => c.id));
    for (const b of DEMO_BUDGETS) {
      expect(ids.has(b.category_id), `${b.category_id} が費目マスタに無い`).toBe(true);
    }
  });

  it("取引はすべて実在する費目に紐づき、収支区分が費目と一致する", () => {
    const byId = new Map(DEMO_CATEGORIES.map((c) => [c.id, c]));
    for (const t of DEMO_TRANSACTIONS) {
      const cat = byId.get(t.category_id);
      expect(cat, `${t.category_id} が費目マスタに無い`).toBeDefined();
      expect(t.kind, `${t.memo} の収支区分が費目と食い違う`).toBe(cat!.kind);
    }
  });

  it("金額はすべて正の整数（マイナス入力で符号を二重に扱わない）", () => {
    for (const t of DEMO_TRANSACTIONS) {
      expect(Number.isInteger(t.amount)).toBe(true);
      expect(t.amount).toBeGreaterThan(0);
    }
  });

  it("makeDemoTransaction は製品の型を満たす行を作る", () => {
    const t = makeDemoTransaction({
      id: "x1",
      occurred_on: "2026-07-01",
      kind: "expense",
      category_id: "cat-venue",
      amount: 5000,
      memo: "テスト",
    });
    expect(t.amount).toBe(5000);
    expect(t.project_id).toBeNull();
    expect(t.created_at.startsWith("2026-07-01")).toBe(true);
  });
});

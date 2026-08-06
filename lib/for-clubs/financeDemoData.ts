import type {
  FinanceBudget,
  FinanceCategory,
  FinanceKind,
  FinanceTransaction,
} from "@/lib/finance/types";

/**
 * /for-clubs の会計デモで使う架空データ。
 *
 * 製品の型をそのまま満たすため、`lib/finance/types.ts` が変わればここで
 * ビルドが落ちる。デモが実態から静かにずれるのを型で防いでいる。
 * 団体名・大学名は架空。実在の団体をLPの宣伝素材に使わない。
 */

export const DEMO_ORG_NAME = "桜丘大学 ダンスサークル";
export const DEMO_PERIOD_NAME = "2026年度";
export const DEMO_OPENING_BALANCE = 120_000;

/** 入力欄の日付の既定値。`new Date()` を使うとSSRとクライアントでずれる */
export const DEMO_DEFAULT_DATE = "2026-07-01";

const ORG = "demo-org";
const PERIOD = "demo-period";

export const DEMO_CATEGORIES: FinanceCategory[] = [
  { id: "cat-fee", organization_id: ORG, name: "部費収入", kind: "income", sort_order: 1, is_archived: false },
  { id: "cat-sponsor", organization_id: ORG, name: "協賛金", kind: "income", sort_order: 2, is_archived: false },
  { id: "cat-venue", organization_id: ORG, name: "会場費", kind: "expense", sort_order: 3, is_archived: false },
  { id: "cat-equip", organization_id: ORG, name: "備品費", kind: "expense", sort_order: 4, is_archived: false },
  { id: "cat-travel", organization_id: ORG, name: "交通費", kind: "expense", sort_order: 5, is_archived: false },
];

export const DEMO_BUDGETS: FinanceBudget[] = [
  { id: "bud-fee", organization_id: ORG, period_id: PERIOD, category_id: "cat-fee", kind: "income", planned_amount: 240_000 },
  { id: "bud-sponsor", organization_id: ORG, period_id: PERIOD, category_id: "cat-sponsor", kind: "income", planned_amount: 50_000 },
  { id: "bud-venue", organization_id: ORG, period_id: PERIOD, category_id: "cat-venue", kind: "expense", planned_amount: 180_000 },
  { id: "bud-equip", organization_id: ORG, period_id: PERIOD, category_id: "cat-equip", kind: "expense", planned_amount: 60_000 },
  { id: "bud-travel", organization_id: ORG, period_id: PERIOD, category_id: "cat-travel", kind: "expense", planned_amount: 40_000 },
];

export function makeDemoTransaction(input: {
  id: string;
  occurred_on: string;
  kind: FinanceKind;
  category_id: string;
  amount: number;
  memo: string;
}): FinanceTransaction {
  return {
    id: input.id,
    organization_id: ORG,
    period_id: PERIOD,
    occurred_on: input.occurred_on,
    kind: input.kind,
    category_id: input.category_id,
    project_id: null,
    amount: input.amount,
    memo: input.memo,
    receipt_path: null,
    receipt_no: null,
    parent_transaction_id: null,
    created_by: null,
    created_at: `${input.occurred_on}T09:00:00.000Z`,
  };
}

export const DEMO_TRANSACTIONS: FinanceTransaction[] = [
  makeDemoTransaction({ id: "d1", occurred_on: "2026-04-08", kind: "income", category_id: "cat-fee", amount: 180_000, memo: "前期部費（36名分）" }),
  makeDemoTransaction({ id: "d2", occurred_on: "2026-04-20", kind: "expense", category_id: "cat-venue", amount: 64_000, memo: "スタジオ利用料（4月）" }),
  makeDemoTransaction({ id: "d3", occurred_on: "2026-05-11", kind: "expense", category_id: "cat-equip", amount: 23_800, memo: "スピーカー購入" }),
  makeDemoTransaction({ id: "d4", occurred_on: "2026-05-30", kind: "income", category_id: "cat-sponsor", amount: 30_000, memo: "学祭パンフ協賛" }),
  makeDemoTransaction({ id: "d5", occurred_on: "2026-06-15", kind: "expense", category_id: "cat-travel", amount: 12_400, memo: "地区大会 交通費" }),
];

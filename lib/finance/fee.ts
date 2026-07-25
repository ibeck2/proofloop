import type { FinanceKind } from "./types";

export type NewTxnPayload = {
  organization_id: string;
  period_id: string;
  occurred_on: string;
  kind: FinanceKind;
  category_id: string;
  project_id: string | null;
  amount: number;
  memo: string | null;
  receipt_no: string | null;
  parent_transaction_id: string | null;
};

/**
 * 本体取引から手数料行（支払手数料の支出）を導出する。
 * 手数料は本体の日付・事業タグを継承し、常に expense。領収書番号は持たない。
 */
export function buildFeePayload(
  base: NewTxnPayload,
  feeCategoryId: string,
  feeAmount: number,
  parentId: string
): NewTxnPayload | null {
  if (!Number.isFinite(feeAmount) || feeAmount <= 0) return null;
  return {
    organization_id: base.organization_id,
    period_id: base.period_id,
    occurred_on: base.occurred_on,
    kind: "expense",
    category_id: feeCategoryId,
    project_id: base.project_id,
    amount: Math.round(feeAmount),
    memo: base.memo ? `${base.memo}（振込手数料）` : "振込手数料",
    receipt_no: null,
    parent_transaction_id: parentId,
  };
}

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

export type FeeReconcileAction = "none" | "insert" | "update" | "delete";

/**
 * 本体取引の新規/編集時に、紐づく手数料行（子）をどう扱うかを決める純関数。
 * - kind が expense 以外：既存の手数料行があれば delete、無ければ none
 *   （収入に変更された取引は手数料を持たない）
 * - expense：
 *   - 新しい手数料 > 0：既存があれば update、無ければ insert
 *   - 新しい手数料 <= 0（未入力含む）：既存があれば delete、無ければ none
 */
export function planFeeReconciliation(params: {
  kind: FinanceKind;
  newFeeAmount: number;
  hasExistingFee: boolean;
}): FeeReconcileAction {
  const { kind, newFeeAmount, hasExistingFee } = params;
  const positive = Number.isFinite(newFeeAmount) && newFeeAmount > 0;
  if (kind !== "expense") return hasExistingFee ? "delete" : "none";
  if (positive) return hasExistingFee ? "update" : "insert";
  return hasExistingFee ? "delete" : "none";
}

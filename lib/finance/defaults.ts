import type { FinanceKind, FinanceTransaction } from "./types";

export const DEFAULT_CATEGORIES: { name: string; kind: FinanceKind }[] = [
  { name: "部費・会費", kind: "income" },
  { name: "協賛金", kind: "income" },
  { name: "助成金・補助金", kind: "income" },
  { name: "イベント収入", kind: "income" },
  { name: "その他収入", kind: "income" },
  { name: "備品・消耗品費", kind: "expense" },
  { name: "会場費", kind: "expense" },
  { name: "印刷・広報費", kind: "expense" },
  { name: "交通費", kind: "expense" },
  { name: "飲食・交流費", kind: "expense" },
  { name: "通信費", kind: "expense" },
  { name: "謝礼・報酬", kind: "expense" },
  { name: "支払手数料", kind: "expense" },
  { name: "その他支出", kind: "expense" },
];

/** 支払手数料の費目名（手数料行の自動生成で参照） */
export const FEE_CATEGORY_NAME = "支払手数料";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 4月始まりの会計年度を返す */
export function defaultPeriodForDate(date: Date): {
  name: string;
  starts_on: string;
  ends_on: string;
} {
  const y = date.getFullYear();
  const m = date.getMonth() + 1; // 1-12
  const startYear = m >= 4 ? y : y - 1;
  return {
    name: `${startYear}年度`,
    starts_on: `${startYear}-04-01`,
    ends_on: `${startYear + 1}-03-31`,
  };
}

/** 既存取引の数値領収書番号の最大+1（無ければ "1"） */
export function nextReceiptNo(
  txns: Pick<FinanceTransaction, "receipt_no">[]
): string {
  let max = 0;
  for (const t of txns) {
    const n = Number(t.receipt_no);
    if (t.receipt_no != null && Number.isInteger(n) && n > max) max = n;
  }
  return String(max + 1);
}

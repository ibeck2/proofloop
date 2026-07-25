import type { FinanceKind, FinanceTransaction } from "./types";

export function sumByKind(txns: FinanceTransaction[], kind: FinanceKind): number {
  return txns.reduce((acc, t) => (t.kind === kind ? acc + t.amount : acc), 0);
}

export function currentBalance(openingBalance: number, txns: FinanceTransaction[]): number {
  return openingBalance + sumByKind(txns, "income") - sumByKind(txns, "expense");
}

export function sortForLedger(txns: FinanceTransaction[]): FinanceTransaction[] {
  return [...txns].sort((a, b) => {
    if (a.occurred_on !== b.occurred_on) return a.occurred_on < b.occurred_on ? -1 : 1;
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function withRunningBalance(
  openingBalance: number,
  txns: FinanceTransaction[]
): (FinanceTransaction & { running_balance: number })[] {
  let bal = openingBalance;
  return sortForLedger(txns).map((t) => {
    bal += t.kind === "income" ? t.amount : -t.amount;
    return { ...t, running_balance: bal };
  });
}

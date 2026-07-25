export type FinanceKind = "income" | "expense";
export type ProjectKind = "event" | "grant" | "sponsor" | "general";

export type FinancePeriod = {
  id: string;
  organization_id: string;
  name: string;
  starts_on: string; // YYYY-MM-DD
  ends_on: string;   // YYYY-MM-DD
  opening_balance: number;
  is_closed: boolean;
};

export type FinanceCategory = {
  id: string;
  organization_id: string;
  name: string;
  kind: FinanceKind;
  sort_order: number;
  is_archived: boolean;
};

export type FinanceProject = {
  id: string;
  organization_id: string;
  name: string;
  kind: ProjectKind;
  is_archived: boolean;
};

export type FinanceTransaction = {
  id: string;
  organization_id: string;
  period_id: string;
  occurred_on: string; // YYYY-MM-DD
  kind: FinanceKind;
  category_id: string;
  project_id: string | null;
  amount: number;
  memo: string | null;
  receipt_path: string | null;
  receipt_no: string | null;
  parent_transaction_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type FinanceBudget = {
  id: string;
  organization_id: string;
  period_id: string;
  category_id: string;
  kind: FinanceKind;
  planned_amount: number;
};

/** 団体内タスク（tasks テーブル） */
export type TaskStatus = "todo" | "in_progress" | "in_review" | "on_hold" | "done";

export interface TaskRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  reviewer_id: string | null;
  created_by: string | null;
  category: string | null;
  due_date: string | null;
  /** DB に列がある場合のみ */
  created_at?: string;
  updated_at?: string;
}

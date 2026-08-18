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

/** タスクのチェックリスト項目（task_checklist_items テーブル） */
export interface ChecklistItemRow {
  id: string;
  task_id: string;
  organization_id: string;
  text: string;
  is_done: boolean;
  position: number;
  created_at?: string;
}

/** タスクの添付ファイル（task_attachments テーブル） */
export interface AttachmentRow {
  id: string;
  task_id: string;
  organization_id: string;
  uploaded_by: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  created_at?: string;
}

/** タスクへのコメント（task_comments テーブル。投稿後の編集・削除は無い） */
export interface CommentRow {
  id: string;
  task_id: string;
  organization_id: string;
  author_id: string | null;
  body: string;
  created_at?: string;
}

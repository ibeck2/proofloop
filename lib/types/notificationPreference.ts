export type NotificationType =
  | "task_review_assigned"
  | "task_assignee_changed"
  | "task_comment_added"
  | "schedule_poll_created"
  | "schedule_poll_reminder";

export interface NotificationPreferenceRow {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  organization_id: string | null;
  enabled: boolean;
}

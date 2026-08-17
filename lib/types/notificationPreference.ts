export type NotificationType =
  | "task_review_assigned"
  | "task_assignee_changed";

export interface NotificationPreferenceRow {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  organization_id: string | null;
  enabled: boolean;
}

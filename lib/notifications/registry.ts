import type { NotificationType } from "@/lib/types/notificationPreference";

/**
 * 通知タイプの静的な性質。DBテーブルにはしない（動的追加の需要が無いため）。
 * isOptional=false の種類は /mypage/notifications に出さず、常時送信のままにする。
 */
export interface NotificationTypeMeta {
  id: NotificationType;
  label: string;
  description: string;
  isOptional: boolean;
  isOrgScoped: boolean;
}

export const NOTIFICATION_REGISTRY: NotificationTypeMeta[] = [
  {
    id: "task_review_assigned",
    label: "タスクのレビュー依頼",
    description:
      "自分がレビュー者に指定されたタスクが「レビュー待ち」になったときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
  {
    id: "task_assignee_changed",
    label: "タスクの担当者アサイン",
    description: "自分がタスクの担当者に指定されたときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
  {
    id: "task_comment_added",
    label: "タスクへのコメント",
    description:
      "自分が担当・レビュー・作成したタスクにコメントが投稿されたときにメールで知らせます。",
    isOptional: true,
    isOrgScoped: true,
  },
];

export function getOptionalNotificationTypes(): NotificationTypeMeta[] {
  return NOTIFICATION_REGISTRY.filter((n) => n.isOptional);
}

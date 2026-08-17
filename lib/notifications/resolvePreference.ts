import type {
  NotificationPreferenceRow,
  NotificationType,
} from "@/lib/types/notificationPreference";

/**
 * /mypage/notifications の表示用。行が存在しない＝有効（デフォルトON）。
 * 自分自身の行（RLSで読める範囲）を対象にした自己完結のケースでのみ使う。
 * 他人の設定をactorが確認するcross-userのケースは
 * is_notification_enabled（RPC）を使うこと（RLSに阻まれて常に0件になり
 * 誤判定するため、このクライアント側関数では代替できない）。
 */
export function resolveNotificationEnabled(
  rows: NotificationPreferenceRow[],
  notificationType: NotificationType,
  organizationId: string | null
): boolean {
  const row = rows.find(
    (r) =>
      r.notification_type === notificationType &&
      r.organization_id === organizationId
  );
  return row ? row.enabled : true;
}

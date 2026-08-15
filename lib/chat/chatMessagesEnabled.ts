/**
 * `application_messages` への送信を許可するかどうかの判定。
 *
 * 電気通信事業法16条の届出（第三者間の通信を媒介する機能に該当）が未了のため、
 * 実際の通信媒介の実績をゼロに保ったまま届出を行う目的で、送信機能を既定で閉じる。
 * `NEXT_PUBLIC_CHAT_MESSAGES_ENABLED` を Vercel で "true" に設定するまでは
 * 未設定・any値でも false（フェイルクローズ）。届出提出後にオーナーが有効化する。
 */
export function isChatMessagingEnabled(rawEnvValue: string | undefined): boolean {
  return rawEnvValue === "true";
}

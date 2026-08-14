import type { OrganizationClaimStatus } from "@/lib/claims/types";

/**
 * 団体ページの「エントリーする」「メッセージを送る」を出してよいかの判定。
 * claim 前・凍結中は実質的な管理者がいないため、応募・DMを受け付けても
 * 学生に永久に応答が返らない。UIコンポーネントに埋め込まず、ここに切り出す
 * （CLAUDE.md §5）。DB側（applications の INSERT ポリシー）でも同じ条件で
 * 二重に防ぐが、判定ロジック自体はこちらが正。
 */
export type EntryAvailability = "available" | "unclaimed" | "frozen";

export function resolveEntryAvailability(
  claimStatus: OrganizationClaimStatus | null
): EntryAvailability {
  if (claimStatus === "claimed") return "available";
  if (claimStatus === "frozen") return "frozen";
  return "unclaimed"; // "unclaimed" 本体、および未取得（null）は安全側に倒す
}

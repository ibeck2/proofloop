import { SITE_URL } from "@/lib/site-url";

/**
 * `reissue_claim_token`（040。却下済みclaimに新しいトークンを発行する）の
 * URL組み立て・エラーコード変換をまとめる純粋関数群。
 * `lib/claims/claimDecision.ts`・`lib/claims/claimRevocation.ts`と同じ形。
 */

export function claimUrlFromToken(token: string): string {
  return `${SITE_URL}/claim/${token}`;
}

export type ReissueClaimTokenErrorCode = "forbidden" | "invalid" | "already_claimed";

export function reissueClaimTokenErrorMessage(code: string | undefined): string {
  switch (code as ReissueClaimTokenErrorCode | undefined) {
    case "forbidden":
      return "権限がありません";
    case "invalid":
      return "この申請は却下済みではないか、既に見つかりません";
    case "already_claimed":
      return "この団体は既に別の方が引き取り済みです";
    default:
      return "再発行に失敗しました";
  }
}

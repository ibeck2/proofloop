/**
 * `revoke_claim`（038で掲載内容の復元を統合済み。B19の「発行の取消」から呼ぶ）の
 * エラーコード変換・入力検証・成功文言をまとめる純粋関数群。
 *
 * `lib/claims/claimDecision.ts`・`lib/claims/disputeResolution.ts`と同じ形。
 * この分岐をUIコンポーネントに埋め込まない（CLAUDE.md §5）。
 */

export type RevokeClaimErrorCode = "forbidden" | "not_found" | "rpc_error";

export function claimRevocationErrorMessage(code: string | undefined): string {
  switch (code as RevokeClaimErrorCode | undefined) {
    case "forbidden":
      return "権限がありません";
    case "not_found":
      return "この申請は見つかりませんでした。画面を再読み込みしてください";
    case "rpc_error":
      return "一時的に処理できませんでした。繰り返すときはサーバログを確認してください";
    default:
      return "取り消しに失敗しました";
  }
}

/**
 * 取消理由の入力チェック。運営が理由なしで一存の剥奪を実行できないようにする
 * （破壊的操作のため、ブレインストーミングで理由入力を必須にする方針で合意済み）。
 */
export function canSubmitClaimRevocation(reason: string): boolean {
  return reason.trim().length > 0;
}

export type RevokeClaimSuccess = {
  ok: true;
  removed_members: number;
  removed_invitations: number;
};

export function revokeClaimSuccessMessage(result: RevokeClaimSuccess): string {
  return `発行を取り消しました。メンバー${result.removed_members}件・招待${result.removed_invitations}件を削除しました。`;
}

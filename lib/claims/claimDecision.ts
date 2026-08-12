/**
 * `decide_claim`（引き取り申請の承認・却下）のエラーコードを文言にする純粋関数。
 *
 * 移行前の `/admin/claims` は `forbidden` だけを見分け、残りを
 * 「処理に失敗しました」に潰していた。033 の decide_claim は7種類のコードを
 * 返し分けており、とくに `applicant_gone`（申請者が退会済み）と
 * `already_claimed`（別の申請が先に承認された・凍結中）は、運営が次に何を
 * すべきかが正反対になる。潰すと「もう一度押す」しか選べなくなる。
 */
export type DecideClaimErrorCode =
  | "forbidden"
  | "bad_decision"
  | "bad_level"
  | "bad_verdict"
  | "invalid"
  | "applicant_gone"
  | "already_claimed"
  /** Route Handler が RPC の失敗を畳んだコード。詳細はサーバログにある */
  | "rpc_error";

export function claimDecisionErrorMessage(code: string | undefined): string {
  switch (code as DecideClaimErrorCode | undefined) {
    case "forbidden":
      return "権限がありません";
    case "invalid":
      return "この申請はすでに処理済みか、存在しません";
    case "applicant_gone":
      return "申請者のアカウントが退会済みです。この申請は承認できません";
    case "already_claimed":
      return "この団体はすでに引き取り済み、または凍結中です";
    case "bad_decision":
    case "bad_level":
    case "bad_verdict":
      return "送信内容が不正です。画面を再読み込みしてやり直してください";
    case "rpc_error":
      return "一時的に処理できませんでした。繰り返すときはサーバログを確認してください";
    default:
      return "処理に失敗しました";
  }
}

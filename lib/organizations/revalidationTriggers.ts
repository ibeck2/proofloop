import { didFreeze } from "@/lib/claims/disputeOutcome";

/**
 * 「団体ページのキャッシュを捨てるべきか」を RPC の応答から判定する純粋関数群。
 *
 * この分岐を Route Handler に直接書かない。同じ形（`result.ok && 何か`）の分岐を
 * UI に残して3回不具合を出しているプロジェクトで（`lib/claims/disputeOutcome.ts`
 * 冒頭を参照）、しかも「再検証されなかった」は画面上で何も起きないため
 * 気づけない壊れ方をする。ここでテストに固定する。
 */

/** submit_dispute の応答 */
export type DisputeResult = { ok?: boolean; frozen?: boolean } | null | undefined;

/** decide_claim の応答 */
export type ClaimDecisionResult = { ok?: boolean; decision?: string } | null | undefined;

/** resolve_dispute の応答 */
export type DisputeResolutionResult = { ok?: boolean } | null | undefined;

/**
 * 申立て：実際に凍結したときだけ claim_status が変わる。
 * 032 のレート制限で「記録のみ」になった場合はページの表示が変わらないので捨てない。
 * frozen キーの解釈は didFreeze に委ねる（キー欠落＝032 未適用の応答は凍結側に倒す）。
 */
export function shouldRevalidateAfterDispute(result: DisputeResult): boolean {
  return result?.ok === true && didFreeze(result.frozen);
}

/**
 * 引き取り申請：承認だけが claim_status を unclaimed → claimed に変える。
 * 却下は unclaimed のままなので捨てる理由が無い。
 */
export function shouldRevalidateAfterClaimDecision(
  result: ClaimDecisionResult
): boolean {
  return result?.ok === true && result.decision === "approved";
}

/**
 * 申立ての処理：認容（→ unclaimed）も却下（→ claimed または unclaimed）も
 * 必ず claim_status を変えるので、成功したら常に捨てる。
 */
export function shouldRevalidateAfterDisputeResolution(
  result: DisputeResolutionResult
): boolean {
  return result?.ok === true;
}

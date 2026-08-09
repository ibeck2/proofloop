/**
 * submit_dispute のレスポンスをUI文言に変換する純粋関数。
 *
 * 032 でレート制限を追加し、submit_dispute は成功時に {"ok":true} だけでなく
 * {"ok":true,"frozen":boolean} を返すようになった。直近1時間の自動凍結が
 * 閾値に達していると、申立ては open で記録されるだけで凍結・巻き戻しは
 * 行われない（`supabase/migrations/032_dispute_rate_limit.sql` 参照）。
 *
 * 完了画面の文言は「凍結できたか」で内容が変わる（凍結できていないのに
 * 「編集を停止し元に戻しました」と案内すると事実と異なる）ため、
 * その分岐をUIコンポーネントに埋め込まずここに切り出す。過去3回、
 * UIに残した分岐が不具合の原因になっているため（CLAUDE.md §5）。
 */

export type SubmitDisputeError =
  | "missing_fields"
  | "not_found"
  | "not_claimed"
  | "already_open";

export function disputeErrorMessage(code: string | undefined): string {
  switch (code as SubmitDisputeError | undefined) {
    case "missing_fields":
      return "お名前・ご連絡先・状況をすべてご記入ください";
    case "not_found":
      return "この団体が見つかりませんでした";
    case "not_claimed":
      return "この団体はまだ引き取られていません";
    case "already_open":
      return "この団体については既に対応中です";
    default:
      return "送信に失敗しました";
  }
}

/**
 * RPC レスポンスの `frozen` キーを「実際に凍結されたか」に解釈する。
 *
 * キーが欠落している（undefined）＝ 032 未適用の submit_dispute（029）が応答した、
 * ということ。029 の submit_dispute はレート制限を持たず、成功したなら必ず凍結・
 * 巻き戻しをしてから `{"ok":true}` を返す。したがって欠落は true 側に倒す。
 *
 * ここを `frozen === true` にすると、実際には凍結されているのに
 * 「そのまま公開中」と案内してしまう（凍結中の団体を未凍結だと誤って伝える）。
 */
export function didFreeze(frozen: boolean | undefined): boolean {
  return frozen !== false;
}

export type DisputeCompletionMessage = {
  title: string;
  body: string;
};

/**
 * frozen: true … 自動凍結が発火し、掲載内容を引き取り前の状態に戻した
 * frozen: false … レート制限により凍結は見送り、申立てのみ記録した
 *                 （運営が確認するまで、現在の掲載内容はそのまま）
 */
export function disputeCompletionMessage(frozen: boolean): DisputeCompletionMessage {
  if (frozen) {
    return {
      title: "申告を受け付けました",
      body:
        "この団体ページの編集を一時的に停止し、掲載内容を引き取り前の状態に戻しました。" +
        "運営が確認のうえ、ご連絡します。",
    };
  }
  return {
    title: "受け付けました",
    body: "運営が確認します。内容によってはご連絡させていただく場合があります。",
  };
}

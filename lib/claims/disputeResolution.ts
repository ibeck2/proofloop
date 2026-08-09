/**
 * `/admin/disputes`（申立ての対応画面）が使う純粋関数群。
 *
 * 032（`supabase/migrations/032_dispute_rate_limit.sql`）で自動凍結にレート制限が
 * 入り、「申立てを受けた団体は必ず凍結され、掲載は引き取り前に戻っている」という
 * 旧来の前提が崩れた。直近1時間の自動凍結が閾値（5件）に達していると、申立ては
 * `froze_organization = false` で記録されるだけになる。
 *
 * この分岐（凍結あり/なしで文言が変わる）をUIコンポーネントに埋め込むと、
 * このプロジェクトでは過去に何度も不具合の原因になっている（CLAUDE.md §5）。
 * 「凍結されていないのに凍結された前提の文言を出す」は、運営が対応を見送って
 * 乗っ取りが継続する事故に直結するため、ここに切り出してテストで固定する。
 */

export type FreezeTone = "frozen" | "unfrozen";

export type FreezeStatus = {
  tone: FreezeTone;
  label: string;
  description: string;
};

/**
 * 申立て一覧の各カードに出す、現在の凍結状態の説明。
 *
 * frozen: true … submit_dispute が自動凍結し、掲載は引き取り前に巻き戻し済み。
 * frozen: false … レート制限により記録のみ。掲載内容は現状のまま公開されている。
 *   ここを見落とすと「凍結された」と思い込んで対応が遅れるため、
 *   tone を分けて画面側で視覚的にも区別できるようにする。
 */
export function freezeStatus(frozeOrganization: boolean): FreezeStatus {
  if (frozeOrganization) {
    return {
      tone: "frozen",
      label: "凍結済み",
      description: "掲載内容は引き取り前の状態に巻き戻し済みです。",
    };
  }
  return {
    tone: "unfrozen",
    label: "凍結されていません",
    description:
      "直近の自動凍結が上限（1時間に5件）に達したため、記録のみ行われました。" +
      "掲載内容は現状のまま公開されています。",
  };
}

export type DisputeResolutionAction = "uphold" | "dismiss";

/**
 * 認容／却下ボタンの下に出す説明文。凍結の有無で実際の挙動が変わるため、
 * `supabase/migrations/032_dispute_rate_limit.sql` の resolve_dispute の分岐と
 * 対にして記述を保つこと（片方だけ更新すると画面の説明が嘘になる）。
 *
 * 認容（uphold）：
 *   凍結済み … 掲載は既に引き取り前の内容。ここでは権限剥奪のみ行う。
 *   未凍結 … 権限剥奪に加え、ここで初めて掲載を引き取り前の内容に巻き戻す。
 * 却下（dismiss）：
 *   凍結済み … 凍結を解除し、凍結直前の掲載内容に復帰する。
 *   未凍結 … そもそも掲載に触れていないため、却下しても掲載内容は変わらない。
 */
export function resolutionHelpText(
  action: DisputeResolutionAction,
  frozeOrganization: boolean
): string {
  if (action === "uphold") {
    return frozeOrganization
      ? "認容すると、管理権限を剥奪します（掲載は既に引き取り前の内容です）。"
      : "認容すると、管理権限を剥奪し、掲載を引き取り前の内容に戻します。";
  }
  return frozeOrganization
    ? "却下すると、凍結を解除し、凍結直前の掲載内容に復帰します。"
    : "却下すると申立てのみ処理済みにします。凍結されていないため、掲載内容には触れません。";
}

export type ResolveDisputeErrorCode =
  | "forbidden"
  | "bad_resolution"
  | "invalid"
  | "revoke_failed";

/**
 * resolve_dispute の error コードの文言化。
 *
 * revoke_failed は 032 で追加された、既存の brief には無かったコード。
 * revoke_claim（オーナー権限の剥奪）が失敗したときに返り、申立ては
 * 未処理（open）のまま残る。「処理に失敗しました」とだけ出すと、運営は
 * 申立てが処理されたのか未処理なのか区別できないため、専用の文言にする。
 */
export function resolveDisputeErrorMessage(code: string | undefined): string {
  switch (code as ResolveDisputeErrorCode | undefined) {
    case "forbidden":
      return "権限がありません";
    case "bad_resolution":
      return "不正な処理区分です";
    case "invalid":
      return "この申立てはすでに処理済みか、存在しません";
    case "revoke_failed":
      return "管理権限の剥奪に失敗しました。申立ては未処理のままです";
    default:
      return "処理に失敗しました";
  }
}

export type ResolveDisputeSuccess =
  | { ok: true; resolution: "upheld" }
  | { ok: true; resolution: "dismissed"; claim_status: "claimed" | "unclaimed" };

/**
 * 処理成功後のトースト文言。resolution（upheld/dismissed）と、処理前の
 * froze_organization の組み合わせで、実際に何が起きたかが変わる。
 *
 * upheld：凍結済みなら submit_dispute が既に巻き戻し済み、未凍結なら
 *   resolve_dispute が今回はじめて巻き戻す（032 の実装参照）。最終状態は
 *   どちらも「掲載は引き取り前」で同じだが、いつ戻ったかの事実は違うので
 *   文言もそこに合わせる。
 * dismissed：凍結済みなら凍結前の状態へ復帰、未凍結なら掲載内容には
 *   一切触れていない。
 *
 * dismissed の claim_status も必ず伝える。032 は「却下時に承認済み claim が
 * 実在しないなら unclaimed に戻す」分岐を持つ（無条件に claimed を書くと、
 * オーナーも承認済み claim も無いのに claimed になり、以後 apply_for_claim /
 * decide_claim が永久に already_claimed を返す詰み状態になるため）。
 * これが発火したとき、その団体は管理者不在のまま残る。運営が知らないと
 * 「却下したのだから元に戻ったはず」と誤解して放置される。
 */
export function resolveDisputeSuccessMessage(
  result: ResolveDisputeSuccess,
  frozeOrganization: boolean
): string {
  if (result.resolution === "upheld") {
    return frozeOrganization
      ? "認容しました。管理権限を剥奪しました。掲載は既に引き取り前の内容です。"
      : "認容しました。管理権限を剥奪し、掲載を引き取り前の内容に戻しました。";
  }
  // dismissed
  const base = frozeOrganization
    ? "却下しました。凍結を解除し、凍結直前の掲載内容に復帰しました。"
    : "却下しました。この申立ては凍結を伴っていなかったため、掲載内容に変更はありません。";

  if (result.claim_status === "unclaimed") {
    return `${base} ただしこの団体には承認済みの管理者が居ないため、未取得の状態に戻しました。`;
  }
  return base;
}

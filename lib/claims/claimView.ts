/**
 * `/claim/[token]` がどの画面を出すかの判定と、apply_for_claim のエラーコードの
 * 日本語文言化。UIコンポーネントに埋め込まず、ここに切り出してテストする
 * （CLAUDE.md §5）。
 *
 * 背景：get_claim_preview は団体が claim_status <> 'unclaimed' になると
 * {"ok":false,"reason":"already_claimed",...} を返し、already_applied キーは
 * 含めない。localStorage の「このブラウザで申請した」フラグだけで分岐すると、
 * 自分の申請が承認された後に同じリンクを開いたとき、already_claimed 分岐が
 * 先に評価されてしまい「管理者に招待を依頼してください」と本人に案内する
 * 誤表示になる。サーバー側の事実（organization_members に自分の行があるか）で
 * owned_by_me / claimed_by_other を判定する。
 */

export type ClaimPreview = {
  ok: boolean;
  reason?: "invalid" | "already_claimed";
  organization_id?: string;
  organization_name?: string | null;
  already_applied?: boolean;
};

export type ClaimView =
  | "loading" // まだ判定できない
  | "invalid" // 無効・期限切れ・取消（区別しない）
  | "owned_by_me" // 自分が管理している団体
  | "claimed_by_other"
  | "applied" // 自分の申請が受理済み（このブラウザで送信済み）
  | "need_login"
  | "form";

export function resolveClaimView(args: {
  preview: ClaimPreview | null;
  sessionResolved: boolean; // getSession が解決したか
  isLoggedIn: boolean;
  isMemberOfOrg: boolean; // already_claimed のときだけ意味を持つ
  appliedInThisBrowser: boolean;
}): ClaimView {
  const { preview, sessionResolved, isLoggedIn, isMemberOfOrg, appliedInThisBrowser } = args;

  if (!preview) return "loading";

  // サーバーが「既に claim 済み」と言っている場合はこれを最優先する。
  // 自分が過去に申請してこのブラウザにフラグが残っていても、団体が既に
  // claim された以上、それが「自分の申請が承認された結果」なのか
  // 「別人が管理している」のかは organization_members の実際の所属で判定する。
  if (preview.reason === "already_claimed") {
    return isMemberOfOrg ? "owned_by_me" : "claimed_by_other";
  }

  if (!preview.ok) {
    // 無効・期限切れ・取消を区別しない（総当たりに情報を与えない）
    return "invalid";
  }

  // ここに来るのは preview.ok === true（団体がまだ unclaimed）のとき。
  // このブラウザで実際に apply_for_claim が成功していれば完了画面を出す。
  if (appliedInThisBrowser) return "applied";

  // セッション未解決のうちは「ログインが必要です」を出さない
  // （既ログインユーザーに一瞬ちらつくのを防ぐ）。
  if (!sessionResolved) return "loading";

  return isLoggedIn ? "form" : "need_login";
}

export function claimErrorMessage(code: string | undefined): string {
  switch (code) {
    case "not_authenticated":
      return "ログインが必要です";
    case "already_claimed":
      return "この団体は既に引き取られています";
    case "already_applied_by_other":
      // このトークンには既に別の人物から申請が届いている。上書きさせず、運営の確認に委ねる。
      return "この団体には既に別の方から申請が届いています。運営が内容を確認します。";
    case "invalid":
    default:
      return "このリンクは無効です";
  }
}

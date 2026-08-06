/**
 * 新規登録時のパスワード規則の唯一の定義元。
 *
 * 以前は学生タブの手書きチェック（8文字）、企業タブの zod スキーマ（6文字）、
 * ログイン画面（6文字）、各プレースホルダの文言がそれぞれ別々に閾値を持っており、
 * 画面によって要求が食い違っていた。閾値と文言をここに集約する。
 *
 * ⚠️ **ログイン画面ではこの検証を使わないこと。** ログインの正否はサーバー
 * （Supabase Auth）が実際のパスワードと照合して決めるため、クライアントで長さを
 * 見てもセキュリティは上がらない。一方、規則を引き上げたあとに古い規則で登録した
 * 利用者がログインしようとすると、正しいパスワードなのに弾かれて締め出される。
 * ログイン側は「空欄でないこと」だけを見る。
 */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIRED_MESSAGE = "パスワードを入力してください。";
export const PASSWORD_TOO_SHORT_MESSAGE = `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`;

/** 入力欄のプレースホルダに使う文言 */
export const PASSWORD_PLACEHOLDER = `${PASSWORD_MIN_LENGTH}文字以上`;

export type PasswordValidation = { ok: true } | { ok: false; message: string };

/**
 * 新規登録のパスワードを検証する。
 *
 * 登録時に前後の空白は取り除かれるため、判定も trim 後の長さで行う。
 * そうしないと空白で水増ししただけの実質1文字のパスワードが通ってしまう。
 */
export function validateNewPassword(raw: string): PasswordValidation {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: PASSWORD_REQUIRED_MESSAGE };
  }
  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, message: PASSWORD_TOO_SHORT_MESSAGE };
  }
  return { ok: true };
}

/**
 * `/admin` 配下に被せる HTTP Basic 認証の判定。
 *
 * これは既存の「`getSession()` → `profiles.role === 'admin'`」を置き換えるものではなく、
 * その外側に重ねる層。リスク台帳 S1（サーバーサイドの認証ゲートが無い）に対する対処で、
 * 運営画面の外枠が誰でも開ける状態を塞ぐ。
 *
 * なぜ Supabase のセッションを middleware で見ないか：
 * `lib/supabase.ts` は素の `createClient` を使っており、セッションは **localStorage** に入る。
 * Next.js の middleware は Cookie しか読めないため、この構成のままでは
 * 「誰がアクセスしてきたか」を判定できない。Cookie 方式に移すには `@supabase/ssr` への
 * 移行が必要で、全ページの認証経路に波及し既存ログイン中の利用者が全員ログアウトされる。
 * 運営画面の利用者は1名なので、共有パスワードで外枠を閉じるほうが費用対効果が高い。
 */

export type BasicAuthVerdict =
  | { allow: true; reason: "credentials_ok" | "not_configured_dev" }
  | {
      allow: false;
      reason: "not_configured" | "missing_header" | "malformed_header" | "bad_credentials";
    };

/**
 * `Authorization: Basic <base64>` を user / password に分解する。
 * 形式が違う・復号できない・区切りのコロンが無い場合は null。
 */
export function parseBasicAuthHeader(
  header: string | null | undefined
): { user: string; password: string } | null {
  if (!header) return null;

  const [scheme, encoded] = header.split(/\s+/, 2);
  // RFC 7617 はスキーム名を大文字小文字を区別せずに扱う
  if (!scheme || scheme.toLowerCase() !== "basic" || !encoded) return null;

  let decoded: string;
  try {
    // Edge ランタイムに Buffer は無い。atob はバイト列を返すので UTF-8 に組み直す
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }

  const separator = decoded.indexOf(":");
  // コロンが無ければユーザーとパスワードの区切りが無い。
  // 空パスワードとして通すと、ユーザー名だけ知っていれば入れてしまう
  if (separator < 0) return null;

  return {
    user: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

/**
 * 文字列の一致を、長さが同じ限り比較時間が入力に依存しない形で判定する。
 * 早期 return で比較すると、一致した先頭文字数が応答時間に漏れる。
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function evaluateBasicAuth(params: {
  header: string | null | undefined;
  expectedUser: string;
  expectedPassword: string;
  isProduction: boolean;
}): BasicAuthVerdict {
  const { header, expectedUser, expectedPassword, isProduction } = params;

  // 設定漏れを「素通し」にすると、入れたつもりの防壁が黙って存在しない状態になる。
  // 本番では閉じ、ローカル開発では通す（開発のたびにパスワードを求めても何も守れない）。
  if (!expectedUser || !expectedPassword) {
    return isProduction
      ? { allow: false, reason: "not_configured" }
      : { allow: true, reason: "not_configured_dev" };
  }

  if (!header) return { allow: false, reason: "missing_header" };

  const parsed = parseBasicAuthHeader(header);
  if (!parsed) return { allow: false, reason: "malformed_header" };

  // 片方だけ先に判定して短絡すると、ユーザー名の当たり外れが応答時間に出る
  const userOk = constantTimeEqual(parsed.user, expectedUser);
  const passwordOk = constantTimeEqual(parsed.password, expectedPassword);

  return userOk && passwordOk
    ? { allow: true, reason: "credentials_ok" }
    : { allow: false, reason: "bad_credentials" };
}

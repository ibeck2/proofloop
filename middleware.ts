import { NextResponse, type NextRequest } from "next/server";
import { evaluateBasicAuth } from "@/lib/auth/basicAuth";

/**
 * `/admin` 配下にサーバーサイドの認証ゲートを被せる（リスク台帳 S1）。
 *
 * ここは配線だけで、判定は `lib/auth/basicAuth.ts` の純粋関数が持つ。
 * このプロジェクトでは UI やルート層に残した分岐が繰り返し不具合の原因になっている。
 *
 * ⚠️ これは**二重化**であって置き換えではない。各 `/admin` ページの
 * 「`getSession()` → `profiles.role === 'admin'`」判定と、RPC 内の `is_system_admin()` は
 * そのまま残る。Basic 認証は共有パスワードなので「誰が操作したか」は特定できず、
 * 単独では運営の認可根拠にならない。
 */
export function middleware(request: NextRequest) {
  const verdict = evaluateBasicAuth({
    header: request.headers.get("authorization"),
    expectedUser: process.env.ADMIN_BASIC_USER ?? "",
    expectedPassword: process.env.ADMIN_BASIC_PASSWORD ?? "",
    isProduction: process.env.NODE_ENV === "production",
  });

  if (verdict.allow) return NextResponse.next();

  if (verdict.reason === "not_configured") {
    // 認証を促しても入れる資格情報が存在しないので 401 は出さない。
    // 環境変数の設定漏れであることが運営に伝わる形で止める。
    return new NextResponse(
      "管理画面は現在利用できません。ADMIN_BASIC_USER / ADMIN_BASIC_PASSWORD が未設定です。",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      // realm に固定文字列を置く。理由を書くと総当たりの手がかりになる
      "WWW-Authenticate": 'Basic realm="ProofLoop Admin", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // `/admin` 自身と、その配下すべて。他のルートには一切かけない
  matcher: ["/admin", "/admin/:path*"],
};

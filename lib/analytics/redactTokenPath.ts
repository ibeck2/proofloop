const TOKEN_ROUTE_RE = /^\/(claim|invite)\/[^/]+/;

/**
 * GA4に送るパス文字列から claim / invite のトークンを丸める。
 *
 * `/claim/[token]`・`/invite/[token]` のトークンは単回使用の鍵（保持していれば
 * ログイン不要で操作できる）。GA4のレポートを見られる者に生のトークンを渡さない
 * ため、page_path / page_location のどちらにもこの関数を経由させる
 * （components/GoogleAnalytics.tsx）。
 *
 * UUID形式かどうかは検証しない。厳密な検証にすると、不正な値や将来の形式変更を
 * 取りこぼして漏洩する側に倒れるため、ここでは過剰に丸める方を選ぶ
 * （lib/organizations/paths.ts の organizationPagePath とは逆方向の判断：
 * あちらは甘い判定だと事故が起きるので厳密に倒している）。
 */
export function redactTokenPath(pathname: string): string {
  const match = pathname.match(TOKEN_ROUTE_RE);
  if (!match) return pathname;
  return `/${match[1]}/[token]`;
}

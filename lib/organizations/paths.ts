const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 団体詳細ページのパス。ISR のオンデマンド再検証の対象を1箇所で決める。
 *
 * id が UUID でなければ null を返す。これは飾りではなく、
 * revalidatePath() に外から来た文字列をそのまま渡さないためのガード。
 * `/organizations/[id]` のような route 形式を渡すと**その route の全ページ**
 * （団体2,400件分）が一度に無効化されるので、値の形を必ず確かめる。
 *
 * タグ（`organizationCacheTag`）と同じく小文字へ正規化する。両者の正規化が
 * ずれると「タグは消えたがHTMLは残る」という半端な無効化になる。
 * 実運用のリンクはすべてDB由来（小文字）なので、これが正準形。
 */
export function organizationPagePath(id: string | null | undefined): string | null {
  const normalized = (id ?? "").trim().toLowerCase();
  if (!UUID_RE.test(normalized)) return null;
  return `/organizations/${normalized}`;
}

/**
 * 団体詳細ページのデータキャッシュ（`unstable_cache`）のタグ。
 * 生成側（page.tsx）と無効化側（revalidatePage.ts）で必ず同じ値を使う。
 * 綴りがずれると「再検証したつもりで何も消えていない」に静かに退化する。
 *
 * 小文字に正規化する。生成側の id は URL 由来（訪問者が大文字で打てる）、
 * 無効化側の id はDB由来（常に小文字）なので、揃えないとタグが一致しない。
 */
export function organizationCacheTag(id: string): string {
  return `organization:${id.trim().toLowerCase()}`;
}

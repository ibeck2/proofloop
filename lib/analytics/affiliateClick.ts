export interface AffiliateClickEvent {
  page: string;       // 例 "/guide/living-alone"
  advertiser: string; // 例 "albeeeX"
  position: string;   // リソースグループ id
}

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/** GA4 イベント affiliate_click のパラメータを組み立てる（純粋関数・テスト対象）。
 * 注: e.page は link_page として送信する（仕様 Phase 3 では page 名だが、GA4 の
 * 予約済み page_* パラメータ名前空間との衝突を避けるためリネームしている）。 */
export function buildAffiliateClickParams(e: AffiliateClickEvent) {
  return { link_page: e.page, advertiser: e.advertiser, position: e.position };
}

/** 広告クリックを GA4 に送る。gtag が無い環境では何もしない。 */
export function trackAffiliateClick(e: AffiliateClickEvent): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "affiliate_click", buildAffiliateClickParams(e));
}

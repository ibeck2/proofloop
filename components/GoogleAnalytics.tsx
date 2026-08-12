"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { redactTokenPath } from "@/lib/analytics/redactTokenPath";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
};

/**
 * SPA内の画面遷移ごとにページビューを手動送信する。
 *
 * 🚨 初回ロード分もここで送る。`gtag('config', ...)` の自動page_view送信は
 * `window.location` をブラウザが直接読み取るため、Reactのコードで後から
 * 介入できない（claimトークンを含む生URLがそのまま送られる）。そのため
 * 下の GoogleAnalytics コンポーネントで `send_page_view: false` を指定して
 * 自動送信を止め、初回を含む全ページビューをこちらに一本化している。
 * 「初回はスキップ」という分岐は絶対に戻さないこと。
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const w = window as GtagWindow;
    if (typeof w.gtag !== "function") return;

    const redactedPath = redactTokenPath(pathname);
    const query = searchParams.toString();
    const path = redactedPath + (query ? `?${query}` : "");
    // window.location.href をそのまま送ると page_path を丸めても
    // フルURL側に生トークンが残る。origin + 丸めたpath から組み立て直す。
    const location = `${window.location.origin}${path}`;

    // 🚨 この `gtag('set', ...)` を「page_view の引数と重複しているから」と
    // 削除しないこと。gtag.js は user_engagement など、このページから自動送信
    // する他の全イベントで `document.location` を直接読み直してURLを組み立てる。
    // page_view イベントの引数だけを丸めても、それはこのイベント1件にしか
    // 効かない。`gtag('set', ...)` でgtag.js自身が持つ「現在地」の基準値を
    // 丸めた値に書き換えて初めて、以降このページから飛ぶ他の全イベントにも
    // 丸めたURLが使われる（次のナビゲーションでこのeffectが再実行されるまで有効）。
    w.gtag("set", { page_path: path, page_location: location });
    w.gtag("event", "page_view", {
      page_path: path,
      page_location: location,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}

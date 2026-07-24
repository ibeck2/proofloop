import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 管理者・認証・クラブ専用ページはクロール禁止
        disallow: [
          "/admin/",
          "/api/",
          "/mypage/",
          "/invite/",
          // ログイン前提のページ。未ログインではログイン誘導しか見えないため、
          // インデックスさせる価値がない（sitemap からも外している）。
          "/timeline",
          "/schedule",
          "/(club)/",
          "/clubdashboard/",
          "/clubats/",
          "/clubmessages/",
          "/clubposts/",
          "/clubevents/",
          "/clubphotos/",
          "/clubtasks/",
          "/clubsettings/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}


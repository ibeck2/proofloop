import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── 静的ページ ──────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/baito`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/baito/simulator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/gpa`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    // /timeline と /schedule はログインが前提のページなので sitemap に載せない。
    // 未ログインのクローラにはログイン誘導しか見えず、インデックスさせる価値がない。
    // robots.ts でもクロール対象から外している。
    {
      url: `${SITE_URL}/classinfo`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/for-clubs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/manual`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // ── ガイド系ページ
    {
      url: `${SITE_URL}/guide`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide/circle`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide/study-abroad`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      // 留学先診断。拡散フックとして使う想定なのに sitemap から漏れていた。
      url: `${SITE_URL}/guide/study-abroad/recommend`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide/credits`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide/money`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/guide/living-alone`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // ── 動的ページ：団体詳細 (/organizations/[id]) ──
  // 環境変数が無い環境（別Vercelプロジェクト等）でもビルドを落とさないよう、
  // Supabaseクライアントは関数内で env の存在を確認してから生成する。
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let orgPages: MetadataRoute.Sitemap = [];
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // PostgREST は1リクエスト1,000行が上限。以前は .limit(1000) だったため、
      // 承認済み1,958団体のうち958件がsitemapから漏れていた。
      // sitemap 1ファイルあたりの上限は50,000 URL なので、全件を1ファイルに入れて問題ない。
      const PAGE_SIZE = 1000;
      const MAX_ROWS = 50000;
      const orgs: Array<{ id: string; created_at: string | null }> = [];

      for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from("organizations")
          .select("id, created_at")
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          // 途中で失敗した場合、それまでに取れたぶんは活かす。
          // 全部落とすより、一部でも送信できたほうがましなため。
          console.error("sitemap: organizations fetch failed", error);
          break;
        }

        const page = data ?? [];
        orgs.push(...page);
        if (page.length < PAGE_SIZE) break;
      }

      orgPages = orgs.map((org) => ({
        url: `${SITE_URL}/organizations/${org.id}`,
        lastModified: new Date(org.created_at ?? new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    } catch {
      // 取得失敗時は静的ページのみ返す
      console.error("sitemap: organizations fetch failed");
    }
  } else {
    console.warn("sitemap: Supabase env not set — 静的ページのみ生成します");
  }

  return [...staticPages, ...orgPages];
}

import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://proofloop-green.vercel.app";

// Supabaseをサーバーサイドで直接呼ぶ
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
      url: `${SITE_URL}/timeline`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/schedule`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
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
  let orgPages: MetadataRoute.Sitemap = [];
  try {
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (orgs) {
      orgPages = orgs.map((org) => ({
        url: `${SITE_URL}/organizations/${org.id}`,
        lastModified: new Date(org.created_at ?? new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // 取得失敗時は静的ページのみ返す
    console.error("sitemap: organizations fetch failed");
  }

  return [...staticPages, ...orgPages];
}


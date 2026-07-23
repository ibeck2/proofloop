import { createClient } from "@supabase/supabase-js";
import { UNIVERSITY_OPTIONS } from "@/constants/universities";
import { selectHeroOrganizations, type HeroOrg, type HeroOrgRow } from "./heroOrganizations";

export type UniversityCount = { university: string; count: number };
export type CategoryCount = { category: string; label: string; count: number };

export type HomeData = {
  totalOrganizations: number;
  universityCounts: UniversityCount[];
  categoryCounts: CategoryCount[];
  heroOrganizations: HeroOrg[];
};

/** トップに出すカテゴリ。DBの値（category）と、画面に出す短いラベルの対応 */
const DISPLAY_CATEGORIES: Array<{ category: string; label: string }> = [
  { category: "運動系（スポーツ・アウトドア）", label: "運動系" },
  { category: "文化系（音楽・演劇・アート）", label: "文化系" },
  { category: "学術・研究（ゼミ・研究会・勉強会）", label: "学術・研究" },
  { category: "趣味・その他", label: "趣味・その他" },
];

const EMPTY: HomeData = {
  totalOrganizations: 0,
  universityCounts: [],
  categoryCounts: [],
  heroOrganizations: [],
};

/**
 * トップページ用のデータを取得する。
 *
 * 環境変数が無い環境でもビルドを落とさないよう、クライアントは関数内で生成する
 * （app/sitemap.ts と同じ方針）。取得に失敗した場合は空データを返し、
 * 呼び出し側（Hero 等）は 0件でも壊れない描画をする。
 */
export async function getHomeData(): Promise<HomeData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("getHomeData: Supabase env not set — 空データを返します");
    return EMPTY;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    /** 承認済み団体の件数を数える。column/value を渡すとその条件で絞り込む */
    const countApproved = async (
      column?: "university" | "category",
      value?: string
    ): Promise<number> => {
      let query = supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", true);

      if (column && value) {
        query = query.eq(column, value);
      }

      const { count } = await query;
      return count ?? 0;
    };

    const [total, universityRaw, categoryRaw, heroRows] = await Promise.all([
      countApproved(),
      Promise.all(
        UNIVERSITY_OPTIONS.map(async (university) => ({
          university,
          count: await countApproved("university", university),
        }))
      ),
      Promise.all(
        DISPLAY_CATEGORIES.map(async ({ category, label }) => ({
          category,
          label,
          count: await countApproved("category", category),
        }))
      ),
      supabase
        .from("organizations")
        .select("id, name, university, category")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(60)
        .then(({ data }) => (data ?? []) as HeroOrgRow[]),
    ]);

    return {
      totalOrganizations: total,
      universityCounts: universityRaw
        .filter((u) => u.count > 0)
        .sort((a, b) => b.count - a.count),
      categoryCounts: categoryRaw.filter((c) => c.count > 0),
      heroOrganizations: selectHeroOrganizations(heroRows, 4),
    };
  } catch {
    console.error("getHomeData: 取得に失敗しました");
    return EMPTY;
  }
}

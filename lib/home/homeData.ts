import { createClient } from "@supabase/supabase-js";
import { UNIVERSITY_OPTIONS } from "@/constants/universities";
import { selectHeroOrganizations, type HeroOrg, type HeroOrgRow } from "./heroOrganizations";
import {
  buildOrganizationField,
  type FieldCluster,
  type FieldRow,
} from "./organizationField";

export type UniversityCount = { university: string; count: number };
export type CategoryCount = { category: string; label: string; count: number };

export type HomeData = {
  totalOrganizations: number;
  universityCounts: UniversityCount[];
  categoryCounts: CategoryCount[];
  heroOrganizations: HeroOrg[];
  /** 「1団体＝1マーク」の図の元データ。大学ごとの分野内訳 */
  organizationField: FieldCluster[];
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
  organizationField: [],
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

      const { count, error } = await query;

      // supabase-js は Postgrest のエラーで throw しない。ここで握り潰すと
      // 「取得に失敗した大学」が「0件の大学」と区別できなくなり、
      // 実数として表示している数字が静かに嘘になる。
      if (error) {
        throw new Error(
          `count query failed (${column ?? "total"}${value ? `=${value}` : ""}): ${error.message}`
        );
      }

      return count ?? 0;
    };

    const [total, universityRaw, categoryRaw] = await Promise.all([
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
    ]);

    const universityCounts = universityRaw
      .filter((u) => u.count > 0)
      .sort((a, b) => b.count - a.count);

    // ヒーローの4行は「掲載の新しい順」では選べない。
    // 団体は一括投入されており created_at が固まっているため、
    // 直近60件を取ると2大学しか含まれない（本番で確認済み）。
    // 掲載数の多い上位4大学から1件ずつ拾う形にして、4行を必ず埋める。
    const heroCandidates = (
      await Promise.all(
        universityCounts.slice(0, 4).map(async ({ university }) => {
          const { data, error } = await supabase
            .from("organizations")
            .select("id, name, university, category")
            .eq("is_approved", true)
            .eq("university", university)
            .order("name", { ascending: true })
            .limit(5);

          if (error) {
            throw new Error(
              `hero query failed (${university}): ${error.message}`
            );
          }

          return (data ?? []) as HeroOrgRow[];
        })
      )
    ).flat();

    // 図に描くのは1団体1マーク。集計はJS側で行うので、
    // 大学×分野の組み合わせぶんクエリを撃つ必要はなく、
    // (university, category) を全件1回引いて数えるほうが軽い。
    // PostgREST は1リクエスト1,000行が上限なのでページングする。
    const PAGE_SIZE = 1000;
    const MAX_ROWS = 5000;
    const fieldRows: FieldRow[] = [];

    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("organizations")
        .select("university, category")
        .eq("is_approved", true)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`field query failed (from=${from}): ${error.message}`);
      }

      const page = (data ?? []) as FieldRow[];
      fieldRows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    return {
      totalOrganizations: total,
      universityCounts,
      categoryCounts: categoryRaw
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count),
      heroOrganizations: selectHeroOrganizations(heroCandidates, 4),
      organizationField: buildOrganizationField(fieldRows),
    };
  } catch (error) {
    console.error("getHomeData: 取得に失敗しました", error);
    return EMPTY;
  }
}

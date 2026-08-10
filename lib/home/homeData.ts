import { createClient } from "@supabase/supabase-js";
import { UNIVERSITY_OPTIONS } from "@/constants/universities";
import { pickHeroOrganizations, type HeroOrg, type HeroOrgRow } from "./heroOrganizations";
import {
  buildOrganizationField,
  type FieldCluster,
  type FieldRow,
} from "./organizationField";
import {
  countByCategory,
  countByUniversity,
  type CategoryCount,
  type UniversityCount,
} from "./organizationCounts";

export type { UniversityCount, CategoryCount };

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

/**
 * ヒーローに出さない団体。
 * `4003e084-…` は「ProofLoop運営事務局」（自社の窓口用アカウント）。
 * 名前で除外すると「一橋祭運営委員会」のような正当な団体まで消えるため、IDで指定する。
 */
const HERO_EXCLUDED_IDS = ["4003e084-8da8-4315-b0dc-3dcce3da42d0"] as const;

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

    // 掲載団体を1回だけ全件引き、図・ヒーロー・件数のすべてに使う。
    // 図は1団体1マークなので全件が要る。ヒーローもここからランダムに選ぶ。
    // 件数も同じ行から数える：以前は大学14件＋分野4件＋合計の19本を
    // `count: "exact"` で撃っていたが、`organizations` には is_approved にも
    // university にも索引が無く、1本ごとに全件走査（しかも PostgREST の count は
    // 同じ走査を2度行う）。トップ1描画で約4,700ブロックを読んでいた。
    // PostgREST は1リクエスト1,000行が上限なのでページングする。
    const PAGE_SIZE = 1000;
    const MAX_ROWS = 20000;
    const allRows: Array<HeroOrgRow & FieldRow> = [];
    let complete = false;

    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, university, category")
        .eq("is_approved", true)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(
          `organizations query failed (from=${from}): ${error.message}`
        );
      }

      const page = (data ?? []) as Array<HeroOrgRow & FieldRow>;
      allRows.push(...page);
      if (page.length < PAGE_SIZE) {
        complete = true;
        break;
      }
    }

    // 件数をこの行から数えるようになったので、取り切れていないと数字が静かに小さくなる。
    // 旧実装は count クエリが別だったのでこの取りこぼしは数に出なかった。
    if (!complete) {
      throw new Error(
        `organizations query truncated at ${MAX_ROWS} rows — 件数が実数とずれるため中断`
      );
    }

    return {
      totalOrganizations: allRows.length,
      universityCounts: countByUniversity(allRows, UNIVERSITY_OPTIONS),
      categoryCounts: countByCategory(allRows, DISPLAY_CATEGORIES),
      heroOrganizations: pickHeroOrganizations(allRows, {
        limit: 4,
        excludeIds: HERO_EXCLUDED_IDS,
      }),
      organizationField: buildOrganizationField(allRows),
    };
  } catch (error) {
    console.error("getHomeData: 取得に失敗しました", error);
    return EMPTY;
  }
}

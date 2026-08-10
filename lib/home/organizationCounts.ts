/**
 * トップページの「大学別」「分野別」の件数を、掲載団体の行から数える。
 *
 * 以前はこの数を大学ごと・分野ごとの `count: "exact"` クエリで取っていた。
 * `organizations` には `is_approved` にも `university` にも索引が無いため、
 * 1本ごとに全件走査が起き、しかも PostgREST の count は同じ走査を2度行う。
 * トップの1描画で19本＝約4,700ブロックを読んでいた。
 *
 * 図（organizationField）とヒーローのために掲載団体は**どのみち全件引いている**ので、
 * その同じ行から数えれば追加のクエリは要らない。
 * ここで数を作らないこと。実データと1件でもずれたら画面が嘘をつく。
 */

export type CountableRow = {
  university: string | null;
  category: string | null;
};

export type UniversityCount = { university: string; count: number };
export type CategoryCount = { category: string; label: string; count: number };

/**
 * 大学ごとの件数。`allowed` に挙げた大学だけを、件数の多い順に返す。
 *
 * `allowed` で絞るのは、旧実装が `UNIVERSITY_OPTIONS` を1つずつ問い合わせていた挙動と
 * 揃えるため。DBには選択肢に無い大学名の行も入っているので、絞らないと画面の項目が増える。
 * 0件の大学は返さない（旧実装の `.filter((u) => u.count > 0)` と同じ）。
 */
export function countByUniversity(
  rows: readonly CountableRow[],
  allowed: readonly string[]
): UniversityCount[] {
  const allowedSet = new Set(allowed);
  const tally = new Map<string, number>();

  for (const row of rows) {
    const university = row.university;
    // `.eq("university", value)` と同じ突き合わせにする。trim すると
    // 前後に空白のある行が旧実装では数えられなかったのに数えられてしまう。
    if (university === null || !allowedSet.has(university)) continue;
    tally.set(university, (tally.get(university) ?? 0) + 1);
  }

  return allowed
    .map((university) => ({ university, count: tally.get(university) ?? 0 }))
    .filter((u) => u.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * 表示対象の分野ごとの件数。件数の多い順で、0件の分野は返さない。
 */
export function countByCategory(
  rows: readonly CountableRow[],
  displayCategories: readonly { category: string; label: string }[]
): CategoryCount[] {
  const tally = new Map<string, number>();

  for (const row of rows) {
    const category = row.category;
    if (category === null) continue;
    tally.set(category, (tally.get(category) ?? 0) + 1);
  }

  return displayCategories
    .map(({ category, label }) => ({
      category,
      label,
      count: tally.get(category) ?? 0,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
}

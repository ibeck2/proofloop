/**
 * トップページの「1団体＝1マーク」の図に渡すデータを組み立てる。
 *
 * 掲載している団体を大学ごとに束ね、分野ごとの内訳を持たせる。
 * 図はこの内訳をそのまま描くので、**ここで数を作らないこと**。
 * 実データと1件でもずれたら、画面が嘘をつくことになる。
 */

export type FieldRow = {
  university: string | null;
  category: string | null;
};

export type CategoryKey = "sports" | "culture" | "academic" | "other";

export const CATEGORY_KEYS: CategoryKey[] = [
  "sports",
  "culture",
  "academic",
  "other",
];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  sports: "運動系",
  culture: "文化系",
  academic: "学術・研究",
  other: "その他",
};

export type FieldCluster = {
  university: string;
  total: number;
  counts: Record<CategoryKey, number>;
};

/**
 * 分野の判定は前方一致で行う。
 * DBには括弧内が文字化けした行が実在する（「運動系（スポーツ・アウトド�ア）」など）ため、
 * 完全一致にすると本来運動系の団体が「その他」に落ちる。
 */
function classify(category: string | null): CategoryKey {
  const value = (category ?? "").trim();
  if (value.startsWith("運動系")) return "sports";
  if (value.startsWith("文化系")) return "culture";
  if (value.startsWith("学術・研究")) return "academic";
  return "other";
}

export function buildOrganizationField(rows: FieldRow[]): FieldCluster[] {
  const byUniversity = new Map<string, FieldCluster>();

  for (const row of rows) {
    const university = (row.university ?? "").trim();
    if (university === "") continue;

    let cluster = byUniversity.get(university);
    if (!cluster) {
      cluster = {
        university,
        total: 0,
        counts: { sports: 0, culture: 0, academic: 0, other: 0 },
      };
      byUniversity.set(university, cluster);
    }

    cluster.total += 1;
    cluster.counts[classify(row.category)] += 1;
  }

  return Array.from(byUniversity.values()).sort((a, b) => b.total - a.total);
}

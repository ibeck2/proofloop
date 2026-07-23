/**
 * トップページのヒーローに出す団体を選ぶ。
 *
 * 仕様: docs/superpowers/specs/2026-07-23-ui-identity-design.md §6.3
 * - 大学が重複しないように選ぶ（同じ大学が並ぶと「網羅している」印象が出ない）
 * - 文字化けした行は出さない（DBに実在する。§3参照）
 * - 名前・大学名が欠けている行は出さない
 */

export type HeroOrgRow = {
  id: string;
  name: string | null;
  university: string | null;
  category: string | null;
};

export type HeroOrg = {
  id: string;
  name: string;
  university: string;
};

/** 文字化けの検出。Unicode の REPLACEMENT CHARACTER を含む行は壊れている */
function isGarbled(...values: Array<string | null>): boolean {
  return values.some((v) => v != null && v.includes("�"));
}

/**
 * 掲載団体からランダムに選ぶ。
 *
 * 並び順に意味を持たせない（名前順だと毎回同じ4件が出て、掲載が増えても画面が変わらない）。
 * `random` を差し替えられるようにしてあるのはテストのため。
 * 実際に選び直されるのは ISR の再生成時なので、1時間に1回程度。
 */
export function pickHeroOrganizations(
  rows: HeroOrgRow[],
  options: {
    limit?: number;
    excludeIds?: readonly string[];
    random?: () => number;
  } = {}
): HeroOrg[] {
  const { limit = 4, excludeIds = [], random = Math.random } = options;
  const excluded = new Set(excludeIds);

  const shuffled = rows.filter((row) => !excluded.has(row.id));
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return selectHeroOrganizations(shuffled, limit);
}

export function selectHeroOrganizations(
  rows: HeroOrgRow[],
  limit = 4
): HeroOrg[] {
  const seenUniversities = new Set<string>();
  const selected: HeroOrg[] = [];

  for (const row of rows) {
    if (selected.length >= limit) break;

    const name = (row.name ?? "").trim();
    const university = (row.university ?? "").trim();

    if (name === "" || university === "") continue;
    if (isGarbled(row.name, row.university, row.category)) continue;
    if (seenUniversities.has(university)) continue;

    seenUniversities.add(university);
    selected.push({ id: row.id, name, university });
  }

  return selected;
}

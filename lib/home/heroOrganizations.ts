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

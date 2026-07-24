import type { ResourceGroupData } from "./resources";

/** 非アフィリエイトのリンクを1つも持たない（＝広告のみの）グループの id を返す。
 * 信頼性原則「一次情報が主役／広告のみのブロックを作らない」を機械的に担保する。 */
export function findAdOnlyGroups(groups: ResourceGroupData[]): string[] {
  return groups
    .filter((g) => g.links.length > 0 && g.links.every((l) => l.kind === "affiliate"))
    .map((g) => g.id);
}

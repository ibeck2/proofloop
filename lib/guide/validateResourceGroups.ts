import type { ResourceGroupData } from "./resources";

/** 非アフィリエイトのリンクを1つも持たない（＝広告のみの）グループの id を返す。
 * 信頼性原則「一次情報が主役／広告のみのブロックを作らない」を機械的に担保する。 */
export function findAdOnlyGroups(groups: ResourceGroupData[]): string[] {
  return groups
    .filter((g) => g.links.length > 0 && g.links.every((l) => l.kind === "affiliate"))
    .map((g) => g.id);
}

// バリューコマース等の広告URLは kind:"affiliate" 以外で使ってはいけない
// （誤ラベルすると開示 rel=sponsored/※広告 が消え、ステマ規制違反になる）。
const AFFILIATE_URL_MARKERS = ["valuecommerce.com", "ck.jp.ap.valuecommerce"];

/** 広告URL（VC/MyLink）なのに kind が affiliate でないリンクを検出する。
 * 空配列なら健全。開示のバイパス（誤ラベル）を機械的に防ぐ。 */
export function findMislabeledAffiliateLinks(
  groups: ResourceGroupData[]
): { groupId: string; url: string }[] {
  const out: { groupId: string; url: string }[] = [];
  for (const g of groups)
    for (const l of g.links)
      if (l.kind !== "affiliate" && AFFILIATE_URL_MARKERS.some((m) => l.url.includes(m)))
        out.push({ groupId: g.id, url: l.url });
  return out;
}

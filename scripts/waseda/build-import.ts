/**
 * 収集した早稲田サークルを organizations の投入形に変換し、確認用の集計を出す。
 * このスクリプトはDBに書き込まない。生成物を見てから投入する。
 *
 * 使い方:
 *   npx tsx scripts/waseda/build-import.ts                    説明文なし・非公開（既定）
 *   npx tsx scripts/waseda/build-import.ts --with-description 説明文を含める
 *   npx tsx scripts/waseda/build-import.ts --approved         公開状態で投入する形にする
 */
import { readFileSync, writeFileSync } from "node:fs";

import { toOrganization } from "../../lib/organizations/wasedaImport";

const includeDescription = process.argv.includes("--with-description");
const isApproved = process.argv.includes("--approved");

const circles = JSON.parse(readFileSync("scripts/waseda/data/circles.json", "utf8"));

// ジャンルは一覧ページ側にしかない。詳細ページ末尾の「Waseda Circle Search: ◯◯」は
// 関連サークル欄の見出しで、そのサークル自身のジャンルではない。
const ids = JSON.parse(readFileSync("scripts/waseda/data/ids.json", "utf8"));
const genresById: Record<string, string[]> = {};
for (const [genre, list] of Object.entries(ids.byGenre as Record<string, string[]>))
  for (const id of list) (genresById[id] ??= []).push(genre);

// 同じサークルが複数IDで載っていることがあるので名前で重複を落とす
const seen = new Set();
const rows: ReturnType<typeof toOrganization>[] = [];
const dupes: string[] = [];
for (const c of circles as any[]) {
  const key = c.name.trim();
  if (seen.has(key)) { dupes.push(key); continue; }
  seen.add(key);
  rows.push(toOrganization(c, { includeDescription, isApproved, genres: genresById[String(c.id)] ?? [] }));
}

const out = "scripts/waseda/data/import.json";
writeFileSync(out, JSON.stringify(rows, null, 2));

const filled = (f: string) => rows.filter((r) => (r as any)[f] !== null && (r as any)[f] !== "").length;
const pct = (n: number) => `${n} (${Math.round((n / rows.length) * 100)}%)`;

const noGenre = circles.filter((c: any) => !genresById[String(c.id)]).length;
console.log(`収集 ${circles.length}件 → 重複除去後 ${rows.length}件（うちジャンル不明 ${noGenre}件は団体名から推定）`);
if (dupes.length) console.log(`  重複した名前: ${[...new Set(dupes)].slice(0, 10).join(", ")}`);
console.log(`\n設定: 説明文=${includeDescription ? "含める" : "含めない"} / 公開=${isApproved}`);

console.log("\n── 項目の充足率 ──");
for (const f of ["description", "member_count", "activity_frequency", "location_detail", "x_id", "instagram_id", "website_url"])
  console.log(`  ${f.padEnd(20)} ${pct(filled(f))}`);

console.log("\n── カテゴリ分布 ──");
const byCat: Record<string, number> = {};
for (const r of rows) byCat[r.category] = (byCat[r.category] ?? 0) + 1;
for (const [c, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(4)}  ${c}`);

console.log(`\n生成: ${out}`);

/**
 * organizations.category を団体名から付け直すための棚卸しスクリプト。
 *
 * 既存データは分類として機能していなかった（「ラグビー…クラブ」が文化系、
 * 「囲碁部」が運動系など）。lib/organizations/classifyCategory.ts のルールを
 * 本番の全団体に当てて、変更前後の分布と変更対象を書き出す。
 *
 * このスクリプト自体はDBに書き込まない。読み取りと、適用用SQLの生成だけを行う。
 * 実際の更新は生成された SQL をレビューしてから流す。
 *
 * 使い方: npx tsx scripts/reclassify-categories.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { classifyCategory } from "../lib/organizations/classifyCategory";

// .env.local を素朴に読む（このスクリプトのためだけに dotenv を足したくない）
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Row = { id: string; name: string | null; university: string | null; category: string | null };

async function fetchAll(): Promise<Row[]> {
  const rows: Row[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, university, category")
      .eq("is_approved", true)
      .order("id")
      .range(from, from + size - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < size) break;
  }
  return rows;
}

function tally(values: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v ?? "(未設定)", (m.get(v ?? "(未設定)") ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
const rows = await fetchAll();

const changes = rows
  .map((r) => ({ ...r, next: classifyCategory(r.name, r.university) }))
  .filter((r) => r.next !== null && r.next !== r.category);

const after = rows.map((r) => classifyCategory(r.name, r.university) ?? r.category);

console.log(`承認済み団体: ${rows.length}件`);
console.log(`判定できた: ${rows.filter((r) => classifyCategory(r.name, r.university)).length}件`);
console.log(`変更対象: ${changes.length}件\n`);

console.log("── 変更前の分布 ──");
for (const [c, n] of tally(rows.map((r) => r.category))) console.log(`  ${String(n).padStart(4)}  ${c}`);
console.log("\n── 変更後の分布 ──");
for (const [c, n] of tally(after)) console.log(`  ${String(n).padStart(4)}  ${c}`);

console.log("\n── 変更内容ごとのサンプル ──");
const byTransition = new Map<string, string[]>();
for (const c of changes) {
  const k = `${c.category} → ${c.next}`;
  if (!byTransition.has(k)) byTransition.set(k, []);
  byTransition.get(k)!.push(c.name ?? "");
}
for (const [k, names] of [...byTransition.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  [${String(names.length).padStart(4)}] ${k}`);
  console.log(`         例: ${names.slice(0, 5).join(" / ")}`);
}

// 適用後にこのスクリプトを再実行すると changes は 0 件になる。そのとき書き出すと、
// 差し戻し用の記録を空で上書きしてしまう（実際に一度やってしまった）。
if (changes.length === 0) {
  console.log("\n変更対象が無いので、差し戻し用の記録は書き換えません。");
  return;
}

// 適用用SQLと、元に戻すための記録を書き出す
mkdirSync("docs/data", { recursive: true });

const esc = (s: string) => `'${s.replace(/'/g, "''")}'`;
const sql = [
  "-- lib/organizations/classifyCategory.ts の判定結果を反映する。",
  "-- 生成: scripts/reclassify-categories.ts",
  `-- 対象 ${changes.length} 件`,
  "update organizations as o set category = v.category",
  "from (values",
  changes.map((c) => `  (${esc(c.id)}::uuid, ${esc(c.next!)})`).join(",\n"),
  ") as v(id, category)",
  "where o.id = v.id;",
].join("\n");
writeFileSync("docs/data/category-reclassify.sql", sql);

writeFileSync(
  "docs/data/category-reclassify-before.json",
  JSON.stringify(
    changes.map((c) => ({ id: c.id, name: c.name, before: c.category, after: c.next })),
    null,
    2
  )
);

console.log("\n生成: docs/data/category-reclassify.sql / category-reclassify-before.json");
}

main();

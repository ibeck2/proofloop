/**
 * 投入結果を、手元の import.json と1件ずつ突き合わせる。
 * MCP経由で長いSQLを手で流しているので、取りこぼしや取り違えが無いか確かめる。
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] ??= m[2];
}
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

const FIELDS = ["category","member_count","activity_frequency","location_detail","x_id","instagram_id","line_url","website_url"] as const;

async function main() {
  const expected = JSON.parse(readFileSync("scripts/waseda/data/import.json", "utf8")) as any[];

  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("organizations")
      .select("name," + FIELDS.join(","))
      .eq("university", "早稲田大学")
      .order("name")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const byName = new Map(rows.map((r) => [r.name, r]));
  const missing: string[] = [];
  const mismatched: string[] = [];

  for (const e of expected) {
    const a = byName.get(e.name);
    if (!a) { missing.push(e.name); continue; }
    for (const f of FIELDS) {
      const ev = e[f] ?? null;
      const av = a[f] ?? null;
      if (ev !== av) mismatched.push(`${e.name} / ${f}: 期待=${JSON.stringify(ev)} 実際=${JSON.stringify(av)}`);
    }
  }

  const extra = rows.filter((r) => !expected.some((e) => e.name === r.name)).map((r) => r.name);

  console.log(`期待 ${expected.length}件 / DB ${rows.length}件`);
  console.log(`未投入: ${missing.length}件`, missing.slice(0, 10));
  console.log(`余分  : ${extra.length}件`, extra.slice(0, 10));
  console.log(`値の不一致: ${mismatched.length}件`);
  mismatched.slice(0, 10).forEach((m) => console.log("  " + m));
}

main();

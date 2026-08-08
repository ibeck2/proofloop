/**
 * 掲載団体 2,354件の「声かけ優先順位」リストを生成する。
 *
 *   node docs/models/build-org-outreach-list.mjs
 *
 * 出力：
 *   docs/models/団体_声かけ優先順位.csv      … 全件（スコア・順位・バッチ付き）
 *   docs/models/org-outreach-summary.json    … 上位100件と集計（Excel生成が読む）
 *
 * 公開データ（is_approved=true）のみを anon キーで読む。書き込みは一切しない。
 *
 * ── スコアの考え方（100点満点）─────────────────────────────
 *  到達手段 30 … X/Instagram/公式サイトを各10点。DMが届かなければ何も始まらない
 *  大学規模 25 … 同じ大学に団体が多いほど口コミが効く（ネットワーク効果は大学内で起きる）
 *  協賛需要 25 … カテゴリ別。学園祭・遠征・公演など資金ニーズが明確なほど高い
 *  団体規模 20 … 人数。大きいほど影響力があり、会計の手間も大きい＝財務DXが刺さる
 *
 * ── バッチの配分 ──────────────────────────────────────
 *  第1バッチ（200件）は「学習」が目的なので、13大学すべてに比例配分して撒く。
 *  大学別・カテゴリ別の claim 率を測ってから、第2バッチ以降を勝ち筋に寄せる。
 *  そのため単純なスコア降順ではなく「大学内順位 ÷ 大学の団体数」で並べ替えている
 *  （＝どの大学からも上位から均等に取り出される）。
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, "..", "..");

// .env.local を読む（Next.js の外で動かすため手動で解釈する）
const env = Object.fromEntries(
  readFileSync(path.join(ROOT, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// カテゴリ別の協賛需要スコア。資金ニーズの明確さで置いている
const CATEGORY_DEMAND = {
  "イベント・企画（インカレ・学園祭等）": 25, // 学園祭の協賛は最も定型化している
  "運動系（スポーツ・アウトドア）": 20,        // 遠征費・用具費
  "国際交流・語学": 20,                       // 渡航費・助成金
  "文化系（音楽・演劇・アート）": 15,          // 公演費
  "メディア・出版": 15,
  "ボランティア・NPO": 15,                    // 助成金ニーズ
  "学術・研究（ゼミ・研究会・勉強会）": 10,
  "趣味・その他": 10,
};

const BATCH_PLAN = [
  { no: 1, label: "2026-08 第1バッチ（学習）", size: 200 },
  { no: 2, label: "2026-09 第2バッチ", size: 350 },
  { no: 3, label: "2026-10 第3バッチ", size: 350 },
  { no: 4, label: "2026-11 第4バッチ", size: 250 },
  { no: 5, label: "2026-12 第5バッチ", size: 150 },
  { no: 6, label: "2027-01 第6バッチ", size: 100 },
];

/** 「４０人」のような全角混じりの表記から人数を取り出す */
function parseMemberCount(raw) {
  if (!raw) return null;
  const half = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const digits = half.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : null;
}

function sizeScore(mc) {
  if (mc === null) return 5;
  if (mc >= 100) return 20;
  if (mc >= 50) return 15;
  if (mc >= 20) return 10;
  return 5;
}

/** 到達手段。DMが届かなければ声かけが成立しないので最重視 */
function reachScore(o) {
  return (o.x_id ? 10 : 0) + (o.instagram_id ? 10 : 0) + (o.website_url ? 10 : 0);
}

function reachChannels(o) {
  const c = [];
  if (o.x_id) c.push("X");
  if (o.instagram_id) c.push("Instagram");
  if (o.website_url) c.push("Web");
  if (o.line_url) c.push("LINE");
  return c.join("/");
}

async function fetchAll() {
  const cols =
    "id,name,university,category,member_count,x_id,instagram_id,line_url,website_url";
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("organizations")
      .select(cols)
      .eq("is_approved", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

const rows = await fetchAll();
console.log(`取得: ${rows.length}件`);

// 到達手段が1つも無い団体は声かけの対象外（DMも送れない）
const reachable = rows.filter((o) => reachScore(o) > 0);
const unreachable = rows.length - reachable.length;

const uniCount = {};
reachable.forEach((o) => (uniCount[o.university] = (uniCount[o.university] || 0) + 1));
const maxUni = Math.max(...Object.values(uniCount));

const scored = reachable.map((o) => {
  const mc = parseMemberCount(o.member_count);
  const s_reach = reachScore(o);
  const s_univ = Math.round((uniCount[o.university] / maxUni) * 25);
  const s_cat = CATEGORY_DEMAND[o.category] ?? 10;
  const s_size = sizeScore(mc);
  return {
    ...o, mc, s_reach, s_univ, s_cat, s_size,
    score: s_reach + s_univ + s_cat + s_size,
    channels: reachChannels(o),
  };
});

// 大学ごとにスコア降順で順位を振る
const byUni = {};
scored.forEach((o) => (byUni[o.university] ||= []).push(o));
Object.values(byUni).forEach((list) => {
  list.sort((a, b) => b.score - a.score || (b.mc ?? 0) - (a.mc ?? 0));
  list.forEach((o, i) => {
    o.uniRank = i + 1;
    // 大学内順位を団体数で正規化する。これで並べ替えると全大学から均等に取り出される
    o.spread = (i + 1) / list.length;
  });
});

scored.sort((a, b) => a.spread - b.spread || b.score - a.score);
scored.forEach((o, i) => {
  o.order = i + 1;
  let acc = 0, batch = null, label = "（1,400件の対象外・claim率が良ければ追加）";
  for (const b of BATCH_PLAN) {
    acc += b.size;
    if (o.order <= acc) { batch = b.no; label = b.label; break; }
  }
  o.batch = batch ?? "";
  o.batchLabel = label;
});

// ── CSV 出力 ────────────────────────────────────────────
const HEAD = ["順位","バッチ","バッチ名","団体名","大学","カテゴリ","人数","到達手段",
  "X","Instagram","公式サイト","スコア","到達点","大学点","需要点","規模点","大学内順位","団体ID","接触日","結果","メモ"];
const esc = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = [HEAD.join(",")].concat(
  scored.map((o) => [
    o.order, o.batch, o.batchLabel, o.name, o.university, o.category,
    o.mc ?? "", o.channels,
    o.x_id ? `https://x.com/${String(o.x_id).replace(/^@/, "")}` : "",
    o.instagram_id ? `https://instagram.com/${String(o.instagram_id).replace(/^@/, "")}` : "",
    o.website_url ?? "",
    o.score, o.s_reach, o.s_univ, o.s_cat, o.s_size, o.uniRank, o.id, "", "", "",
  ].map(esc).join(","))
).join("\r\n");

const csvPath = path.join(DIR, "団体_声かけ優先順位.csv");
writeFileSync(csvPath, "﻿" + csv, "utf8"); // BOM付き（Excelで文字化けさせない）
console.log("wrote:", csvPath);

// ── Excel 生成が読むサマリ ──────────────────────────────
const batch1 = scored.filter((o) => o.batch === 1);
const uniBreakdown = {};
batch1.forEach((o) => (uniBreakdown[o.university] = (uniBreakdown[o.university] || 0) + 1));
const catBreakdown = {};
batch1.forEach((o) => (catBreakdown[o.category] = (catBreakdown[o.category] || 0) + 1));

const summary = {
  generatedFrom: "本番Supabase（is_approved=true）",
  total: rows.length,
  reachable: reachable.length,
  unreachable,
  universities: Object.entries(uniCount).sort((a, b) => b[1] - a[1]),
  batch1Universities: Object.entries(uniBreakdown).sort((a, b) => b[1] - a[1]),
  batch1Categories: Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]),
  top100: scored.slice(0, 100).map((o) => ({
    order: o.order, batch: o.batch, name: o.name, university: o.university,
    category: o.category, mc: o.mc, channels: o.channels, score: o.score,
  })),
};
const jsonPath = path.join(DIR, "org-outreach-summary.json");
writeFileSync(jsonPath, JSON.stringify(summary, null, 2), "utf8");
console.log("wrote:", jsonPath);

console.log(`\n到達可能 ${reachable.length}件 / 到達手段なし ${unreachable}件`);
console.log("第1バッチ200件の大学配分:",
  Object.entries(uniBreakdown).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}${v}`).join(" "));
console.log("第1バッチ200件のカテゴリ配分:",
  Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k.slice(0, 6)}${v}`).join(" "));

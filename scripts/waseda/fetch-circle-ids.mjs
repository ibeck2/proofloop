/**
 * 早稲田ウィークリー サークルガイドの全ジャンルを走査して、詳細ページのIDを集める。
 *
 * 一覧ページはジャンル単位でしか引けず、ページ送りが無い（paged=2 は0件）。
 * サークルは複数ジャンルに属するので、全ジャンルの和集合を取ることで網羅する。
 *
 * 相手のサーバに負荷をかけないよう、逐次アクセスして間隔を空ける。
 */
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = "https://www.waseda.jp/inst/weekly/circleguide";
const OUT = "scripts/waseda/data";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getGenres() {
  const html = await (await fetch(`${BASE}/`)).text();
  return [...new Set([...html.matchAll(/genre\[\]=([a-z-]+)/g)].map((m) => m[1]))].sort();
}

async function idsForGenre(genre) {
  const url = `${BASE}/list/?genre%5B%5D=${genre}`;
  const html = await (await fetch(url)).text();
  return [...new Set([...html.matchAll(/detail\/\?id=(\d+)/g)].map((m) => m[1]))];
}

const genres = await getGenres();
console.log(`ジャンル数: ${genres.length}`);

const byGenre = {};
const all = new Set();
for (const g of genres) {
  const ids = await idsForGenre(g);
  byGenre[g] = ids;
  ids.forEach((i) => all.add(i));
  console.log(`  ${g.padEnd(34)} ${String(ids.length).padStart(3)}件  (累計 ${all.size})`);
  await sleep(700);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/ids.json`, JSON.stringify({ byGenre, all: [...all].sort((a, b) => a - b) }, null, 2));
console.log(`\nユニークID: ${all.size}件 → ${OUT}/ids.json`);

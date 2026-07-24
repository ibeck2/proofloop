/**
 * 早稲田ウィークリーのサークル詳細ページを走査して項目を取り出す。
 *
 * 一覧ページはジャンルあたり24件で頭打ちになり（11ジャンルが上限に達していた）、
 * ページ送りも無いので、一覧からの収集では取りこぼす。詳細ページのIDが
 * 連番なので、実測したID範囲を直接なめる方が確実に全件そろう。
 *
 * 相手のサーバに負荷をかけないよう、逐次アクセスして間隔を空ける。
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { parseCircleDetail } from "./parseCircleDetail.mjs";

const OUT = "scripts/waseda/data";
const FROM = 3000;
const TO = 3900;
const DELAY_MS = 400;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const outFile = `${OUT}/circles.json`;

// 途中で止めても再開できるようにする
const found = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : [];
const done = new Set(found.map((c) => c.id));

let misses = 0;
for (let id = FROM; id <= TO; id++) {
  if (done.has(id)) continue;
  try {
    const res = await fetch(`https://www.waseda.jp/inst/weekly/circleguide/detail/?id=${id}`);
    if (res.ok) {
      const parsed = parseCircleDetail(await res.text(), id);
      if (parsed?.name) {
        found.push(parsed);
        if (found.length % 25 === 0) {
          writeFileSync(outFile, JSON.stringify(found, null, 2));
          console.log(`  ${found.length}件 (id=${id})`);
        }
      } else misses++;
    } else misses++;
  } catch (e) {
    misses++;
  }
  await sleep(DELAY_MS);
}

found.sort((a, b) => a.id - b.id);
writeFileSync(outFile, JSON.stringify(found, null, 2));
console.log(`\n取得: ${found.length}件 / 該当なし: ${misses}件 → ${outFile}`);

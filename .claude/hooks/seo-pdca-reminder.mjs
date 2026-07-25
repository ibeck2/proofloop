// SEO PDCA 点検リマインダー（SessionStart フック）
//
// docs/seo/reports/.last-run に記録された前回実行日を読み、28日を過ぎていたら
// セッション開始時に一言だけ出す。GSC/GA4 の解析→改善提案は「忘れる」ことが
// 最大の失敗要因なので、思い出す仕掛けをここに置いている。
//
// 方針：何があってもセッション開始を妨げない。読めない・壊れている場合は黙って終わる。

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INTERVAL_DAYS = 28;

try {
  const here = dirname(fileURLToPath(import.meta.url)); // <root>/.claude/hooks
  const stampPath = join(here, "..", "..", "docs", "seo", "reports", ".last-run");

  let lastRun = null;
  try {
    const raw = readFileSync(stampPath, "utf8").trim();
    // YYYY-MM-DD のみ受け付ける。壊れた値で誤ったリマインドを出さないため。
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const parsed = new Date(`${raw}T00:00:00Z`);
      if (!Number.isNaN(parsed.getTime())) lastRun = parsed;
    }
  } catch {
    // ファイルが無い＝一度も実行していない。下で「未実施」として扱う。
  }

  if (lastRun === null) {
    console.log(
      "【SEO PDCA点検】まだ一度も実行されていません。" +
        "GSC/GA4 で各ページの反応を解析し改善提案を出すには seo-pdca スキル（/seo-pdca）を使ってください。"
    );
  } else {
    const elapsedDays = Math.floor((Date.now() - lastRun.getTime()) / 86_400_000);
    if (elapsedDays >= INTERVAL_DAYS) {
      const ymd = lastRun.toISOString().slice(0, 10);
      console.log(
        `【SEO PDCA点検】前回の解析は ${ymd}（${elapsedDays}日前）です。` +
          "月1回（28日）を目安にしているため、seo-pdca スキル（/seo-pdca）で回してください。"
      );
    }
  }
} catch {
  // 想定外の失敗でセッション開始を止めない。
}

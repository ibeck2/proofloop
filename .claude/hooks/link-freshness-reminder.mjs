// 掲載リンクの鮮度点検リマインダー（SessionStart フック）
//
// docs/.link-freshness-last-run に記録された前回実行日を読み、30日を過ぎていたら
// セッション開始時に一言だけ出す。ProofLoopの信頼性は一次情報の鮮度に依存していて、
// 点検は「忘れる」ことが最大の失敗要因なので、思い出す仕掛けをここに置いている。
//
// 方針：何があってもセッション開始を妨げない。読めない・壊れている場合は黙って終わる。

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const INTERVAL_DAYS = 30;

try {
  const here = dirname(fileURLToPath(import.meta.url)); // <root>/.claude/hooks
  const stampPath = join(here, "..", "..", "docs", ".link-freshness-last-run");

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
      "【リンク鮮度点検】まだ一度も実行されていません。" +
        "掲載リンクの生死と一次情報の陳腐化を点検するには link-freshness スキルを使ってください。"
    );
  } else {
    const elapsedDays = Math.floor((Date.now() - lastRun.getTime()) / 86_400_000);
    if (elapsedDays >= INTERVAL_DAYS) {
      const ymd = lastRun.toISOString().slice(0, 10);
      console.log(
        `【リンク鮮度点検】前回の点検は ${ymd}（${elapsedDays}日前）です。` +
          "月1回を目安にしているため、link-freshness スキルで点検してください。"
      );
    }
  }
} catch {
  // 想定外の失敗でセッション開始を止めない。
}

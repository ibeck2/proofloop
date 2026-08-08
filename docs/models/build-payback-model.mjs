/**
 * ProofLoop 投資回収モデル（Excel）を生成する。
 *
 *   node docs/models/build-payback-model.mjs [出力ファイル名]
 *
 * 出力は docs/models/ 配下。数式を埋め込んであるので、「前提」シートの黄色いセルを
 * 書き換えると全シートが再計算される。値のハードコードは「前提」の入力セルだけ。
 *
 * 2026-08-07 改訂：団体獲得を「コールド新規開拓」から
 * 「掲載済み2,354団体にページを引き取ってもらう（claim誘導）」motion に組み替えた。
 * organizations にメール列が無いため、接触チャネルは SNS DM と公式サイトのフォーム。
 */
import ExcelJS from "exceljs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  process.argv[2] || "ProofLoop_投資回収モデル.xlsx"
);

// ProofLoop のデザイントークン（lib/design/tokens.ts）に合わせる
const INK = "FF002B5C";
const SEAL = "FF8B0000";
const MIST = "FFF2F4F7";
const RULE = "FFC9D2DC";
const INPUT_BG = "FFFFF6D6";
const PICK_BG = "FFE8F0E3";

const FMT_YEN = '"¥"#,##0';
const FMT_PCT = "0.0%";
const FMT_NUM = "#,##0.0";
const FMT_INT = "#,##0";
const FMT_HOUR = '#,##0.0"h"';

const MONTHS = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12", "2027-01"];
const COLS = ["B", "C", "D", "E", "F", "G"];

const wb = new ExcelJS.Workbook();
wb.creator = "ProofLoop";
wb.calcProperties.fullCalcOnLoad = true;

const title = (ws, text) => {
  const c = ws.getCell("A1");
  c.value = text;
  c.font = { bold: true, size: 14, color: { argb: INK } };
  ws.getRow(1).height = 24;
};

const section = (ws, row, text) => {
  ws.getCell(`A${row}`).value = text;
  for (let i = 1; i <= 9; i++) {
    const c = ws.getCell(row, i);
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    if (i === 1) c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  }
};

const input = (cell, value, fmt) => {
  cell.value = value;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INPUT_BG } };
  cell.border = {
    top: { style: "thin", color: { argb: RULE } },
    left: { style: "thin", color: { argb: RULE } },
    bottom: { style: "thin", color: { argb: RULE } },
    right: { style: "thin", color: { argb: RULE } },
  };
  if (fmt) cell.numFmt = fmt;
  return cell;
};

const calc = (cell, formula, fmt) => {
  cell.value = { formula };
  cell.font = { color: { argb: "FF1F2A36" } };
  if (fmt) cell.numFmt = fmt;
  return cell;
};

const note = (ws, row, text, color) => {
  const c = ws.getCell(`A${row}`);
  c.value = text;
  c.font = { size: 9, color: { argb: color || "FF5A6672" }, italic: !color };
};

// ============================================================
// シート1：はじめに
// ============================================================
{
  const ws = wb.addWorksheet("はじめに");
  ws.getColumn("A").width = 115;
  title(ws, "ProofLoop 投資回収モデル（2026-08 〜 2027-01）");

  const lines = [
    "",
    "【目的】学生インターン3名の人件費を、2027年1月末までに回収できるラインを逆算する。",
    "",
    "【使い方】編集するのは「前提」シートの黄色いセルだけ。他はすべて数式で自動計算される。",
    "",
    "════════ 回収すべき金額 ════════",
    "月次コスト ¥160,880（人件費 3名×¥2,000×6h/週×4.33週 ＝ ¥155,880 ＋ 固定費 ¥5,000）",
    "累計コスト ¥965,280（6ヶ月）",
    "回収は2つの定義で判定する。A＝累計売上≧累計コスト。B＝1月単月の売上≧月次コスト（＝以後自走）。",
    "",
    "════════ 団体獲得のモデルを 2026-08-07 に組み替えた ════════",
    "当初は「コールドな新規開拓で500通」としていたが、これは最大の資産を勘定に入れていなかった。",
    "本番DBを実査した結果：",
    "　・承認済み掲載団体 2,421件のうち、アカウントの主がいるのは わずか1件",
    "　・SNS または公式サイトで到達できるのは 2,354件（97.2%）",
    "　　（X 2,125 ／ Instagram 1,914 ／ 公式サイト 1,955 ／ LINE 17）",
    "つまりやるべきことは新規開拓ではなく、既にページがある団体に「主になってもらう」claim 誘導である。",
    "",
    "⚠️ ただし organizations テーブルに メールアドレス列が無い。接触は SNS DM と サイトのフォームになる。",
    "　 → 一斉自動送信ができない（1件あたり2〜3分の手作業）",
    "　 → 特定電子メール法の対象外（メールではないため）。代わりに各SNSのスパム規約を守る必要がある",
    "",
    "════════ 結論 ════════",
    "1. 登録団体 100件超は達成できる。推奨シナリオで 122団体（通知1,400件・claim率8%）。",
    "   コストは 通知56h＋登録支援24h＋ハンズオン37h ＝ 117h。稼働枠281hのうち42%で収まる。",
    "",
    "2. ただし ── 100団体は6ヶ月の投資回収にはほとんど寄与しない。",
    "   登録団体 20 → 122 に増やしても、累計回収率は 108.1% → 110.4%（＋2.3ポイント）にしかならない。",
    "   理由：成立案件数が全シナリオで10.3件のまま動かない。案件の律速は企業側であって団体側ではなく、",
    "   　　　団体を増やしても案件は増えないため。増えるのは団体課金だけ（月¥3,723→¥11,713）。",
    "",
    "3. したがって 100団体の価値は「6ヶ月の外」にある。この期間の投資回収を根拠に正当化してはいけない。",
    "   ・新歓期（3〜4月）の学生流入 ── 団体が多いほど学生が来て、団体が新歓・イベント告知に使う",
    "   ・B2Cの回遊と検索流入の受け皿",
    "   ・企業への提案力（マッチング母集団の厚み）",
    "   ・将来の課金基盤（122団体×有料化20%×¥3,000 ＝ 月¥73,200 のポテンシャル）",
    "   これらは正しい狙いだが、6ヶ月モデルには乗らない。両方を別々に管理すること。",
    "",
    "4. 100団体を成立させる条件は オンボーディングのセルフサーブ化。",
    "   1団体3時間のハンズオンを続けると稼働が115%になって破綻する。1.5時間に落として99.7%、",
    "   通知量を1,400件に絞って92.3%。つまり「登録は自力でできる、支援は要点だけ」の設計が前提条件。",
    "",
    "════════ 2027年1月末のKPI目標（＝このファイルの既定値） ════════",
    "　協賛の平均単価 / 手数料率　 ¥500,000 / 20%（1案件あたり収益 ¥100,000）",
    "　累計 掲載通知 接触数　　　 1,400件（到達可能2,354件の59%）",
    "　累計 登録団体数　　　　　　 122団体　★",
    "　実運用団体数（1月末）　　　 20団体",
    "　累計 企業打診数　　　　　　 430社",
    "　累計 商談数　　　　　　　　 26件",
    "　累計 成立案件数　　　　　　 10件",
    "　累計売上　　　　　　　　　 ¥1,065,259（累計コストを10.4%上回る）",
    "　1月の単月売上　　　　　　　 ¥179,713 ＞ 月次コスト ¥160,880",
    "　アウトリーチ稼働の消化率　　 92.3%",
    "",
    "════════ 急所 ════════",
    "1. 「協賛1案件 ¥500,000」は未検証。¥300,000だと回収率は67.6%まで落ちる（登録団体数とは無関係に落ちる）。",
    "   8〜9月の企業打診で最初に確かめる数字。",
    "2. claim率8%も未検証。ただし回収率への影響は小さい（claim4%でも108.6%）。効くのは登録団体数のほう。",
    "3. 歩留まりはすべて仮定。8月の第1バッチ（通知200件）が claim率の初回実測を出す。9月頭に引き直すこと。",
  ];
  lines.forEach((t, i) => {
    const c = ws.getCell(`A${i + 3}`);
    c.value = t;
    if (t.startsWith("════")) c.font = { bold: true, color: { argb: SEAL } };
    else if (t.startsWith("【")) c.font = { bold: true, color: { argb: INK } };
    else if (/^\d\./.test(t.trim())) c.font = { bold: true, color: { argb: INK } };
    else if (t.startsWith("⚠️")) c.font = { bold: true, color: { argb: SEAL } };
  });
}

// ============================================================
// シート2：前提（入力）
// ============================================================
{
  const ws = wb.addWorksheet("前提");
  ws.getColumn("A").width = 38;
  ["B", "C", "D", "E", "F", "G"].forEach((c) => (ws.getColumn(c).width = 21));
  ws.getColumn("H").width = 40;
  title(ws, "前提（黄色いセルだけを編集してください）");

  section(ws, 3, "■ コスト前提");
  [["インターン人数", 3, "名", null], ["時給", 2000, "円", FMT_YEN],
   ["1人あたり週稼働時間", 6, "時間/週", null], ["週数/月", 4.33, "週", null],
  ].forEach(([label, v, unit, fmt], i) => {
    const r = 4 + i;
    ws.getCell(`A${r}`).value = label;
    input(ws.getCell(`B${r}`), v, fmt);
    ws.getCell(`C${r}`).value = unit;
  });
  ws.getCell("A8").value = "月次人件費";
  calc(ws.getCell("B8"), "B4*B5*B6*B7", FMT_YEN);
  ws.getCell("A9").value = "その他固定費（ツール等）";
  input(ws.getCell("B9"), 5000, FMT_YEN);
  ws.getCell("A10").value = "月次コスト合計";
  calc(ws.getCell("B10"), "B8+B9", FMT_YEN);
  ws.getCell("A11").value = "対象期間（ヶ月）";
  input(ws.getCell("B11"), 6, null);
  ws.getCell("A12").value = "累計コスト＝回収すべき金額";
  calc(ws.getCell("B12"), "B10*B11", FMT_YEN);
  ws.getCell("B12").font = { bold: true, color: { argb: SEAL } };

  section(ws, 14, "■ 収益単価の前提");
  ws.getCell("A15").value = "協賛1案件の平均金額";
  input(ws.getCell("B15"), 500000, FMT_YEN);
  ws.getCell("H15").value = "★最大の急所。未検証の仮置き";
  ws.getCell("H15").font = { color: { argb: SEAL }, size: 9 };
  ws.getCell("A16").value = "ProofLoop 手数料率";
  input(ws.getCell("B16"), 0.2, FMT_PCT);
  ws.getCell("A17").value = "1案件あたり ProofLoop 収益";
  calc(ws.getCell("B17"), "B15*B16", FMT_YEN);
  ws.getCell("A18").value = "団体課金 月額";
  input(ws.getCell("B18"), 3000, FMT_YEN);
  ws.getCell("C18").value = "円/団体/月";
  ws.getCell("A19").value = "有料化率（実運用団体のうち）";
  input(ws.getCell("B19"), 0.2, FMT_PCT);
  ws.getCell("A20").value = "課金開始月（1=8月 … 6=1月）";
  input(ws.getCell("B20"), 4, null);
  ws.getCell("C20").value = "4 ＝ 2026-11";
  ws.getCell("A21").value = "その他収益（アフィリエイト等）";
  input(ws.getCell("B21"), 0, FMT_YEN);
  ws.getCell("C21").value = "円/月";

  section(ws, 23, "■ 団体レーン（掲載通知＝ページの claim 誘導）");
  ws.getCell("A24").value = "到達可能な掲載団体数";
  input(ws.getCell("B24"), 2354, FMT_INT);
  ws.getCell("H24").value = "本番DB実査（2026-08-07）。承認済2,421のうちSNS/サイト到達可";
  ws.getCell("H24").font = { size: 9, color: { argb: "FF5A6672" } };
  ws.getCell("A25").value = "掲載通知 → 登録（claim）率";
  input(ws.getCell("B25"), 0.08, FMT_PCT);
  ws.getCell("H25").value = "未検証。8月の第1バッチで初回実測が出る";
  ws.getCell("H25").font = { size: 9, color: { argb: SEAL } };
  ws.getCell("A26").value = "ネットワーク効果係数（月次）";
  input(ws.getCell("B26"), 0.03, FMT_PCT);
  ws.getCell("H26").value = "登録団体1つが1ヶ月に呼ぶ新規登録数（口コミ・学生経由）";
  ws.getCell("H26").font = { size: 9, color: { argb: "FF5A6672" } };
  ws.getCell("A27").value = "登録 → 実運用率";
  input(ws.getCell("B27"), 0.2, FMT_PCT);
  ws.getCell("H27").value = "実運用＝財務DXに実データを入れている状態";
  ws.getCell("H27").font = { size: 9, color: { argb: "FF5A6672" } };
  ws.getCell("A28").value = "実運用団体の月次継続率";
  input(ws.getCell("B28"), 0.92, FMT_PCT);

  section(ws, 30, "■ 企業レーン");
  [["打診→反応率", 0.1, FMT_PCT], ["反応→商談率", 0.6, FMT_PCT],
   ["商談→成約率", 0.4, FMT_PCT], ["1案件に必要な実運用団体数", 1.0, FMT_NUM],
  ].forEach(([label, v, fmt], i) => {
    const r = 31 + i;
    ws.getCell(`A${r}`).value = label;
    input(ws.getCell(`B${r}`), v, fmt);
  });
  ws.getCell("H34").value = "供給側の制約。団体が足りなければ案件は成立しない";
  ws.getCell("H34").font = { size: 9, color: { argb: "FF5A6672" } };

  section(ws, 36, "■ 回収目標");
  ws.getCell("A37").value = "目標回収率（累計）";
  input(ws.getCell("B37"), 1.0, FMT_PCT);
  ws.getCell("H37").value = "100%＝1月末に投資を全額回収";
  ws.getCell("H37").font = { size: 9, color: { argb: "FF5A6672" } };

  section(ws, 39, "■ 月別の投下量（＝実行計画そのもの）");
  ws.getCell("A40").value = "月";
  MONTHS.forEach((m, i) => {
    const c = ws.getCell(`${COLS[i]}40`);
    c.value = m;
    c.font = { bold: true, color: { argb: INK } };
    c.alignment = { horizontal: "center" };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MIST } };
  });
  ws.getCell("A41").value = "掲載通知 接触数（件）";
  [200, 350, 350, 250, 150, 100].forEach((v, i) =>
    input(ws.getCell(`${COLS[i]}41`), v, FMT_INT));
  ws.getCell("A42").value = "企業打診数（社）";
  [0, 60, 110, 110, 80, 70].forEach((v, i) =>
    input(ws.getCell(`${COLS[i]}42`), v, FMT_INT));
  ws.getCell("H41").value = { formula: '"合計 "&SUM(B41:G41)&"件 / "&SUM(B42:G42)&"社"' };
  ws.getCell("H41").font = { bold: true, color: { argb: INK } };

  section(ws, 44, "■ 1件あたり所要時間（稼働キャパの計算に使う）");
  [["掲載通知1件（SNS DM・サイトフォーム）", 0.04, "＝2.4分。一斉自動送信はできない"],
   ["登録団体1件のセルフサーブ支援", 0.2, "問い合わせ対応のみ"],
   ["実運用化のハンズオン1団体", 1.5, "★3.0hだと稼働が破綻する。セルフサーブ化が前提"],
   ["企業打診1社", 0.15, ""],
   ["商談1件（準備・実施・追客）", 3.0, ""],
  ].forEach(([label, v, memo], i) => {
    const r = 45 + i;
    ws.getCell(`A${r}`).value = label;
    input(ws.getCell(`B${r}`), v, FMT_HOUR);
    ws.getCell(`H${r}`).value = memo;
    ws.getCell(`H${r}`).font = { size: 9, color: { argb: memo.startsWith("★") ? SEAL : "FF5A6672" } };
  });
  ws.getCell("A50").value = "アウトリーチに充てる稼働割合";
  input(ws.getCell("B50"), 0.6, FMT_PCT);
  ws.getCell("H50").value = "残りは開発・SEO・管理";
  ws.getCell("H50").font = { size: 9, color: { argb: "FF5A6672" } };

  section(ws, 52, "■ 参考シナリオ（B列は ★推奨 が既定値として入っている）");
  const scen = [
    ["項目", "① 当初想定", "★② 推奨（既定値）", "③ 通知を1,650件へ", "④ claim率が4%だったら"],
    ["協賛1案件の平均金額", 300000, 500000, 500000, 500000],
    ["掲載通知 合計", 500, 1400, 1650, 1400],
    ["claim率", 0.04, 0.08, 0.08, 0.04],
    ["ハンズオン1団体", 4.0, 1.5, 1.5, 1.5],
    ["→ 累計登録団体（1月末）", 20, 122, 143, 61],
    ["→ 累計成立案件", 10.3, 10.3, 10.3, 10.3],
    ["→ 累計回収率（定義A）", 0.241, 1.104, 1.109, 1.086],
    ["→ 1月単月の達成率（定義B）", 0.033, 1.117, 1.131, 1.081],
    ["→ アウトリーチ稼働の消化率", 0.495, 0.923, 0.997, 0.814],
    ["→ 判定", "届かない", "100団体・回収とも達成", "回収は同じ。稼働が限界", "回収は達成。団体が足りない"],
  ];
  scen.forEach((row, ri) => {
    row.forEach((v, ci) => {
      const c = ws.getCell(53 + ri, 1 + ci);
      c.value = v;
      c.alignment = { horizontal: ci === 0 ? "left" : "center" };
      if (ri === 0) {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
      } else {
        if (ci === 2) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PICK_BG } };
        if (ci > 0) {
          if (ri === 1) c.numFmt = FMT_YEN;
          if (ri === 2) c.numFmt = FMT_INT;
          if (ri === 3 || ri >= 7) c.numFmt = FMT_PCT;
          if (ri === 4) c.numFmt = FMT_HOUR;
          if (ri === 5) c.numFmt = FMT_INT;
          if (ri === 6) c.numFmt = FMT_NUM;
          if (ri >= 5) c.font = { bold: true, color: { argb: ri === 10 ? SEAL : INK } };
        }
      }
    });
  });

  note(ws, 65, "※ 「→」の5行は検証スクリプトで別途計算した実測値（この表自体は数式ではない）。前提を変えたら他シートの数式が正となる。");
  note(ws, 66, "※ 合計だけ変えても反映されない。41〜42行の月別セルを書き換えること。");
  note(ws, 67, "※ ②→③ 通知を1,400→1,650件に増やすと登録は122→143団体に増えるが、回収率は110.4%→110.9%しか動かない。", SEAL);
  note(ws, 68, "　 案件の律速は企業側であって団体側ではないため。団体を増やす価値は6ヶ月の回収の外（新歓期・B2C・将来の課金基盤）にある。", SEAL);
  note(ws, 69, "※ ②→④ claim率が半分の4%でも回収率は108.6%を維持する。回収は claim率にほぼ依存しない。依存するのは協賛単価。", SEAL);
}

// ============================================================
// シート3：1月末KPI目標
// ============================================================
{
  const ws = wb.addWorksheet("1月末KPI目標");
  ws.getColumn("A").width = 34;
  ["B", "C", "D"].forEach((c) => (ws.getColumn(c).width = 17));
  ws.getColumn("E").width = 50;
  title(ws, "2027年1月末に到達すべきKPI");

  ws.getCell("A3").value =
    "B列＝いまの前提で到達する見込み ／ C列＝投資を回収するために必要な水準 ／ D列＝差";
  ws.getCell("A3").font = { size: 9, color: { argb: "FF5A6672" } };
  ws.getCell("A4").value =
    "※ 登録団体数は「回収に必要な水準」が低く出る（案件の律速が企業側のため）。100団体は回収ではなくネットワーク効果を狙う目標である。";
  ws.getCell("A4").font = { size: 9, color: { argb: SEAL } };

  section(ws, 6, "■ KPI一覧");
  ["KPI", "見込み", "必要水準", "差", "必要水準の出し方"].forEach((h, i) => {
    const c = ws.getCell(7, 1 + i);
    c.value = h;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    c.alignment = { horizontal: i === 0 || i === 4 ? "left" : "center" };
  });

  const ND = "逆算とギャップ!$B$21"; // 必要累計案件数
  const kpi = [
    ["累計 掲載通知 接触数（件）", "月次モデル!H13",
      `${ND}*前提!$B$34/前提!$B$27/前提!$B$25`, FMT_INT,
      "必要実運用 ÷ 実運用化率 ÷ claim率（ネットワーク効果は無視＝保守側）"],
    ["累計 登録団体数　★", "月次モデル!G18",
      `${ND}*前提!$B$34/前提!$B$27`, FMT_NUM,
      "必要実運用 ÷ 登録→実運用率"],
    ["実運用団体数（1月末）", "月次モデル!G20",
      `${ND}*前提!$B$34`, FMT_NUM,
      "必要案件数 × 1案件に必要な団体数（供給の下限）"],
    ["累計 企業打診数（社）", "月次モデル!H23",
      `${ND}/(前提!$B$31*前提!$B$32*前提!$B$33)`, FMT_INT,
      "必要案件数 ÷（反応率×商談率×成約率）"],
    ["累計 商談数", "月次モデル!H25", `${ND}/前提!$B$33`, FMT_NUM,
      "必要案件数 ÷ 商談→成約率"],
    ["累計 成立案件数", "月次モデル!G29", ND, FMT_NUM,
      "協賛で稼ぐ必要額 ÷ 1案件あたり収益"],
    ["1月単月の成立案件数", "月次モデル!G28", "逆算とギャップ!$B$14", FMT_NUM,
      "単月黒字に必要な月次案件数"],
    ["累計売上", "月次モデル!G36", "逆算とギャップ!$B$4", FMT_YEN, "＝累計コスト×目標回収率"],
    ["1月単月 売上", "月次モデル!G35", "前提!$B$10", FMT_YEN, "＝1ヶ月ぶんのコスト"],
    ["累計回収率", "逆算とギャップ!$B$7", "前提!$B$37", FMT_PCT, "目標値"],
  ];
  kpi.forEach(([label, got, need, fmt, memo], i) => {
    const r = 8 + i;
    ws.getCell(`A${r}`).value = label;
    if (label.includes("★")) ws.getCell(`A${r}`).font = { bold: true, color: { argb: SEAL } };
    calc(ws.getCell(`B${r}`), got, fmt);
    calc(ws.getCell(`C${r}`), need, fmt);
    calc(ws.getCell(`D${r}`), `B${r}-C${r}`, fmt);
    ws.getCell(`C${r}`).font = { bold: true, color: { argb: SEAL } };
    ws.getCell(`C${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: MIST } };
    ws.getCell(`E${r}`).value = memo;
    ws.getCell(`E${r}`).font = { size: 9, color: { argb: "FF5A6672" } };
  });

  ws.getCell("A18").value = "整合チェック：累計案件数 ÷ 累計登録団体数";
  calc(ws.getCell("B18"), "IF(月次モデル!G18=0,0,月次モデル!G29/月次モデル!G18)", FMT_NUM);
  ws.getCell("E18").value = "1を超えたら「1団体が半年で2件以上の協賛を取る」前提。要見直し";
  ws.getCell("E18").font = { size: 9, color: { argb: SEAL } };

  section(ws, 20, "■ 必要水準を実行できるのか（稼働の突き合わせ）");
  ws.getCell("A21").value = "必要水準を実行するのに要る工数";
  calc(ws.getCell("B21"),
    "C8*前提!$B$45+C9*前提!$B$46+C10*前提!$B$47+C11*前提!$B$48+C12*前提!$B$49", FMT_HOUR);
  ws.getCell("A22").value = "アウトリーチに充てられる時間（6ヶ月）";
  calc(ws.getCell("B22"), "稼働キャパ!$B$6", FMT_HOUR);
  ws.getCell("A23").value = "消化率";
  calc(ws.getCell("B23"), "IF(B22=0,0,B21/B22)", FMT_PCT);
  ws.getCell("A24").value = "判定";
  ws.getCell("B24").value = { formula: 'IF(B23<=1,"実行可能","実行不能")' };
  ws.getCell("B24").font = { bold: true, size: 12, color: { argb: SEAL } };
  ws.getCell("B24").alignment = { horizontal: "center" };
  ws.getCell("C24").value = { formula:
    'IF(B23<=1,"週"&前提!$B$6&"時間×"&前提!$B$4&"名の枠に収まる","枠を "&TEXT(B23-1,"0%")&" 超過。単価を上げるか人員を増やすしかない")' };

  note(ws, 26, "※ C列（必要水準）に届かないなら、選べる道は4つ：①投下量を増やす ②協賛単価を上げる ③手数料率を上げる ④回収の定義をAからBに変える。");
  note(ws, 27, "　 必要水準は「逆算とギャップ」シートの①〜④に出ている。");
  note(ws, 28, "※ 検証済み：協賛単価¥300,000だと必要水準の消化率が147%になり、投下量をどれだけ積んでも物理的に実行できない。", SEAL);
}

// ============================================================
// シート4：月次モデル
// ============================================================
{
  const ws = wb.addWorksheet("月次モデル");
  ws.getColumn("A").width = 34;
  [...COLS, "H"].forEach((c) => (ws.getColumn(c).width = 13));
  title(ws, "月次モデル（すべて「前提」シートから自動計算）");

  ws.getCell("A3").value = "月";
  COLS.forEach((c, i) => {
    const cell = ws.getCell(`${c}3`);
    cell.value = { formula: `前提!${c}40` };
    cell.font = { bold: true, color: { argb: INK } };
    cell.alignment = { horizontal: "center" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MIST } };
  });
  const h3 = ws.getCell("H3");
  h3.value = "合計/最終";
  h3.font = { bold: true, color: { argb: INK } };
  h3.alignment = { horizontal: "center" };
  h3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MIST } };

  ws.getCell("A4").value = "月インデックス";
  COLS.forEach((c, i) => {
    const cell = ws.getCell(`${c}4`);
    cell.value = i + 1;
    cell.alignment = { horizontal: "center" };
    cell.font = { size: 9, color: { argb: "FF8A94A0" } };
  });

  const rows = [];
  const add = (r, label, fn, fmt, total, bold) =>
    rows.push({ r, label, fn, fmt, total, bold });

  section(ws, 6, "■ コスト");
  add(7, "人件費", () => "前提!$B$8", FMT_YEN, "SUM(B7:G7)");
  add(8, "その他固定費", () => "前提!$B$9", FMT_YEN, "SUM(B8:G8)");
  add(9, "月次コスト合計", (c) => `${c}7+${c}8`, FMT_YEN, "SUM(B9:G9)", true);
  add(10, "累計コスト", (c) => `SUM($B$9:${c}9)`, FMT_YEN, "G10");

  section(ws, 12, "■ 団体レーン（掲載通知＝claim誘導）");
  add(13, "掲載通知 接触数（件）",
    (c, i) => i === 0
      ? `MIN(前提!${c}41,前提!$B$24)`
      : `MIN(前提!${c}41,MAX(0,前提!$B$24-${COLS[i - 1]}14))`,
    FMT_INT, "SUM(B13:G13)");
  add(14, "累計 接触数", (c) => `SUM($B$13:${c}13)`, FMT_INT, "G14");
  add(15, "新規登録（通知経由）", (c) => `${c}13*前提!$B$25`, FMT_NUM, "SUM(B15:G15)");
  add(16, "新規登録（ネットワーク経由）",
    (c, i) => (i === 0 ? "0" : `${COLS[i - 1]}18*前提!$B$26`), FMT_NUM, "SUM(B16:G16)");
  add(17, "新規登録 合計", (c) => `${c}15+${c}16`, FMT_NUM, "SUM(B17:G17)");
  add(18, "累計 登録団体　★",
    (c, i) => (i === 0 ? `${c}17` : `${COLS[i - 1]}18+${c}17`), FMT_NUM, "G18", true);
  add(19, "新規 実運用団体", (c) => `${c}17*前提!$B$27`, FMT_NUM, "SUM(B19:G19)");
  add(20, "実運用団体（月末・継続率考慮）",
    (c, i) => (i === 0 ? `${c}19` : `${COLS[i - 1]}20*前提!$B$28+${c}19`), FMT_NUM, "G20", true);

  section(ws, 22, "■ 企業レーン");
  add(23, "企業打診数（社）", (c) => `前提!${c}42`, FMT_INT, "SUM(B23:G23)");
  add(24, "反応", (c) => `${c}23*前提!$B$31`, FMT_NUM, "SUM(B24:G24)");
  add(25, "商談", (c) => `${c}24*前提!$B$32`, FMT_NUM, "SUM(B25:G25)");
  add(26, "成約見込（需要側）", (c) => `${c}25*前提!$B$33`, FMT_NUM, "SUM(B26:G26)");
  add(27, "供給上限（実運用団体の制約）", (c) => `${c}20/前提!$B$34`, FMT_NUM, "—");
  add(28, "成立案件数", (c) => `MIN(${c}26,${c}27)`, FMT_NUM, "SUM(B28:G28)", true);
  add(29, "累計 案件数", (c) => `SUM($B$28:${c}28)`, FMT_NUM, "G29", true);

  section(ws, 31, "■ 収益");
  add(32, "協賛手数料", (c) => `${c}28*前提!$B$17`, FMT_YEN, "SUM(B32:G32)");
  add(33, "団体課金",
    (c) => `IF(${c}$4>=前提!$B$20,${c}20*前提!$B$19*前提!$B$18,0)`, FMT_YEN, "SUM(B33:G33)");
  add(34, "その他収益", () => "前提!$B$21", FMT_YEN, "SUM(B34:G34)");
  add(35, "月次売上合計", (c) => `SUM(${c}32:${c}34)`, FMT_YEN, "SUM(B35:G35)", true);
  add(36, "累計売上", (c) => `SUM($B$35:${c}35)`, FMT_YEN, "G36", true);

  section(ws, 38, "■ 回収");
  add(39, "月次収支", (c) => `${c}35-${c}9`, FMT_YEN, "G40");
  add(40, "累計収支", (c) => `${c}36-${c}10`, FMT_YEN, "G40", true);
  add(41, "累計回収率", (c) => `IF(${c}10=0,0,${c}36/${c}10)`, FMT_PCT, "G41", true);
  add(42, "月次で黒字か", (c) => `IF(${c}39>=0,"黒字","赤字")`, null,
    'IF(G39>=0,"黒字","赤字")');

  rows.forEach(({ r, label, fn, fmt, total, bold }) => {
    ws.getCell(`A${r}`).value = label;
    if (bold) ws.getCell(`A${r}`).font = { bold: true, color: { argb: INK } };
    COLS.forEach((c, i) => {
      const cell = calc(ws.getCell(`${c}${r}`), fn(c, i), fmt);
      if (bold) cell.font = { bold: true, color: { argb: INK } };
    });
    const t = ws.getCell(`H${r}`);
    if (total === "—") {
      t.value = "—";
      t.alignment = { horizontal: "center" };
    } else {
      calc(t, total, fmt);
      t.font = { bold: true, color: { argb: INK } };
    }
    t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MIST } };
  });

  note(ws, 44, "※ 13行目は到達可能な掲載団体数（前提 B24＝2,354）を上限として打ち止まる。");
  note(ws, 45, "※ 27行目「供給上限」は、実運用団体が足りないと案件が成立しないという制約。28行目は需要と供給の少ない方。");
  note(ws, 46, "　 全期間で需要（企業側）が下回る＝案件の律速は企業側。団体を増やしても案件数は増えない。", SEAL);
}

// ============================================================
// シート5：逆算とギャップ
// ============================================================
{
  const ws = wb.addWorksheet("逆算とギャップ");
  ws.getColumn("A").width = 46;
  ws.getColumn("B").width = 18;
  ws.getColumn("C").width = 54;
  title(ws, "逆算とギャップ（回収に必要な水準 vs いまの見込み）");

  section(ws, 3, "■ 定義A：累計回収（1月末までの累計売上 ≧ 累計コスト）");
  [["必要累計売上", "前提!$B$12*前提!$B$37", FMT_YEN, "回収すべき金額"],
   ["見込み累計売上", "月次モデル!G36", FMT_YEN, "いまの前提で到達する売上"],
   ["ギャップ（不足額）", "B4-B5", FMT_YEN, "プラスなら足りていない"],
   ["累計回収率", "IF(B4=0,0,B5/B4)", FMT_PCT, "100%で回収達成"],
  ].forEach(([label, f, fmt, memo], i) => {
    const r = 4 + i;
    ws.getCell(`A${r}`).value = label;
    calc(ws.getCell(`B${r}`), f, fmt);
    ws.getCell(`C${r}`).value = memo;
    ws.getCell(`C${r}`).font = { size: 9, color: { argb: "FF5A6672" } };
  });
  ws.getCell("B7").font = { bold: true, size: 12, color: { argb: SEAL } };

  section(ws, 9, "■ 定義B：月次ランレート黒字（1月単月の売上 ≧ 1ヶ月ぶんのコスト）");
  [["必要月次売上", "前提!$B$10", FMT_YEN, "1ヶ月ぶんのコスト"],
   ["1月の見込み売上", "月次モデル!G35", FMT_YEN, ""],
   ["ギャップ（不足額）", "B10-B11", FMT_YEN, ""],
   ["達成率", "IF(B10=0,0,B11/B10)", FMT_PCT, "100%で単月黒字"],
   ["1月に必要な成立案件数（協賛のみで賄う場合）", "B10/前提!$B$17", FMT_NUM, "月あたり"],
  ].forEach(([label, f, fmt, memo], i) => {
    const r = 10 + i;
    ws.getCell(`A${r}`).value = label;
    calc(ws.getCell(`B${r}`), f, fmt);
    ws.getCell(`C${r}`).value = memo;
    ws.getCell(`C${r}`).font = { size: 9, color: { argb: "FF5A6672" } };
  });
  ws.getCell("B13").font = { bold: true, size: 12, color: { argb: SEAL } };

  section(ws, 16, "■ 定義Aのギャップを「単一のレバー」で埋めるとどうなるか");
  ws.getCell("A17").value = "協賛以外の収益（団体課金＋その他）の累計";
  calc(ws.getCell("B17"), "SUM(月次モデル!B33:G33)+SUM(月次モデル!B34:G34)", FMT_YEN);
  ws.getCell("A18").value = "協賛で稼ぐ必要のある額";
  calc(ws.getCell("B18"), "B4-B17", FMT_YEN);
  ws.getCell("A19").value = "いまの見込み案件数（6ヶ月累計）";
  calc(ws.getCell("B19"), "月次モデル!G29", FMT_NUM);

  [["① 案件数だけで埋める：必要な累計案件数", "B18/前提!$B$17", FMT_NUM, "単価・手数料率を据え置いた場合"],
   ["　　必要倍率", "IF(B19=0,0,B21/B19)", '0.0"倍"', "1.5倍を超えると計画変更が要る"],
   ["② 単価だけで埋める：必要な協賛平均金額", "IF(B19=0,0,B18/(B19*前提!$B$16))", FMT_YEN, "案件数を据え置いた場合"],
   ["　　必要倍率", "IF(前提!$B$15=0,0,B23/前提!$B$15)", '0.0"倍"', ""],
   ["③ 手数料率だけで埋める：必要な手数料率", "IF(B19=0,0,B18/(B19*前提!$B$15))", FMT_PCT, "30%超は交渉上ほぼ通らない"],
   ["④ 団体課金だけで埋める：必要な有料団体数",
    "IF(前提!$B$18=0,0,MAX(0,(B4-SUM(月次モデル!B32:G32))/(前提!$B$18*前提!$B$11)))", FMT_NUM,
    "6ヶ月間ずっとこの数が課金している前提。0なら協賛だけで足りている"],
  ].forEach(([label, f, fmt, memo], i) => {
    const r = 21 + i;
    ws.getCell(`A${r}`).value = label;
    calc(ws.getCell(`B${r}`), f, fmt);
    ws.getCell(`C${r}`).value = memo;
    ws.getCell(`C${r}`).font = { size: 9, color: { argb: "FF5A6672" } };
  });

  section(ws, 28, "■ 判定");
  ws.getCell("A29").value = "定義A（累計回収）";
  calc(ws.getCell("B29"), 'IF(B7>=前提!$B$37,"達成","未達")');
  ws.getCell("C29").value = { formula:
    'IF(B7>=前提!$B$37,"この前提なら1月末に投資を回収できる","不足額 "&TEXT(B6,"¥#,##0")&"。上の①〜④のどれで埋めるかを決める")' };
  ws.getCell("A30").value = "定義B（月次ランレート黒字）";
  calc(ws.getCell("B30"), 'IF(B13>=1,"達成","未達")');
  ws.getCell("C30").value = { formula:
    'IF(B13>=1,"1月時点で自走できる","1月に案件が "&TEXT(B14,"0.0")&" 件必要。いまの見込みは "&TEXT(月次モデル!G28,"0.0")&" 件")' };
  ["B29", "B30"].forEach((a) => {
    ws.getCell(a).font = { bold: true, size: 12, color: { argb: SEAL } };
    ws.getCell(a).alignment = { horizontal: "center" };
  });

  note(ws, 32, "※ 団体を増やしてもこのシートの数字はほぼ動かない。案件の律速が企業側だから。", SEAL);
  note(ws, 33, "　 回収を動かすのは ②協賛単価 と、企業打診の量である。");
}

// ============================================================
// シート6：稼働キャパ
// ============================================================
{
  const ws = wb.addWorksheet("稼働キャパ");
  ws.getColumn("A").width = 42;
  ws.getColumn("B").width = 16;
  ws.getColumn("C").width = 56;
  title(ws, "稼働キャパ（週6時間×3名でその投下量は回るのか）");

  section(ws, 3, "■ 使える時間");
  [["月次の稼働可能時間（3名合計）", "前提!$B$4*前提!$B$6*前提!$B$7", ""],
   ["期間合計（6ヶ月）", "B4*前提!$B$11", ""],
   ["うちアウトリーチに充てられる時間", "B5*前提!$B$50", "残りは開発・SEO・管理"],
  ].forEach(([label, f, memo], i) => {
    const r = 4 + i;
    ws.getCell(`A${r}`).value = label;
    calc(ws.getCell(`B${r}`), f, FMT_HOUR);
    ws.getCell(`C${r}`).value = memo;
    ws.getCell(`C${r}`).font = { size: 9, color: { argb: "FF5A6672" } };
  });

  section(ws, 8, "■ 必要な工数");
  [["掲載通知（SNS DM・サイトフォーム）", "SUM(月次モデル!B13:G13)*前提!$B$45"],
   ["登録団体のセルフサーブ支援", "月次モデル!G18*前提!$B$46"],
   ["実運用化のハンズオン", "SUM(月次モデル!B19:G19)*前提!$B$47"],
   ["企業打診", "SUM(前提!B42:G42)*前提!$B$48"],
   ["商談", "SUM(月次モデル!B25:G25)*前提!$B$49"],
  ].forEach(([label, f], i) => {
    const r = 9 + i;
    ws.getCell(`A${r}`).value = label;
    calc(ws.getCell(`B${r}`), f, FMT_HOUR);
  });
  ws.getCell("A14").value = "必要工数 合計";
  calc(ws.getCell("B14"), "SUM(B9:B13)", FMT_HOUR);
  ws.getCell("B14").font = { bold: true, color: { argb: INK } };
  ws.getCell("A15").value = "余裕（アウトリーチ枠 − 必要工数）";
  calc(ws.getCell("B15"), "B6-B14", FMT_HOUR);
  ws.getCell("A16").value = "アウトリーチ枠の消化率";
  calc(ws.getCell("B16"), "IF(B6=0,0,B14/B6)", FMT_PCT);
  ws.getCell("A17").value = "判定";
  ws.getCell("B17").value = { formula: 'IF(B16<=1,"収まる","超過")' };
  ws.getCell("B17").font = { bold: true, size: 12, color: { argb: SEAL } };
  ws.getCell("B17").alignment = { horizontal: "center" };
  ws.getCell("C17").value = { formula:
    'IF(B16<=1,"あと "&TEXT(B15,"0")&" 時間の余力がある","超過 "&TEXT(-B15,"0")&" 時間。投下量を減らすか、人員・稼働時間を増やす")' };

  note(ws, 19, "※ 100団体を狙うとき、最大の変数は「実運用化のハンズオン1団体あたり時間」（前提 B47）である。", SEAL);
  note(ws, 20, "　 3.0hのままだと消化率115%で破綻する。1.5h（＝セルフサーブ＋要点だけ支援）で92%に収まる。", SEAL);
  note(ws, 21, "※ 掲載通知は一斉自動送信ができない（メール列が無くSNS DM/サイトフォームのため）。1件2.4分は手作業前提の数字。");
}

// ============================================================
// シート7：感度分析
// ============================================================
{
  const ws = wb.addWorksheet("感度分析");
  ws.getColumn("A").width = 22;
  ws.getColumn("B").width = 16;
  title(ws, "感度分析：累計案件数 × 協賛平均金額 → 累計回収率");

  ws.getCell("A3").value = "縦＝協賛1案件の平均金額 ／ 横＝6ヶ月の累計案件数";
  ws.getCell("A3").font = { size: 9, color: { argb: "FF5A6672" } };
  ws.getCell("A4").value = "手数料率と累計コストは「前提」シートの値を使う。緑＝回収達成（100%以上）。";
  ws.getCell("A4").font = { size: 9, color: { argb: "FF5A6672" } };

  const counts = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  const amounts = [100000, 200000, 300000, 400000, 500000, 600000, 800000, 1000000];

  const hdr = ws.getCell("B6");
  hdr.value = "案件数 →";
  hdr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  hdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
  counts.forEach((n, i) => {
    const c = ws.getCell(6, 3 + i);
    c.value = n;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    c.alignment = { horizontal: "center" };
    ws.getColumn(3 + i).width = 10;
  });

  amounts.forEach((amt, ri) => {
    const r = 7 + ri;
    const label = ws.getCell(`B${r}`);
    label.value = amt;
    label.numFmt = FMT_YEN;
    label.font = { bold: true, color: { argb: "FFFFFFFF" } };
    label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    counts.forEach((_, ci) => {
      const c = ws.getCell(r, 3 + ci);
      const col = ws.getColumn(3 + ci).letter;
      c.value = { formula: `$B${r}*${col}$6*前提!$B$16/前提!$B$12` };
      c.numFmt = "0%";
      c.alignment = { horizontal: "center" };
      c.border = {
        top: { style: "hair", color: { argb: RULE } },
        left: { style: "hair", color: { argb: RULE } },
        bottom: { style: "hair", color: { argb: RULE } },
        right: { style: "hair", color: { argb: RULE } },
      };
    });
  });

  const lastCol = ws.getColumn(3 + counts.length - 1).letter;
  ws.addConditionalFormatting({
    ref: `C7:${lastCol}${7 + amounts.length - 1}`,
    rules: [
      { type: "cellIs", operator: "greaterThanOrEqual", formulae: ["1"], priority: 1,
        style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFC8E6C9" } },
                 font: { bold: true, color: { argb: "FF1B5E20" } } } },
      { type: "cellIs", operator: "between", formulae: ["0.6", "1"], priority: 2,
        style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFFF3C4" } } } },
      { type: "cellIs", operator: "lessThan", formulae: ["0.6"], priority: 3,
        style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFF8D7DA" } },
                 font: { color: { argb: SEAL } } } },
    ],
  });

  const r = 7 + amounts.length + 2;
  note(ws, r, "※ 協賛手数料のみで計算している（団体課金・その他収益は含まない）。");
  note(ws, r + 1, "　 緑のマスに入る組み合わせが、1月末に投資を回収できる条件。");
}

await wb.xlsx.writeFile(OUT);
console.log("wrote:", OUT);

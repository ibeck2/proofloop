/**
 * ProofLoop 事業ブリーフィング（新メンバー受け入れ兼）
 *
 * 構成の原則（コンサル型）
 * - 1スライド＝1メッセージ。上部の「ガバニングメッセージ」がそのページの主張。
 * - キッカー → ガバニングメッセージ → 罫線 → ボディ（構造化された図）→ 脚注（出典）
 * - 配色は ProofLoop のデザイントークン（lib/design/tokens.ts）に一致させる。
 * - 数字は出典のあるものだけ実名で引用し、試算は「仮定」と明示する。
 */
import PptxGenJS from "pptxgenjs";

const C = {
  ink: "002B5C",
  seal: "8B0000",
  paper: "FFFFFF",
  mist: "F2F4F7",
  rule: "C9D2DC",
  graphite: "1F2A36",
  muted: "8A97A5",
};
const FONT = "Noto Sans JP";

const W = 13.333;
const H = 7.5;
const M = 0.62;
const BODY_TOP = 1.72;

const pptx = new PptxGenJS();
pptx.defineLayout({ name: "PL16x9", width: W, height: H });
pptx.layout = "PL16x9";
pptx.author = "ProofLoop";
pptx.title = "ProofLoop 事業ブリーフィング";

let pageNo = 0;

/** 共通の枠（キッカー・ガバニングメッセージ・罫線・フッター） */
function frame(kicker, message, opts = {}) {
  const s = pptx.addSlide();
  pageNo += 1;

  s.addText(kicker, {
    x: M, y: 0.42, w: 7, h: 0.28,
    fontFace: FONT, fontSize: 11, bold: true, color: C.seal, charSpacing: 1.2,
  });
  s.addText(message, {
    x: M, y: 0.74, w: W - M * 2, h: 0.78,
    fontFace: FONT, fontSize: opts.msgSize ?? 21, bold: true, color: C.ink,
    valign: "top", lineSpacing: 28,
  });
  s.addShape(pptx.ShapeType.rect, {
    x: M, y: 1.56, w: W - M * 2, h: 0.022, fill: { color: C.ink }, line: { width: 0 },
  });
  s.addText("ProofLoop 事業ブリーフィング｜2026-07-26", {
    x: M, y: H - 0.46, w: 6, h: 0.26,
    fontFace: FONT, fontSize: 9, color: C.rule,
  });
  s.addText(String(pageNo), {
    x: W - M - 0.6, y: H - 0.46, w: 0.6, h: 0.26,
    fontFace: FONT, fontSize: 9, color: C.rule, align: "right",
  });
  return s;
}

function note(s, text) {
  s.addText(text, {
    x: M, y: H - 0.8, w: W - M * 2 - 0.7, h: 0.32,
    fontFace: FONT, fontSize: 8.5, color: C.muted, lineSpacing: 11,
  });
}

function card(s, { x, y, w, h, label, body, accent = false, labelSize = 13, bodySize = 10.5 }) {
  s.addShape(pptx.ShapeType.rect, {
    x, y, w, h,
    fill: { color: accent ? C.ink : C.mist },
    line: { color: accent ? C.ink : C.rule, width: 1 },
  });
  s.addText(label, {
    x: x + 0.22, y: y + 0.16, w: w - 0.44, h: 0.38,
    fontFace: FONT, fontSize: labelSize, bold: true,
    color: accent ? C.paper : C.ink,
  });
  if (body) {
    s.addText(body, {
      x: x + 0.22, y: y + 0.6, w: w - 0.44, h: h - 0.76,
      fontFace: FONT, fontSize: bodySize, color: accent ? "D8E2EE" : C.graphite,
      valign: "top", lineSpacing: bodySize * 1.55,
    });
  }
}

/** 箇条書き（行頭に細い罫を置く簡易ビュレット） */
function bullets(s, { x, y, w, items, size = 11.5, gap = 0.42, color = C.graphite }) {
  items.forEach((t, i) => {
    const yy = y + i * gap;
    s.addShape(pptx.ShapeType.rect, {
      x, y: yy + size / 72 / 2, w: 0.11, h: 0.045,
      fill: { color: C.seal }, line: { width: 0 },
    });
    s.addText(t, {
      x: x + 0.22, y: yy, w: w - 0.22, h: gap,
      fontFace: FONT, fontSize: size, color, valign: "top", lineSpacing: size * 1.45,
    });
  });
}

function arrow(s, x, y, w, { color = C.seal, both = false, back = false } = {}) {
  s.addShape(pptx.ShapeType.line, {
    x, y, w, h: 0,
    line: {
      color, width: 1.75,
      beginArrowType: both || back ? "triangle" : "none",
      endArrowType: back ? "none" : "triangle",
    },
  });
}

// ═══════════════════════════════════════════════════════════
// 1. 表紙
// ═══════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.16, h: H, fill: { color: C.seal }, line: { width: 0 } });
  s.addText("ProofLoop", {
    x: 1.0, y: 2.05, w: 9, h: 0.9,
    fontFace: FONT, fontSize: 40, bold: true, color: C.paper, charSpacing: 0.5,
  });
  s.addText("事業ブリーフィング", {
    x: 1.0, y: 3.0, w: 9, h: 0.6, fontFace: FONT, fontSize: 22, color: "AFC3DA",
  });
  s.addShape(pptx.ShapeType.rect, { x: 1.0, y: 3.85, w: 2.2, h: 0.02, fill: { color: C.seal }, line: { width: 0 } });
  s.addText("何を、なぜ、どう作っているか — そして、これから何が要るか", {
    x: 1.0, y: 4.12, w: 10, h: 0.4, fontFace: FONT, fontSize: 14, color: "AFC3DA",
  });
  s.addText("2026年7月26日", {
    x: 1.0, y: 5.9, w: 6, h: 0.34, fontFace: FONT, fontSize: 12, color: "7E93AE",
  });
}

// ═══════════════════════════════════════════════════════════
// 2. アジェンダ
// ═══════════════════════════════════════════════════════════
{
  const s = frame("AGENDA", "本日は「なぜやるか」から始め、市場性を確かめ、最後に役割のすり合わせまで行く");
  const items = [
    ["01", "何を解こうとしているのか", "学生団体が抱える3つの構造課題", "1分"],
    ["02", "理念と、信用が回る仕組み", "3つの行動指針と、正のスパイラル構造", "2分"],
    ["03", "どう成り立たせるか", "二層構造・三者の循環・キャッシュポイント", "3分"],
    ["04", "勝てる場所か、成り立つか", "競合の整理とポジショニング／市場規模（TAM・SAM・SOM）", "2分"],
    ["05", "いまの現在地", "できているもの／まだ来ていないもの（実数）", "1分"],
    ["06", "これから要る力", "残タスクの構造と、お願いしたい領域", "2分"],
  ];
  const rowH = 0.73;
  items.forEach((it, i) => {
    const y = BODY_TOP + 0.14 + i * rowH;
    s.addText(it[0], {
      x: M, y, w: 0.7, h: rowH - 0.1,
      fontFace: FONT, fontSize: 18, bold: true, color: C.rule, valign: "top",
    });
    s.addText(it[1], {
      x: M + 0.78, y: y + 0.01, w: 5.2, h: 0.34,
      fontFace: FONT, fontSize: 14, bold: true, color: C.ink,
    });
    s.addText(it[2], {
      x: M + 0.78, y: y + 0.35, w: 8.2, h: 0.3,
      fontFace: FONT, fontSize: 10.3, color: C.graphite,
    });
    s.addText(it[3], {
      x: W - M - 0.9, y: y + 0.04, w: 0.9, h: 0.3,
      fontFace: FONT, fontSize: 10.5, color: C.seal, align: "right", bold: true,
    });
    s.addShape(pptx.ShapeType.rect, {
      x: M, y: y + rowH - 0.1, w: W - M * 2, h: 0.008, fill: { color: C.rule }, line: { width: 0 },
    });
  });
  note(s, "所要は目安で合計約11分。時間が押したら 04 の市場・競合と、ページ構成の一覧は口頭で省略できる構成にしている。");
}

// ═══════════════════════════════════════════════════════════
// 3. 課題
// ═══════════════════════════════════════════════════════════
{
  const s = frame(
    "01　何を解こうとしているのか",
    "学生団体には毎年、莫大な熱量が投じられている。だがそれは可視化されず、代替わりのたびにゼロへ戻る"
  );
  const w = (W - M * 2 - 0.5) / 3;
  const defs = [
    ["不可視", "活動の実態が外から見えない。\n\n企業は「どの団体に、どんな力を持つ学生がいるか」を知る手段を持たない。学生自身も、自分が何を身につけたかを説明できない。"],
    ["流動", "代替わりで全てがリセットされる。\n\n運営ノウハウ・会計・人脈・企業とのつながりが、毎年ゼロから作り直されている。組織として積み上がらない。"],
    ["断絶", "情熱が実務能力として評価されない。\n\n数百人規模のイベントを回した経験が、社会からは「サークル活動」としか見えない。橋が架かっていない。"],
  ];
  defs.forEach((d, i) => {
    card(s, { x: M + i * (w + 0.25), y: BODY_TOP + 0.15, w, h: 2.95, label: d[0], body: d[1], labelSize: 17, bodySize: 12 });
  });

  const bandY = BODY_TOP + 3.35;
  s.addShape(pptx.ShapeType.rect, {
    x: M, y: bandY, w: W - M * 2, h: 0.85, fill: { color: C.mist }, line: { color: C.seal, width: 1.25 },
  });
  s.addText("この3つは別々の問題ではなく、「見えない → 蓄積されない → 評価されない」という一本の因果である。", {
    x: M, y: bandY, w: W - M * 2, h: 0.85,
    fontFace: FONT, fontSize: 13.5, bold: true, color: C.seal, align: "center", valign: "middle",
  });
}

// ═══════════════════════════════════════════════════════════
// 4. 理念
// ═══════════════════════════════════════════════════════════
{
  const s = frame("02　理念と、信用が回る仕組み", "3つの課題に、3つの行動指針を正面から対応させている");

  s.addShape(pptx.ShapeType.rect, { x: M, y: BODY_TOP, w: W - M * 2, h: 0.92, fill: { color: C.ink }, line: { width: 0 } });
  s.addText("MISSION", {
    x: M + 0.3, y: BODY_TOP + 0.13, w: 2, h: 0.24,
    fontFace: FONT, fontSize: 9.5, bold: true, color: "7E93AE", charSpacing: 1.5,
  });
  s.addText("学生団体の潜在能力を顕在化し、持続可能な成長インフラを創る。", {
    x: M + 0.3, y: BODY_TOP + 0.38, w: W - M * 2 - 0.6, h: 0.42,
    fontFace: FONT, fontSize: 18, bold: true, color: C.paper,
  });

  const w = (W - M * 2 - 0.5) / 3;
  const cardH = 2.35;
  const pairs = [
    ["不可視を可視に", "見えない熱量を、社会が扱える価値へ変える。", "→ 課題①「不可視」に効く"],
    ["流動を蓄積に", "代替わりのリセットを、積み上がる知力へ。", "→ 課題②「流動」に効く"],
    ["学生からプロへ", "情熱を、ビジネス水準の実務能力へ。", "→ 課題③「断絶」に効く"],
  ];
  pairs.forEach((p, i) => {
    const x = M + i * (w + 0.25);
    const y = BODY_TOP + 1.34;
    s.addShape(pptx.ShapeType.rect, { x, y, w, h: cardH, fill: { color: C.mist }, line: { color: C.rule, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.055, fill: { color: C.seal }, line: { width: 0 } });
    s.addText(p[0], { x: x + 0.24, y: y + 0.36, w: w - 0.48, h: 0.46, fontFace: FONT, fontSize: 17, bold: true, color: C.ink });
    s.addText(p[1], { x: x + 0.24, y: y + 0.95, w: w - 0.48, h: 0.8, fontFace: FONT, fontSize: 12, color: C.graphite, lineSpacing: 17 });
    s.addText(p[2], { x: x + 0.24, y: y + cardH - 0.5, w: w - 0.48, h: 0.3, fontFace: FONT, fontSize: 10, color: C.seal, bold: true });
  });

  s.addText("この理念は飾りではなく機能の設計図。作る機能は必ず「リソース獲得／価値創造／組織基盤／資産継承」のどれかに紐づける。", {
    x: M, y: BODY_TOP + 3.92, w: W - M * 2, h: 0.44,
    fontFace: FONT, fontSize: 11.5, color: C.graphite, align: "center",
  });
}

// ═══════════════════════════════════════════════════════════
// 5. 信用の正のスパイラル ★核心
// ═══════════════════════════════════════════════════════════
{
  const s = frame(
    "02　理念と、信用が回る仕組み",
    "核にあるのは「信用の循環」。一周するごとに信用が厚くなる、正のスパイラルを回す"
  );

  // ①〜④を円周上に配置してループを図示する
  const cx = 6.67;
  const cy = 4.06;
  const rx = 3.5;
  const ry = 1.62;

  // ループの輪（背面。塗りは地色で、上に乗る中央テキストが読めるようにする）
  s.addShape(pptx.ShapeType.ellipse, {
    x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2,
    fill: { color: C.paper }, line: { color: C.ink, width: 2 },
  });

  // 円周上（45°ごと）に時計回りの矢頭を置く
  const heads = [
    [45, 135], [315, 225], [225, 315], [135, 45],
  ];
  heads.forEach(([deg, rot]) => {
    const rad = (deg * Math.PI) / 180;
    const px = cx + rx * Math.cos(rad);
    const py = cy - ry * Math.sin(rad);
    s.addShape(pptx.ShapeType.triangle, {
      x: px - 0.14, y: py - 0.14, w: 0.28, h: 0.28,
      fill: { color: C.seal }, line: { width: 0 }, rotate: rot,
    });
  });

  const bw = 3.15;
  const bh = 1.3;
  const steps = [
    { deg: 90, label: "① 活動する", body: "日々の運営をProofLoop上で回す。タスク・イベント・会計が記録として残る。" },
    { deg: 0, label: "② 記録が貯まる", body: "「何をやり切ったか」が事実として蓄積される。自己申告ではない、検証可能な活動ログ。" },
    { deg: 270, label: "③ 信用になる", body: "記録の厚みがそのまま信用になる。企業が協賛・採用を判断できる材料に。" },
    { deg: 180, label: "④ 資源が返る", body: "協賛金・スカウト・機会が返り、活動がさらに大きくなる。" },
  ];
  steps.forEach((st) => {
    const rad = (st.deg * Math.PI) / 180;
    const px = cx + rx * Math.cos(rad) - bw / 2;
    const py = cy - ry * Math.sin(rad) - bh / 2;
    const accent = st.deg === 270;
    s.addShape(pptx.ShapeType.rect, {
      x: px, y: py, w: bw, h: bh,
      fill: { color: accent ? C.ink : C.mist },
      line: { color: accent ? C.ink : C.ink, width: 1.25 },
    });
    s.addText(st.label, {
      x: px + 0.18, y: py + 0.14, w: bw - 0.36, h: 0.32,
      fontFace: FONT, fontSize: 13.5, bold: true, color: accent ? C.paper : C.ink,
    });
    s.addText(st.body, {
      x: px + 0.18, y: py + 0.5, w: bw - 0.36, h: bh - 0.62,
      fontFace: FONT, fontSize: 9.5, color: accent ? "D8E2EE" : C.graphite, lineSpacing: 13,
    });
  });

  // 円の中心＝ループが生み出すもの
  s.addText(
    [
      { text: "信用（Proof）\n", options: { fontSize: 19, bold: true, color: C.ink } },
      { text: "一周するごとに厚くなる\n", options: { fontSize: 11.5, color: C.graphite } },
      { text: "＝ ProofLoop", options: { fontSize: 12, bold: true, color: C.seal } },
    ],
    {
      x: cx - 1.85, y: cy - 0.72, w: 3.7, h: 1.44,
      fontFace: FONT, align: "center", valign: "middle", lineSpacing: 22,
    }
  );

  s.addText("一周ごとに信用が積み増される。これは代替わりでもリセットされない、団体の資産になる。", {
    x: M, y: cy + ry + 0.82, w: W - M * 2, h: 0.4,
    fontFace: FONT, fontSize: 12.5, bold: true, color: C.seal, align: "center",
  });
}

// ═══════════════════════════════════════════════════════════
// 6. 二層構造
// ═══════════════════════════════════════════════════════════
{
  const s = frame("03　どう成り立たせるか", "事業は二層構造。B2Cメディアで人を集め、B2B側で回収する");

  const boxW = 5.35;
  const y = BODY_TOP + 0.3;
  const boxH = 3.05;

  s.addShape(pptx.ShapeType.rect, { x: M, y, w: boxW, h: boxH, fill: { color: C.mist }, line: { color: C.rule, width: 1 } });
  s.addText("B2C層 ── 集客の入口", {
    x: M + 0.24, y: y + 0.2, w: boxW - 0.48, h: 0.38, fontFace: FONT, fontSize: 14, bold: true, color: C.ink,
  });
  bullets(s, {
    x: M + 0.26, y: y + 0.72, w: boxW - 0.5, size: 11.5, gap: 0.38,
    items: [
      "GPA計算機（検索需要が大きく、競合が弱い）",
      "新入生ガイド（サークル・単位・お金・一人暮らし・留学）",
      "バイト／インターンのガイド",
      "診断コンテンツ（SNS拡散のフック）",
    ],
  });
  s.addShape(pptx.ShapeType.rect, {
    x: M + 0.26, y: y + boxH - 0.72, w: boxW - 0.5, h: 0.008, fill: { color: C.rule }, line: { width: 0 },
  });
  s.addText("役割：検索とSNSで「認知」と「日常利用」を取る。ここ自体は大きく稼がない。", {
    x: M + 0.26, y: y + boxH - 0.58, w: boxW - 0.5, h: 0.44,
    fontFace: FONT, fontSize: 10.5, color: C.ink, bold: true, lineSpacing: 14,
  });

  s.addShape(pptx.ShapeType.rect, { x: M + boxW + 0.9, y, w: boxW, h: boxH, fill: { color: C.ink }, line: { width: 0 } });
  s.addText("B2B層 ── 収益の出口", {
    x: M + boxW + 1.14, y: y + 0.2, w: boxW - 0.48, h: 0.38, fontFace: FONT, fontSize: 14, bold: true, color: C.paper,
  });
  s.addText(
    "学生団体の運営を日常的に支え、そこに貯まる活動データを、企業に対する価値へ変える層。\n\n" +
      "収益はここで生まれる。詳しくは次ページ以降で扱う。",
    {
      x: M + boxW + 1.14, y: y + 0.78, w: boxW - 0.5, h: 1.3,
      fontFace: FONT, fontSize: 12, color: "D8E2EE", lineSpacing: 18,
    }
  );
  s.addShape(pptx.ShapeType.rect, {
    x: M + boxW + 1.14, y: y + boxH - 0.72, w: boxW - 0.5, h: 0.008, fill: { color: "3A5E8C" }, line: { width: 0 },
  });
  s.addText("役割：日常業務を押さえ、検証可能な記録を貯める。", {
    x: M + boxW + 1.14, y: y + boxH - 0.58, w: boxW - 0.5, h: 0.44,
    fontFace: FONT, fontSize: 10.5, color: C.paper, bold: true, lineSpacing: 14,
  });

  arrow(s, M + boxW + 0.12, y + boxH / 2 - 0.08, 0.66);
  s.addText("送り込む", {
    x: M + boxW + 0.02, y: y + boxH / 2 + 0.02, w: 0.88, h: 0.28,
    fontFace: FONT, fontSize: 9, color: C.seal, align: "center", bold: true,
  });

  const bandY = y + boxH + 0.42;
  s.addShape(pptx.ShapeType.rect, { x: M, y: bandY, w: W - M * 2, h: 0.85, fill: { color: C.ink }, line: { width: 0 } });
  s.addText("戦略の順序：まずB2Cで流入を貯める → 学生団体の獲得へ変換する → 団体データが厚くなって初めて企業に売れる。順番は飛ばせない。", {
    x: M + 0.3, y: bandY, w: W - M * 2 - 0.6, h: 0.85,
    fontFace: FONT, fontSize: 12.5, bold: true, color: C.paper, align: "center", valign: "middle",
  });
}

// ═══════════════════════════════════════════════════════════
// 7. 三者の循環
// ═══════════════════════════════════════════════════════════
{
  const s = frame("03　どう成り立たせるか", "三者は互いに引き合う。厚みが出るほど強くなり、課金するのは企業だけ");

  const colW = 3.62;
  const gap = 0.63;
  const y0 = BODY_TOP + 0.12;
  const cols = [
    {
      title: "① 学生（個人）",
      inflow: "検索：GPA計算機・各種ガイド・バイト情報",
      reten: "日常利用：授業レビュー・タイムラインなどの日々更新される生きた情報",
      accent: false,
    },
    {
      title: "② 学生団体",
      inflow: "掲載2,421団体・新歓・メンバー招待",
      reten: "日々の運営がProofLoop上で回り、活動の記録が貯まっていく",
      accent: false,
    },
    {
      title: "③ 企業",
      inflow: "団体データベースの検索・スカウト",
      reten: "協賛の実施報告・継続的なマッチング",
      accent: true,
    },
  ];

  cols.forEach((c, i) => {
    const x = M + i * (colW + gap);
    s.addShape(pptx.ShapeType.rect, {
      x, y: y0, w: colW, h: 0.52, fill: { color: c.accent ? C.seal : C.ink }, line: { width: 0 },
    });
    s.addText(c.title, {
      x: x + 0.2, y: y0 + 0.09, w: colW - 0.4, h: 0.34, fontFace: FONT, fontSize: 14, bold: true, color: C.paper,
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: y0 + 0.62, w: colW, h: 1.14, fill: { color: C.mist }, line: { color: C.rule, width: 1 },
    });
    s.addText("流入", { x: x + 0.2, y: y0 + 0.72, w: 1.2, h: 0.26, fontFace: FONT, fontSize: 10, bold: true, color: C.seal });
    s.addText(c.inflow, {
      x: x + 0.2, y: y0 + 0.99, w: colW - 0.4, h: 0.7, fontFace: FONT, fontSize: 10.5, color: C.graphite, lineSpacing: 14,
    });
    s.addShape(pptx.ShapeType.rect, {
      x, y: y0 + 1.86, w: colW, h: 1.42, fill: { color: C.paper }, line: { color: C.rule, width: 1 },
    });
    s.addText("リテンション", { x: x + 0.2, y: y0 + 1.96, w: 1.6, h: 0.26, fontFace: FONT, fontSize: 10, bold: true, color: C.ink });
    s.addText(c.reten, {
      x: x + 0.2, y: y0 + 2.23, w: colW - 0.4, h: 0.95, fontFace: FONT, fontSize: 10.5, color: C.graphite, lineSpacing: 14,
    });
    // 引き合いは双方向
    if (i < 2) arrow(s, x + colW + 0.07, y0 + 1.7, gap - 0.14, { both: true });
  });

  s.addText("学生が集まるほど団体が集まり、\n団体が増えるほど学生が来る", {
    x: M + colW + gap / 2 - 1.45, y: y0 + 3.36, w: 2.9, h: 0.5,
    fontFace: FONT, fontSize: 9.5, color: C.seal, align: "center", lineSpacing: 12.5,
  });
  s.addText("記録が厚いほど企業が来て、\n企業が来るほど団体が離れなくなる", {
    x: M + colW * 2 + gap * 1.5 - 1.45, y: y0 + 3.36, w: 2.9, h: 0.5,
    fontFace: FONT, fontSize: 9.5, color: C.seal, align: "center", lineSpacing: 12.5,
  });

  s.addShape(pptx.ShapeType.rect, { x: M, y: y0 + 3.96, w: W - M * 2, h: 0.62, fill: { color: C.ink }, line: { width: 0 } });
  s.addText(
    [
      { text: "CASH POINT　", options: { fontSize: 10, bold: true, color: "7E93AE", charSpacing: 1.5 } },
      { text: "課金するのは③企業だけ。①学生・②学生団体は無料で価値を受け取り、その厚みが商品になる。", options: { fontSize: 13, bold: true, color: C.paper } },
    ],
    { x: M + 0.3, y: y0 + 3.96, w: W - M * 2 - 0.6, h: 0.62, fontFace: FONT, valign: "middle" }
  );

  note(s, "掲載団体数は2026-07-26時点の承認済み件数（Supabase実数）。");
}

// ═══════════════════════════════════════════════════════════
// 8. キャッシュポイント
// ═══════════════════════════════════════════════════════════
{
  const s = frame("03　どう成り立たせるか", "本命は協賛マッチング（実務型スカウト）。他は当面の運転資金であり、主戦場ではない");

  s.addShape(pptx.ShapeType.rect, {
    x: M, y: BODY_TOP + 0.1, w: W - M * 2, h: 2.42, fill: { color: C.mist }, line: { color: C.seal, width: 2 },
  });
  s.addShape(pptx.ShapeType.rect, { x: M, y: BODY_TOP + 0.1, w: W - M * 2, h: 0.07, fill: { color: C.seal }, line: { width: 0 } });
  s.addText("本命", {
    x: M + 0.32, y: BODY_TOP + 0.32, w: 1.2, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: C.seal, charSpacing: 1.2,
  });
  s.addText("協賛マッチング／実務型スカウト", {
    x: M + 0.32, y: BODY_TOP + 0.62, w: 7.5, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: C.ink,
  });
  s.addText(
    "企業が「どの学生団体に協賛するか」「どの学生を採るか」を、活動ログという事実ベースで選べるようにする。\n" +
      "従来の就活サービスが持てなかった「実際に何をやり切ったか」のデータを、日常業務の副産物として持てるのが我々の強み。\n" +
      "協賛金の使途が会計モジュールに透明に記録され、企業への実施報告まで一本でつながる設計にしてある。",
    {
      x: M + 0.32, y: BODY_TOP + 1.18, w: W - M * 2 - 0.64, h: 1.2,
      fontFace: FONT, fontSize: 12, color: C.graphite, lineSpacing: 19,
    }
  );

  const w = (W - M * 2 - 0.3) / 2;
  const y = BODY_TOP + 2.72;
  card(s, {
    x: M, y, w, h: 1.5, label: "アフィリエイト（稼働中・小）",
    body: "ガイド記事に開示付きで設置。提携3社が稼働、8件が審査待ち。\n一次情報が主役・広告は脇、を厳守（就活系は利益相反のため恒久除外）。",
    labelSize: 12, bodySize: 10,
  });
  card(s, {
    x: M + w + 0.3, y, w, h: 1.5, label: "団体向けSaaS課金（将来・小〜中）",
    body: "会計モジュールなど、業務に埋まる機能の有料化余地。\nただし団体からの課金は普及の障害にもなるため、慎重に扱う。",
    labelSize: 12, bodySize: 10,
  });

  note(s, "アフィリエイトはバリューコマース経由。提携状況は2026-07-26時点。");
}

// ═══════════════════════════════════════════════════════════
// 9. 競合とポジショニング
// ═══════════════════════════════════════════════════════════
{
  const s = frame("04　勝てる場所か、成り立つか", "既存プレイヤーは「取引の場」。我々は取引の前提になる“記録”を押さえに行く");

  const px = M;
  const pw = 7.5;
  const py = BODY_TOP + 0.5;
  const ph = 3.5;
  const cx = px + pw / 2;
  const cy = py + ph / 2;

  s.addShape(pptx.ShapeType.rect, { x: px, y: py, w: pw, h: ph, fill: { color: C.mist }, line: { color: C.rule, width: 1 } });
  s.addShape(pptx.ShapeType.rect, { x: cx, y: py, w: 0.012, h: ph, fill: { color: C.rule }, line: { width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: px, y: cy, w: pw, h: 0.012, fill: { color: C.rule }, line: { width: 0 } });

  s.addText("↑ 日常業務の基盤（記録が貯まる）", {
    x: px, y: py - 0.32, w: pw, h: 0.28, fontFace: FONT, fontSize: 9.5, color: C.ink, align: "center", bold: true,
  });
  s.addText("↓ 単発のマッチング（取引の場のみ）", {
    x: px, y: py + ph + 0.04, w: pw, h: 0.28, fontFace: FONT, fontSize: 9.5, color: C.ink, align: "center", bold: true,
  });
  s.addText("← 協賛", {
    x: px + 0.12, y: cy - 0.3, w: 1.2, h: 0.26, fontFace: FONT, fontSize: 9.5, color: C.muted, bold: true,
  });
  s.addText("採用 →", {
    x: px + pw - 1.32, y: cy - 0.3, w: 1.2, h: 0.26, fontFace: FONT, fontSize: 9.5, color: C.muted, bold: true, align: "right",
  });

  const chip = (x, y, w, h, label, sub, accent = false) => {
    s.addShape(pptx.ShapeType.rect, {
      x, y, w, h,
      fill: { color: accent ? C.seal : C.paper },
      line: { color: accent ? C.seal : C.ink, width: accent ? 0 : 1 },
    });
    s.addText(label, {
      x: x + 0.1, y: y + 0.1, w: w - 0.2, h: 0.3,
      fontFace: FONT, fontSize: accent ? 13 : 10.5, bold: true, color: accent ? C.paper : C.ink, align: "center",
    });
    if (sub) {
      s.addText(sub, {
        x: x + 0.1, y: y + (accent ? 0.44 : 0.38), w: w - 0.2, h: 0.42,
        fontFace: FONT, fontSize: 8.5, color: accent ? "E8CFCF" : C.muted, align: "center", lineSpacing: 11,
      });
    }
  };

  // 下半分（単発マッチング）に既存プレイヤーを配置。軸線に重ならないよう y を取る
  chip(px + 0.4, py + 1.95, 2.5, 0.85, "ガクセイ協賛", "2014年〜／全国600校／実績1万件以上");
  chip(px + 0.75, py + 2.9, 1.9, 0.58, "カレッジ", "協賛マッチング・無料");
  chip(px + 4.25, py + 2.25, 2.85, 0.85, "就職情報サイト／\nダイレクトリクルーティング", "学生の自己申告プロフィールが情報源");
  chip(cx - 1.35, py + 0.28, 2.7, 0.95, "ProofLoop", "協賛と採用の両方に、\n同じ活動記録が効く", true);

  const rx = px + pw + 0.5;
  const rw = W - M - rx;
  s.addText("このポジションが筋の良い理由", {
    x: rx, y: BODY_TOP + 0.18, w: rw, h: 0.34, fontFace: FONT, fontSize: 13.5, bold: true, color: C.ink,
  });
  bullets(s, {
    x: rx, y: BODY_TOP + 0.66, w: rw, size: 11, gap: 0.92,
    items: [
      "活動データは後から買えない。毎日の業務を押さえた者だけが持てる資産で、これが参入障壁になる。",
      "同じ記録が協賛と採用の両方に効く。一つの資産で二つの市場に当たれる。",
      "会計まで押さえているため、協賛金の使途を透明に報告できる。企業がお金を出す最大の障害を外せる。",
      "既存プレイヤーと正面から食い合わない。彼らの「取引の場」の手前にある基盤を取りに行く。",
    ],
  });

  note(s, "出典：ガクセイ協賛（gakuseikyosan.com／株式会社ガロア）、カレッジ（college.co.jp）の公開情報。位置づけは公開情報にもとづく当社の解釈であり、各社の実態を断定するものではない。");
}

// ═══════════════════════════════════════════════════════════
// 10. TAM / SAM / SOM
// ═══════════════════════════════════════════════════════════
{
  const s = frame("04　勝てる場所か、成り立つか", "採用市場だけで1,500億円超。ここに協賛を足した市場の一部を取れれば事業は成り立つ");

  // 入れ子の円（ベン図）。面積は実際の比率ではない
  const ccx = 3.95;
  const ccy = 4.2;
  const rings = [
    { tag: "TAM", val: "約1,600億円／年", rw: 6.4, rh: 4.5, fill: C.mist, line: C.ink, fg: C.ink },
    { tag: "SAM", val: "約350〜500億円／年", rw: 4.3, rh: 3.0, fill: "D6E1EE", line: "1D4E85", fg: "12365E" },
    { tag: "SOM", val: "約0.5億円／年", rw: 2.25, rh: 1.55, fill: C.seal, line: C.seal, fg: C.paper },
  ];
  rings.forEach((r, i) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: ccx - r.rw / 2, y: ccy - r.rh / 2, w: r.rw, h: r.rh,
      fill: { color: r.fill }, line: { color: r.line, width: 1.5 },
    });
    // ラベルは各リングの上側の帯に置く（最内周だけ中央）
    const ly = i === 2 ? ccy - 0.36 : ccy - r.rh / 2 + 0.14;
    s.addText(r.tag, {
      x: ccx - r.rw / 2, y: ly, w: r.rw, h: 0.28,
      fontFace: FONT, fontSize: 10.5, bold: true, color: r.fg, align: "center", charSpacing: 1.2,
    });
    s.addText(r.val, {
      x: ccx - r.rw / 2, y: ly + 0.26, w: r.rw, h: 0.36,
      fontFace: FONT, fontSize: i === 2 ? 13 : 14.5, bold: true, color: r.fg, align: "center",
    });
  });
  s.addText("※ 円の面積は実際の比率ではない", {
    x: ccx - 2.0, y: ccy + 1.72, w: 4.0, h: 0.26,
    fontFace: FONT, fontSize: 8.5, color: C.muted, align: "center",
  });

  // 右側：各層の中身
  const rx0 = 7.65;
  const rw0 = W - M - rx0;
  const descs = [
    ["TAM", C.ink, "新卒採用支援サービス市場 1,532.6億円（2025年度予測・矢野経済研究所）＋ 学生団体の協賛 約80億円（当社試算）"],
    ["SAM", "1D4E85", "うち「学生個人・団体を指名して当たる」領域（新卒紹介・ダイレクトリクルーティング）＋ オンラインで仲介される協賛"],
    ["SOM", C.seal, "登録団体3,000 × 協賛ポテンシャル30%＝900団体 × 年2件 × 平均20万円 ＝ 流通3.6億円 × テイクレート10% ＝ 3,600万円／年　＋ スカウト成立分"],
  ];
  descs.forEach((d, i) => {
    const y = BODY_TOP + 0.16 + i * 1.12;
    s.addShape(pptx.ShapeType.rect, { x: rx0, y, w: 0.055, h: 0.95, fill: { color: d[1] }, line: { width: 0 } });
    s.addText(d[0], {
      x: rx0 + 0.2, y, w: 0.85, h: 0.95,
      fontFace: FONT, fontSize: 11.5, bold: true, color: d[1], valign: "middle", charSpacing: 1.2,
    });
    s.addText(d[2], {
      x: rx0 + 1.05, y, w: rw0 - 1.05, h: 0.95,
      fontFace: FONT, fontSize: 9.5, color: C.graphite, valign: "middle", lineSpacing: 13.5,
    });
  });

  const by = BODY_TOP + 3.56;
  s.addShape(pptx.ShapeType.rect, { x: rx0, y: by, w: rw0, h: 1.5, fill: { color: C.mist }, line: { color: C.seal, width: 1.25 } });
  s.addText("前提（ここが崩れると数字が変わる。要検証）", {
    x: rx0 + 0.24, y: by + 0.12, w: rw0 - 0.48, h: 0.3, fontFace: FONT, fontSize: 10.5, bold: true, color: C.seal,
  });
  s.addText(
    "・協賛市場に公開統計は無い。大学在学者297万人（令和7年度 学校基本調査）から、団体加入率5割・1団体30人 → 約5万団体、年間協賛10万円/団体として約80億円と置いた。\n" +
      "・協賛ポテンシャル30%、年2件、テイクレート10%はいずれも仮置き。実際の単価と成約率はヒアリングで確かめる。",
    {
      x: rx0 + 0.24, y: by + 0.44, w: rw0 - 0.48, h: 0.98,
      fontFace: FONT, fontSize: 9, color: C.graphite, lineSpacing: 13,
    }
  );

  note(s, "出典：矢野経済研究所「新卒採用支援サービス市場に関する調査（2025年）」／文部科学省 令和7年度 学校基本調査。太字でない数値は当社の仮定にもとづく試算。");
}

// ═══════════════════════════════════════════════════════════
// 11. ページ構成マップ
// ═══════════════════════════════════════════════════════════
{
  const s = frame("05　いまの現在地", "プロダクトは一通り動いている。各ページに「三者 × 流入／リテンション」の役割を割り振ってある");

  const rows = [
    { head: "B2C ／ 学生の流入", color: C.seal, items: "/gpa（GPA計算機・主要SEO施策）　/guide（新入生ガイドハブ）　/guide/credits・money・living-alone・circle・study-abroad　/baito（バイト・インターン）　/baito/simulator・study-abroad/recommend（診断＝拡散フック）" },
    { head: "共通 ／ 学生のリテンション", color: C.ink, items: "/search（団体を探す）　/organizations/[id]（団体ページ・2,421件）　/timeline　/schedule　/classinfo（授業レビュー）　/mypage" },
    { head: "B2B ／ 学生団体のリテンション", color: C.ink, items: "/clubdashboard　/clubtasks　/clubevents　/clubats（採用）　/clubfinance（会計・財務＝今月リリース）　/clubposts　/clubmessages　/clubphotos　/clubprofile　/clubsettings" },
    { head: "B2B ／ 企業（キャッシュポイント）", color: C.seal, items: "/companydashboard　/companysearch（団体検索）　/companymessage　※ここはまだ育てていない" },
    { head: "獲得・運営", color: C.rule, items: "/for-clubs（団体向けLP）　/manual（運営マニュアル）　/signup・/login・/invite/[token]　/admin（運営管理）" },
  ];

  const rowH = 1.0;
  rows.forEach((r, i) => {
    const y = BODY_TOP + 0.06 + i * rowH;
    const h = rowH - 0.14;
    s.addShape(pptx.ShapeType.rect, { x: M, y, w: 0.055, h, fill: { color: r.color }, line: { width: 0 } });
    s.addText(r.head, { x: M + 0.2, y, w: 3.0, h, fontFace: FONT, fontSize: 12, bold: true, color: C.ink, valign: "middle" });
    s.addText(r.items, {
      x: M + 3.25, y, w: W - M * 2 - 3.3, h, fontFace: FONT, fontSize: 9.8, color: C.graphite, valign: "middle", lineSpacing: 14,
    });
    if (i < rows.length - 1) {
      s.addShape(pptx.ShapeType.rect, {
        x: M + 0.2, y: y + h + 0.07, w: W - M * 2 - 0.2, h: 0.006, fill: { color: "E4E9EF" }, line: { width: 0 },
      });
    }
  });

  note(s, "ナビゲーションには新規コンテンツページを足さない方針。導線は /guide ハブとフッターで設計している。");
}

// ═══════════════════════════════════════════════════════════
// 12. 現在地（実数）
// ═══════════════════════════════════════════════════════════
{
  const s = frame("05　いまの現在地", "作るものは大方出来ているが、まだ人が来ていない");

  const tiles = [
    ["2,421", "掲載団体（承認済み）", "全国12大学＋早稲田463件"],
    ["27", "DBマイグレーション", "テスト201件すべてgreen"],
    ["6", "検索クリック（3ヶ月）", "表示63・平均順位14.3位"],
    ["2", "Googleインデックス登録", "2,438URLを7/25に初送信"],
  ];
  const tw = (W - M * 2 - 0.72) / 4;
  tiles.forEach((t, i) => {
    const x = M + i * (tw + 0.24);
    const y = BODY_TOP + 0.15;
    const warn = i >= 2;
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: tw, h: 2.0,
      fill: { color: warn ? C.mist : C.ink }, line: { color: warn ? C.seal : C.ink, width: warn ? 1.5 : 0 },
    });
    s.addText(t[0], { x: x + 0.22, y: y + 0.26, w: tw - 0.44, h: 0.78, fontFace: FONT, fontSize: 40, bold: true, color: warn ? C.seal : C.paper });
    s.addText(t[1], { x: x + 0.22, y: y + 1.12, w: tw - 0.44, h: 0.32, fontFace: FONT, fontSize: 11.5, bold: true, color: warn ? C.ink : C.paper });
    s.addText(t[2], { x: x + 0.22, y: y + 1.46, w: tw - 0.44, h: 0.44, fontFace: FONT, fontSize: 9.5, color: warn ? C.graphite : "AFC3DA", lineSpacing: 13 });
  });

  s.addShape(pptx.ShapeType.rect, { x: M, y: BODY_TOP + 2.42, w: W - M * 2, h: 2.05, fill: { color: C.paper }, line: { color: C.rule, width: 1 } });
  s.addShape(pptx.ShapeType.rect, { x: M, y: BODY_TOP + 2.42, w: 0.055, h: 2.05, fill: { color: C.seal }, line: { width: 0 } });
  s.addText("この数字をどう読むか", {
    x: M + 0.36, y: BODY_TOP + 2.62, w: 4, h: 0.34, fontFace: FONT, fontSize: 13.5, bold: true, color: C.ink,
  });
  s.addText(
    "検索クリック6件は「成績が悪い」のではなく「まだ試合が始まっていない」。原因は判明していて、サイトマップがGoogleに一度も送信されておらず、\n" +
      "2,400ページ以上あるのに2ページしか登録されていなかった。7月25日に初送信済みで、いまは登録が増えるのを待っている段階。\n\n" +
      "つまり、いま最も価値があるのは「人を連れてくる仕事」であって、機能を足す仕事ではない。",
    {
      x: M + 0.36, y: BODY_TOP + 3.04, w: W - M * 2 - 0.72, h: 1.3,
      fontFace: FONT, fontSize: 11.5, color: C.graphite, lineSpacing: 18,
    }
  );

  note(s, "出典：Google Search Console（2026-04-23〜07-22）／Supabase本番／GA4。収益は現時点でほぼゼロ。");
}

// ═══════════════════════════════════════════════════════════
// 13. 残タスクの構造
// ═══════════════════════════════════════════════════════════
{
  const s = frame("06　これから要る力", "詰まっているのは入口側。学生と学生団体、どちらの流入も最優先で開けにいく");

  const rows = [
    ["学生の流入", "最優先", "検索の受け皿を厚くするのと並行して、SNS・メーリング・直接の声かけで人を連れてくる。診断コンテンツを拡散のフックにする。", C.seal],
    ["学生団体の流入", "同じく最優先", "掲載はしているが「登録」に至っていない。掲載通知メールを営業兼許可取りにする導線をつくる（権利面の方式が未決）。", C.seal],
    ["学生・団体のリテンション", "前進中", "会計・財務モジュールを今月リリース。事務作業のたびに開くサービスへ。", "1E7A46"],
    ["企業の流入", "本格化は後・検証は今から", "売り込むのはデータが厚くなってから。ただし「いくらなら出すか」のヒアリングは今すぐ始められる。", C.ink],
  ];

  const rowH = 1.08;
  rows.forEach((r, i) => {
    const y = BODY_TOP + 0.1 + i * rowH;
    const h = rowH - 0.16;
    const hot = i <= 1;
    s.addShape(pptx.ShapeType.rect, {
      x: M, y, w: W - M * 2, h,
      fill: { color: hot ? "FBF2F2" : C.paper },
      line: { color: hot ? C.seal : C.rule, width: hot ? 1.5 : 1 },
    });
    s.addText(r[0], { x: M + 0.3, y, w: 2.9, h, fontFace: FONT, fontSize: 13, bold: true, color: C.ink, valign: "middle" });
    s.addShape(pptx.ShapeType.rect, { x: M + 3.3, y: y + h / 2 - 0.075, w: 0.15, h: 0.15, fill: { color: r[3] }, line: { width: 0 } });
    s.addText(r[1], { x: M + 3.58, y, w: 2.3, h, fontFace: FONT, fontSize: 11, bold: true, color: r[3], valign: "middle" });
    s.addText(r[2], { x: M + 6.0, y, w: W - M * 2 - 6.3, h, fontFace: FONT, fontSize: 10.5, color: C.graphite, valign: "middle", lineSpacing: 15 });
  });

  s.addShape(pptx.ShapeType.rect, { x: M, y: BODY_TOP + 4.46, w: W - M * 2, h: 0.66, fill: { color: C.mist }, line: { color: C.rule, width: 1 } });
  s.addText(
    [
      { text: "横断の詰まり　", options: { bold: true, color: C.ink } },
      { text: "①順位計測ツールが未登録で施策の効果を数字で追えない　②メール送信ドメインが未認証で通知メールが迷惑メール判定されやすい", options: { color: C.graphite } },
    ],
    { x: M + 0.3, y: BODY_TOP + 4.46, w: W - M * 2 - 0.6, h: 0.66, fontFace: FONT, fontSize: 10.5, valign: "middle" }
  );
}

// ═══════════════════════════════════════════════════════════
// 14. お願いしたい領域
// ═══════════════════════════════════════════════════════════
{
  const s = frame("06　これから要る力", "任せられる持ち場は4つ。2C／2B × Sales／Product で整理した");

  const labW = 0.62;   // 左の縦軸ラベル列
  const headH = 0.36;  // 上の横軸ラベル行
  const gx = 0.28;
  const gy = 0.2;
  const gridX = M + labW;
  const gridW = W - M * 2 - labW;
  const cw = (gridW - gx) / 2;
  const gridY = BODY_TOP + 0.06 + headH;
  const ch = 1.85;

  // 横軸ラベル
  [["2C　学生・学生団体に向き合う", 0], ["2B　企業に向き合う", 1]].forEach(([t, i]) => {
    s.addText(t, {
      x: gridX + i * (cw + gx), y: BODY_TOP + 0.04, w: cw, h: headH,
      fontFace: FONT, fontSize: 11, bold: true, color: C.ink, align: "center", valign: "middle",
    });
  });
  // 縦軸ラベル
  [["Sales　人を動かす", 0], ["Product　モノをつくる", 1]].forEach(([t, i]) => {
    s.addText(t, {
      x: M - 0.62, y: gridY + i * (ch + gy), w: ch, h: labW,
      fontFace: FONT, fontSize: 10, bold: true, color: C.ink, align: "center", valign: "middle", rotate: 270,
    });
  });

  const cells = [
    {
      col: 0, row: 0, tag: "案A", title: "学生・学生団体の流入をつくる",
      items: ["SNS運営（診断コンテンツを拡散のフックに）／メーリング・学内コミュニティへの案内", "大学・サークルへの直接の声かけ、掲載団体への連絡"],
      metric: "成果：登録者数・登録団体数", hot: true,
    },
    {
      col: 1, row: 0, tag: "案B", title: "企業側の初期開拓",
      items: ["協賛を出していそうな企業のリストアップとヒアリング", "「何に・いくら・どんな条件で出すか」を協賛メニューの設計へ返す"],
      metric: "成果：ヒアリング件数・想定単価の確度", hot: false,
    },
    {
      col: 0, row: 1, tag: "案C", title: "過去問・授業評判のDBとAIコンテンツ",
      items: ["授業レビュー・過去問を集めて整理する（日常ログインの導線になる）", "AIを使った記事・SNS投稿の生成と、反応を見ての改善"],
      metric: "成果：掲載データ件数・検索流入", hot: false,
    },
    {
      col: 1, row: 1, tag: "案D", title: "団体向けの提供物を整える",
      items: ["導入マニュアル・活用テンプレの整備（会計モジュールなど）", "協賛の実施報告フォーマットづくり。企業に出せる形にする"],
      metric: "成果：導入団体の定着率・報告書の完成度", hot: false,
    },
  ];

  cells.forEach((c) => {
    const x = gridX + c.col * (cw + gx);
    const y = gridY + c.row * (ch + gy);
    s.addShape(pptx.ShapeType.rect, {
      x, y, w: cw, h: ch,
      fill: { color: c.hot ? "FBF2F2" : C.mist },
      line: { color: c.hot ? C.seal : C.rule, width: c.hot ? 1.75 : 1 },
    });
    s.addText(c.tag, {
      x: x + 0.24, y: y + 0.16, w: 0.8, h: 0.28,
      fontFace: FONT, fontSize: 10.5, bold: true, color: C.seal, charSpacing: 1.2,
    });
    s.addText(c.title, {
      x: x + 0.94, y: y + 0.13, w: cw - 1.18, h: 0.34,
      fontFace: FONT, fontSize: 14.5, bold: true, color: C.ink,
    });
    bullets(s, { x: x + 0.24, y: y + 0.58, w: cw - 0.48, items: c.items, size: 9.8, gap: 0.48 });
    s.addText(c.metric, {
      x: x + 0.24, y: y + ch - 0.42, w: cw - 0.48, h: 0.3,
      fontFace: FONT, fontSize: 9.5, bold: true, color: C.seal,
    });
  });

  const by = gridY + ch * 2 + gy + 0.22;
  s.addShape(pptx.ShapeType.rect, { x: M, y: by, w: W - M * 2, h: 0.55, fill: { color: C.ink }, line: { width: 0 } });
  s.addText("いま一番空いている穴は案A。ただしAIを触りたい・つくる側に回りたいなら案Cもある。今日どれか1つに決める。", {
    x: M + 0.3, y: by, w: W - M * 2 - 0.6, h: 0.55,
    fontFace: FONT, fontSize: 11.5, bold: true, color: C.paper, align: "center", valign: "middle",
  });
}

// ═══════════════════════════════════════════════════════════
// 15. 本日決めたいこと
// ═══════════════════════════════════════════════════════════
{
  const s = frame("CLOSING", "今日ここで決めたいのは3点");
  const items = [
    ["担当領域の合意", "案A〜Dのどれか。まずは1つに絞って、成果が見える単位で始める。"],
    ["最初の2週間の具体アクション", "抽象的な役割ではなく、「何を、いつまでに、どういう形で出すか」を1つ決める。"],
    ["進め方とコミュニケーション", "定例の頻度、相談の経路、成果の確認方法。詰まったときにすぐ聞ける状態を作る。"],
  ];
  items.forEach((it, i) => {
    const y = BODY_TOP + 0.35 + i * 1.32;
    s.addShape(pptx.ShapeType.rect, { x: M, y, w: 0.62, h: 1.08, fill: { color: C.ink }, line: { width: 0 } });
    s.addText(String(i + 1), { x: M, y: y + 0.24, w: 0.62, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: C.paper, align: "center" });
    s.addShape(pptx.ShapeType.rect, { x: M + 0.62, y, w: W - M * 2 - 0.62, h: 1.08, fill: { color: C.mist }, line: { color: C.rule, width: 1 } });
    s.addText(it[0], { x: M + 0.92, y: y + 0.17, w: 8, h: 0.36, fontFace: FONT, fontSize: 14.5, bold: true, color: C.ink });
    s.addText(it[1], { x: M + 0.92, y: y + 0.56, w: W - M * 2 - 1.3, h: 0.42, fontFace: FONT, fontSize: 11, color: C.graphite });
  });
  s.addText("ようこそ。まだ人が来ていない段階から関われるのは、いちばん面白いところです。", {
    x: M, y: BODY_TOP + 4.42, w: W - M * 2, h: 0.4,
    fontFace: FONT, fontSize: 13, bold: true, color: C.seal, align: "center",
  });
}

const out = process.argv[2] ?? "ProofLoop_事業ブリーフィング.pptx";
await pptx.writeFile({ fileName: out });
console.log("生成しました:", out, "／ スライド数:", pageNo + 1);

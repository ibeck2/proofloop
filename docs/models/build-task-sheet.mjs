/**
 * ProofLoop タスクシート（ガントチャート）を生成する。
 *
 *   node docs/models/build-task-sheet.mjs [出力ファイル名]
 *
 * 2026-08 〜 2027-01 を半月刻み12コマで表す。バーは条件付き書式で描いているので、
 * 「開始」「終了」列（G/H）の数字を書き換えるとバーがその場で動く。
 *
 * 数値目標の根拠は docs/models/ProofLoop_投資回収モデル_v2_2026-08-07.xlsx、
 * 計画の文章は docs/roadmap-2026-08-to-2027-01.md。
 * 団体の優先順位は build-org-outreach-list.mjs が出す org-outreach-summary.json を読む。
 */
import ExcelJS from "exceljs";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, process.argv[2] || "ProofLoop_タスクシート.xlsx");

const INK = "FF002B5C";
const SEAL = "FF8B0000";
const MIST = "FFF2F4F7";
const RULE = "FFC9D2DC";
const GREY = "FF5A6672";

// グループ。key はガント列の条件付き書式で照合するので、B列の値と完全一致させる
const GROUPS = [
  { key: "① 土台・ブロッカー", bar: "FF8B0000", tint: "FFF6E4E4" },
  { key: "② 団体レーン", bar: "FF2E6B8F", tint: "FFE3EEF4" },
  { key: "③ 企業レーン", bar: "FF002B5C", tint: "FFE0E6EE" },
  { key: "④ プロダクト", bar: "FF6B6480", tint: "FFEBE9EF" },
  { key: "⑤ SEO・コンテンツ", bar: "FF4A7C59", tint: "FFE6EFE8" },
  { key: "⑥ 運営・計測・法務", bar: "FF7A7A7A", tint: "FFECECEC" },
];
const G = Object.fromEntries(GROUPS.map((g, i) => [i + 1, g.key]));

// 半月刻み12コマ
const BUCKETS = [
  ["2026-08", "前半"], ["2026-08", "後半"], ["2026-09", "前半"], ["2026-09", "後半"],
  ["2026-10", "前半"], ["2026-10", "後半"], ["2026-11", "前半"], ["2026-11", "後半"],
  ["2026-12", "前半"], ["2026-12", "後半"], ["2027-01", "前半"], ["2027-01", "後半"],
];
const GANTT_START_COL = 10; // J列
const TODAY_BUCKET = 1;     // 2026-08-07 は 8月前半

// [ID, グループ番号, タスク, 担当, 依存, 完了条件, 開始, 終了, 状態]
const TASKS = [
  ["A1", 1, "contact@proofloop.jp の受信復旧", "オーナー＋Claude", "—", "送受信テスト成功。法務4文書の窓口が生きる", 1, 1, "未着手"],
  ["A2", 1, "窓口アドレスの暫定差し替え判断", "オーナー", "A1", "受信可能なアドレスへ一時変更 or 転送設定", 1, 1, "未着手"],
  ["A3", 1, "Resend 独自ドメイン認証（SPFを1本に統合）", "オーナー同席＋Claude", "A1", "Resend で verified", 1, 2, "未着手"],
  ["A4", 1, "メール送信元を RESEND_FROM に環境変数化", "Claude", "A3", "4ファイル差し替え・本番で実送信テスト", 2, 2, "未着手"],
  ["A5", 1, "法務4文書の文面確認（すでに本番公開中）", "オーナー", "—", "承認 or 修正指示", 1, 2, "未着手"],

  ["B1", 2, "claim動線の設計＋Plan Mode承認（スキーマ変更含む）", "Claude起案→オーナー承認", "—", "承認済み設計書", 1, 1, "✅ 完了"],
  ["B2", 2, "claim動線の実装・テスト・本番反映", "Claude", "B1", "掲載ページから団体が自分で引き取れる（028〜034 適用済み）", 1, 1, "✅ 完了"],
  ["B3", 2, "claimトークンの一括発行（2,222件）", "Claude", "B2,B18,B19,B20", "団体別のclaim URL一覧。※発行前に B18〜B21 を終える", 3, 3, "進行中"],
  ["B4", 2, "声かけ優先順位ルールの確定", "オーナー＋Claude", "—", "スコア定義（到達30/大学25/需要25/規模20）の承認", 1, 1, "✅ 草案あり"],
  ["B5", 2, "優先順位付きリストの生成・バッチ分割", "Claude", "B4", "団体_声かけ優先順位.csv（2,222件・バッチ1〜6）", 1, 1, "✅ 完了"],
  ["B6", 2, "掲載通知の文面（SNS DM用・claimリンク・オプトアウト明記）", "Claude起案→オーナー", "B3", "承認済み文面", 2, 3, "未着手"],
  ["B7", 2, "SNS運用アカウントの準備（X / Instagram）", "オーナー", "—", "DM送信元アカウントと運用担当の確定", 2, 2, "未着手"],
  ["B8", 2, "セルフサーブ・オンボーディング導線の整備", "Claude", "B2", "ハンズオン1.5h/団体で回る状態", 3, 4, "未着手"],
  ["B9", 2, "掲載通知 第1バッチ 200件（学習目的・13大学へ比例配分）", "人脈担当", "B3,B5,B6,B7", "送信完了・claim率の初回実測値", 2, 3, "未着手"],
  ["B10", 2, "claim率を大学別・カテゴリ別に分析 → 以降の配分を見直す", "Claude", "B9", "勝ち筋セグメントの特定", 4, 4, "未着手"],
  ["B11", 2, "掲載通知 第2バッチ 350件", "人脈担当", "B10", "累計登録 45団体", 3, 4, "未着手"],
  ["B12", 2, "掲載通知 第3バッチ 350件", "人脈担当", "B11", "累計登録 74団体", 5, 6, "未着手"],
  ["B13", 2, "掲載通知 第4バッチ 250件", "人脈担当", "B12", "累計登録 96団体", 7, 8, "未着手"],
  ["B14", 2, "掲載通知 第5バッチ 150件", "人脈担当", "B13", "累計登録 111団体", 9, 10, "未着手"],
  ["B15", 2, "掲載通知 第6バッチ 100件", "人脈担当", "B14", "累計登録 122団体 ★目標達成", 11, 12, "未着手"],
  ["B16", 2, "実運用団体 第1号の立ち上げ（財務DXに実データ）", "全員", "B8", "実運用 3団体", 3, 4, "未着手"],
  ["B17", 2, "新歓期（3〜4月）に向けた要望収集と仕込み", "全員", "B16", "要望リストと次期計画", 9, 12, "未着手"],
  // B18〜B21：claim動線は動いているが、トークンを1件でも発行する前に塞ぐべき穴。
  // 最終レビュー（2026-08-09）で洗い出したもの。B3 の依存に入れてある。
  ["B18", 2, "【公開前ゲート】claimトークンがGA4に送信されるのを止める", "Claude", "B2", "/claim・/invite のURLを丸めてから送信。コード・GA4管理画面設定・本番デプロイ・実プロパティ再検証まで完了（2026-08-12）", 1, 2, "✅ 完了"],
  ["B19", 2, "【公開前ゲート】運営が単独で剥奪できるUI（revoke_claim）", "Claude", "B2", "/admin/claims に「発行の取消」。却下時の復元も同時に直す", 1, 2, "未着手"],
  ["B20", 2, "【公開前ゲート】新規登録のあと claim へ戻す導線", "Claude", "B2", "/signup から元のclaim URLへ復帰できる（設計§6.1）", 2, 2, "未着手"],
  ["B21", 2, "【公開前ゲート】先行申請で締め出された団体の救済", "Claude", "B2", "再発行の手順書 or /admin/claims に再発行ボタン", 2, 3, "未着手"],

  ["C1", 3, "★協賛単価 ¥500,000 の実勢を検証する", "オーナー", "—", "単価の確度が判明・モデル更新", 1, 4, "未着手"],
  ["C2", 3, "狙う業界・企業像の仮説を立てる", "オーナー＋営業担当", "—", "ターゲット定義（業界×規模×協賛動機）", 1, 2, "未着手"],
  ["C3", 3, "企業候補の抽出 60社", "営業担当", "C2", "候補リスト60社", 2, 2, "未着手"],
  ["C4", 3, "連絡先の収集と優先順位付け", "営業担当", "C3", "打診可能リスト（窓口部署・宛先つき）", 2, 3, "未着手"],
  ["C5", 3, "★企業向け提案書 v1（実績なしで打てるもの）", "オーナー＋営業担当", "C2", "承認済み提案書", 2, 2, "未着手"],
  ["C6", 3, "特定電子メール法の確認（対象は企業打診側）", "オーナー", "—", "表示要件の確定と文面への反映", 2, 3, "未着手"],
  ["C7", 3, "企業打診 第1バッチ 60社", "営業担当", "C4,C5,C6", "反応率の初回実測値", 3, 4, "未着手"],
  ["C8", 3, "ロングリスト拡充（累計200社）", "営業担当", "C7", "200社", 4, 5, "未着手"],
  ["C9", 3, "企業打診 110社（10月）", "営業担当", "C8", "成立 2.6件", 5, 6, "未着手"],
  ["C10", 3, "ロングリスト拡充（累計430社）", "営業担当", "C9", "430社", 6, 7, "未着手"],
  ["C11", 3, "企業打診 110社（11月）", "営業担当", "C10", "累計黒字転換（回収率106%）", 7, 8, "未着手"],
  ["C12", 3, "企業打診 80社（12月）", "営業担当", "C11", "成立 1.9件", 9, 10, "未着手"],
  ["C13", 3, "企業打診 70社（1月・絶対に止めない）", "営業担当", "C12", "1月単月黒字（¥179,713＞¥160,880）", 11, 12, "未着手"],
  ["C14", 3, "商談の実施と追客（通期）", "営業担当", "C7", "累計 26件", 3, 12, "未着手"],
  ["C15", 3, "初の具体案件のクロージング", "全員", "C9", "金額・期間・成果物の確定", 9, 10, "未着手"],
  ["C16", 3, "成約と型化・再現手順のドキュメント化", "全員", "C15", "再現可能な手順書", 11, 12, "未着手"],

  ["D1", 4, "団体ページ description の事実データ生成", "Claude", "—", "2,400ページに反映・団体ページCTR改善", 1, 2, "未着手"],
  ["D2", 4, "/guide/credits の受け皿改善", "Claude", "—", "H2とFAQを追加・/gpa へ内部リンク", 2, 3, "未着手"],
  // 当初はSupabaseのセッションをmiddlewareで見る想定だったが、セッションが
  // localStorage にありmiddlewareはCookieしか読めないため実現不能だった。
  // @supabase/ssr への移行は全ページの認証経路に波及するので、Basic認証を外側に重ねた。
  ["D3", 4, "middleware.ts でサーバーサイド認証ゲート（リスクS1・Basic認証）", "Claude", "—", "/admin をサーバー側で保護。401を本番で確認", 1, 1, "✅ 完了"],
  ["D4", 4, "/companysearch・/companymessage の実地検証と改修", "Claude", "C7", "商談運用で詰まる箇所の解消", 5, 8, "未着手"],
  ["D5", 4, "構造化データ（Organization schema）※D1の効果次第", "Claude", "D1", "「クロール済み-未登録」115pの削減", 5, 6, "未着手"],
  ["D6", 4, "詰まった箇所だけの改修（通期バッファ）", "Claude", "—", "新機能は原則作らない", 3, 12, "未着手"],
  // D7・D8 は 2026-08-10 の本番停止（NANOのディスクI/O枯渇）から派生した対応。
  ["D7", 4, "重いクエリの棚卸しと軽量化（索引7本・トップ/検索）", "Claude", "—", "全件走査を除去。閲覧数取得が49ブロック→7バッファ", 1, 1, "✅ 完了"],
  ["D8", 4, "Supabase コンピュート増強（NANO→MICRO・障害復旧）", "オーナー＋Claude", "—", "本番停止からの復旧と再発防止。追加費用なし", 1, 1, "✅ 完了"],
  // D9・D10 はオーナー判断済み（2026-08-12・実施で確定）。計画は
  // docs/superpowers/plans/2026-08-12-d9-d10-plan.md。次セッションの着手対象。
  ["D9", 4, "応募RLSのメンバー起点移行（claimオーナーが応募を見られない）", "Claude", "B2", "035で5本のポリシーを移行。応募0件のいま直す", 1, 2, "進行中"],
  ["D10", 4, "/organizations/[id] の ISR ＋ オンデマンド再検証", "Claude", "—", "ISRだけだと凍結が最大N秒遅れる。claim変更時に再検証", 1, 2, "進行中"],
  ["D11", 4, "Reactコンポーネントのテスト基盤（RTL）導入", "Claude", "—", "effectの解決順序・認可リダイレクトを回帰で守る", 3, 5, "未着手"],

  ["E1", 5, "Ahrefs Rank Tracker のキーワード登録", "CEO", "—", "28語登録・順位の定点観測を開始", 1, 2, "未着手"],
  ["E2", 5, "link-freshness 点検（一度も実行していない）", "Claude", "—", "掲載外部リンクの死活レポート", 2, 3, "未着手"],
  ["E3", 5, "SEO PDCA（9月・CTRと成果イベントが主軸に）", "Claude", "D1", "レポートと改善提案", 3, 3, "未着手"],
  ["E4", 5, "SEO PDCA（10月）", "Claude", "—", "レポート", 5, 5, "未着手"],
  ["E5", 5, "SEO PDCA（11月）", "Claude", "—", "レポート", 7, 7, "未着手"],
  ["E6", 5, "SEO PDCA（12月）", "Claude", "—", "レポート", 9, 9, "未着手"],
  ["E7", 5, "SEO PDCA（1月）", "Claude", "—", "レポート", 11, 11, "未着手"],
  ["E8", 5, "記事・SNS 月1〜2本（下支えレーン）", "Claude", "—", "止めない。ただし主軸にしない", 3, 12, "未着手"],

  ["F1", 6, "★100団体を「回収」と別KPIにするかの判断", "オーナー", "—", "レーン分離の合意", 1, 1, "未着手"],
  ["F2", 6, "モデルの前提を実測値で引き直す（第1回）", "Claude", "B10,C7", "Excel更新・月次目標の見直し", 4, 4, "未着手"],
  ["F3", 6, "月次レビュー（毎月末・実測を入れて引き直す）", "全員", "F2", "通期", 4, 12, "未着手"],
  ["F4", 6, "職業紹介許可の名義と番号の確認（リスクL5）", "オーナー", "—", "/about に許可番号を掲載", 1, 4, "未着手"],
  ["F5", 6, "ドメイン更新期限・自動更新の確認", "オーナー", "—", "失効リスクの解消", 1, 2, "未着手"],
  ["F6", 6, "バリューコマース提携8件の審査結果確認", "オーナー", "—", "承認分を resources.ts へ投入", 1, 4, "未着手"],
  ["F7", 6, "学生団体の画像収集の権利方式を決める", "オーナー", "—", "方式決定（保留も可）", 5, 8, "未着手"],
  ["F8", 6, "問い合わせメール（info@ / support@）の用意", "オーナー", "A1", "種別振り分けと一次対応の設計へ", 3, 4, "未着手"],
  ["F9", 6, "/admin の Basic認証用 環境変数を Vercel に設定", "オーナー", "D3", "Production/Preview に設定。本番で401を確認", 1, 1, "✅ 完了"],
];

const wb = new ExcelJS.Workbook();
wb.creator = "ProofLoop";
wb.calcProperties.fullCalcOnLoad = true;

const title = (ws, text, span) => {
  const c = ws.getCell("A1");
  c.value = text;
  c.font = { bold: true, size: 14, color: { argb: INK } };
  ws.getRow(1).height = 24;
  if (span) ws.mergeCells(1, 1, 1, span);
};
const hdrCell = (c, v, align) => {
  c.value = v;
  c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
  c.alignment = { horizontal: align || "center", vertical: "middle", wrapText: true };
  c.border = { bottom: { style: "thin", color: { argb: RULE } } };
};
const note = (ws, row, text, color) => {
  const c = ws.getCell(`A${row}`);
  c.value = text;
  c.font = { size: 9, color: { argb: color || GREY } };
};

// ============================================================
// シート1：ガント（メイン）
// ============================================================
{
  const ws = wb.addWorksheet("ガント");
  ws.getColumn("A").width = 6;
  ws.getColumn("B").width = 17;
  ws.getColumn("C").width = 46;
  ws.getColumn("D").width = 19;
  ws.getColumn("E").width = 11;
  ws.getColumn("F").width = 40;
  ws.getColumn("G").width = 6;
  ws.getColumn("H").width = 6;
  ws.getColumn("I").width = 11;
  for (let i = 0; i < 12; i++) ws.getColumn(GANTT_START_COL + i).width = 4.6;

  title(ws, "ProofLoop タスクシート 2026-08 → 2027-01（最終更新 2026-08-11）");
  ws.getCell("J1").value = "← バーは「開始」「終了」列の数字で動く（1＝8月前半 … 12＝1月後半）";
  ws.getCell("J1").font = { size: 9, color: { argb: GREY } };

  // 月ヘッダー（2コマぶんを結合）
  for (let i = 0; i < 12; i += 2) {
    const col = GANTT_START_COL + i;
    ws.mergeCells(2, col, 2, col + 1);
    const c = ws.getCell(2, col);
    c.value = BUCKETS[i][0];
    c.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    c.alignment = { horizontal: "center" };
  }
  // 前半・後半
  BUCKETS.forEach(([, half], i) => {
    const c = ws.getCell(3, GANTT_START_COL + i);
    c.value = half;
    c.font = { size: 8, color: { argb: INK } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MIST } };
    c.alignment = { horizontal: "center" };
  });
  // コマ番号（数式が参照する行）
  BUCKETS.forEach((_, i) => {
    const c = ws.getCell(4, GANTT_START_COL + i);
    c.value = i + 1;
    c.font = { size: 7, color: { argb: "FFB0B8C0" } };
    c.alignment = { horizontal: "center" };
  });
  // 現在地
  const todayCol = GANTT_START_COL + TODAY_BUCKET - 1;
  [2, 3, 4].forEach((r) => {
    ws.getCell(r, todayCol).border = {
      left: { style: "medium", color: { argb: SEAL } },
      right: { style: "medium", color: { argb: SEAL } },
    };
  });
  ws.getCell(3, todayCol).value = "今";
  ws.getCell(3, todayCol).font = { size: 8, bold: true, color: { argb: SEAL } };

  const HEAD_ROW = 5;
  ["ID", "グループ", "タスク", "担当", "依存", "完了条件（成果物）", "開始", "終了", "状態"]
    .forEach((h, i) => hdrCell(ws.getCell(HEAD_ROW, 1 + i), h, i === 2 || i === 5 ? "left" : "center"));
  BUCKETS.forEach((_, i) => hdrCell(ws.getCell(HEAD_ROW, GANTT_START_COL + i), ""));

  const FIRST = HEAD_ROW + 1;
  TASKS.forEach((t, i) => {
    const r = FIRST + i;
    const [id, gi, name, owner, dep, done, s, e, status] = t;
    const g = GROUPS[gi - 1];
    const vals = [id, G[gi], name, owner, dep, done, s, e, status];
    vals.forEach((v, ci) => {
      const c = ws.getCell(r, 1 + ci);
      c.value = v;
      c.font = { size: 9.5, color: { argb: "FF1F2A36" } };
      c.alignment = {
        horizontal: ci === 2 || ci === 5 ? "left" : "center",
        vertical: "middle", wrapText: ci === 2 || ci === 5,
      };
      c.border = { bottom: { style: "hair", color: { argb: RULE } } };
      if (ci === 1) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: g.tint } };
        c.font = { size: 8.5, color: { argb: g.bar }, bold: true };
      }
      if (ci === 0) c.font = { size: 9, bold: true, color: { argb: g.bar } };
      if (ci === 2 && name.startsWith("★")) c.font = { size: 9.5, bold: true, color: { argb: SEAL } };
      if (ci === 8) {
        c.dataValidation = {
          type: "list", allowBlank: true,
          formulae: ['"未着手,進行中,完了,保留,中止"'],
        };
        if (String(v).startsWith("✅")) c.font = { size: 9, color: { argb: "FF1B5E20" }, bold: true };
      }
    });
    // ガント列は空のまま。色は条件付き書式で塗る
    BUCKETS.forEach((_, ci) => {
      const c = ws.getCell(r, GANTT_START_COL + ci);
      c.border = {
        left: { style: "hair", color: { argb: "FFE4E8EC" } },
        bottom: { style: "hair", color: { argb: "FFE4E8EC" } },
      };
    });
    ws.getRow(r).height = 26;
  });

  const LAST = FIRST + TASKS.length - 1;
  const lastColLetter = ws.getColumn(GANTT_START_COL + 11).letter;
  const ref = `J${FIRST}:${lastColLetter}${LAST}`;

  // グループごとにバーの色を変える。開始 ≦ コマ番号 ≦ 終了 のセルを塗る
  ws.addConditionalFormatting({
    ref,
    rules: GROUPS.map((g, i) => ({
      type: "expression",
      priority: i + 1,
      formulae: [`AND($B${FIRST}="${g.key}",$G${FIRST}<=J$4,$H${FIRST}>=J$4)`],
      style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: g.bar } } },
    })),
  });

  ws.views = [{ state: "frozen", xSplit: 9, ySplit: HEAD_ROW }];
  ws.autoFilter = { from: { row: HEAD_ROW, column: 1 }, to: { row: LAST, column: 9 } };

  const nr = LAST + 2;
  note(ws, nr, "【使い方】「開始」「終了」列に 1〜12 のコマ番号を入れるとバーが動く。1＝2026-08前半、12＝2027-01後半。");
  note(ws, nr + 1, "【状態】プルダウン（未着手／進行中／完了／保留／中止）。5行目の見出しでフィルタできる。");
  note(ws, nr + 2, "【★】投資回収の成否を左右する3タスク。C1（協賛単価の検証）・C5（提案書v1）・F1（KPIレーン分離の判断）。", SEAL);
  note(ws, nr + 3, "【最優先】A1（contact@の受信復旧）と B1→B2（claim動線）。B2 が終わるまで B9 の掲載通知は1件も送れない。", SEAL);
}

// ============================================================
// シート2：マイルストーン
// ============================================================
{
  const ws = wb.addWorksheet("マイルストーン");
  ws.getColumn("A").width = 11;
  ws.getColumn("B").width = 46;
  [3, 4, 5, 6, 7, 8, 9].forEach((i) => (ws.getColumn(i).width = 13));
  title(ws, "マイルストーンと月次の数値目標");
  ws.getCell("A2").value = "数値の根拠：ProofLoop_投資回収モデル_v2_2026-08-07.xlsx ／ 計画の文章：docs/roadmap-2026-08-to-2027-01.md";
  ws.getCell("A2").font = { size: 9, color: { argb: GREY } };

  const head = ["月", "その月に必ず出すもの（ゲート）", "掲載通知", "累計登録団体", "実運用", "企業打診", "成立案件", "月次売上", "累計回収率"];
  head.forEach((h, i) => hdrCell(ws.getCell(4, 1 + i), h, i === 1 ? "left" : "center"));

  const MS = [
    ["2026-08", "contact@受信復旧／Resend認証／claim動線の実装／提案書v1／企業リスト60社", 200, 16, 3, 0, 0, 0, 0],
    ["2026-09", "掲載通知の本格化／実運用団体 第1号／企業打診 開始／実測値でモデルを引き直す", 350, 45, 9, 60, 1.4, 144000, 0.448],
    ["2026-10", "企業打診を積む／/companysearch の実地検証", 350, 74, 14, 110, 2.6, 264000, 0.845],
    ["2026-11", "★累計で黒字転換", 250, 96, 17, 110, 2.6, 274292, 1.06],
    ["2026-12", "初の具体案件を確定（金額・期間・成果物）", 150, 111, 19, 80, 1.9, 203254, 1.101],
    ["2027-01", "★登録122団体／★1月単月黒字／型化と新歓期への仕込み", 100, 122, 20, 70, 1.7, 179713, 1.104],
  ];
  MS.forEach((row, ri) => {
    const r = 5 + ri;
    row.forEach((v, ci) => {
      const c = ws.getCell(r, 1 + ci);
      c.value = v;
      c.alignment = { horizontal: ci === 1 ? "left" : "center", vertical: "middle", wrapText: ci === 1 };
      c.border = { bottom: { style: "hair", color: { argb: RULE } } };
      if (ci === 0) c.font = { bold: true, color: { argb: INK } };
      if (ci === 1 && String(v).includes("★")) c.font = { bold: true, color: { argb: SEAL } };
      if (ci === 2 || ci === 3 || ci === 5) c.numFmt = "#,##0";
      if (ci === 4 || ci === 6) c.numFmt = "#,##0.0";
      if (ci === 7) c.numFmt = '"¥"#,##0';
      if (ci === 8) { c.numFmt = "0.0%"; c.font = { bold: true, color: { argb: v >= 1 ? "FF1B5E20" : INK } }; }
    });
    ws.getRow(r).height = 30;
  });

  let r = 13;
  hdrCell(ws.getCell(r, 1), "止まると全部止まるゲート", "left");
  ws.mergeCells(r, 1, r, 9);
  [
    ["1", "contact@ の受信復旧（8月前半）", "法務4文書の窓口が届かない。営業メールの返信も受けられない。最上流"],
    ["2", "claim動線の実装（8月後半）", "これが無いまま通知を送ると重複ページができてSEOを毀損する"],
    ["3", "企業向け提案書 v1（8月後半）", "9月の企業打診が始まらない。1ヶ月後退すると回収に届かない"],
    ["4", "特定電子メール法の確認（9月の打診前）", "対象は企業打診側。団体通知はSNS DMなので対象外"],
    ["5", "1月に企業打診を止めない", "70→40社にするだけで1月単月黒字が112%→63%に落ちる"],
  ].forEach(([n, g, why], i) => {
    const rr = r + 1 + i;
    ws.getCell(rr, 1).value = n;
    ws.getCell(rr, 1).alignment = { horizontal: "center" };
    ws.getCell(rr, 2).value = g;
    ws.getCell(rr, 2).font = { bold: true, color: { argb: SEAL } };
    ws.mergeCells(rr, 3, rr, 9);
    ws.getCell(rr, 3).value = why;
    ws.getCell(rr, 3).font = { size: 9, color: { argb: GREY } };
    ws.getCell(rr, 3).alignment = { horizontal: "left" };
  });

  r = 20;
  hdrCell(ws.getCell(r, 1), "2つのレーンは別々に見る", "left");
  ws.mergeCells(r, 1, r, 9);
  [
    ["回収レーン（企業）", "累計案件10件・累計売上¥1,065,259・1月単月黒字。ここが人件費を回収する本体"],
    ["ネットワーク効果レーン（団体）", "登録122団体。6ヶ月の回収には+2.3ptしか効かない。効くのは新歓期（3〜4月）以降"],
  ].forEach(([k, v], i) => {
    const rr = r + 1 + i;
    ws.getCell(rr, 1).value = k;
    ws.getCell(rr, 1).font = { bold: true, color: { argb: INK } };
    ws.mergeCells(rr, 1, rr, 2);
    ws.mergeCells(rr, 3, rr, 9);
    ws.getCell(rr, 3).value = v;
    ws.getCell(rr, 3).alignment = { horizontal: "left" };
    ws.getCell(rr, 3).font = { size: 9.5 };
  });
  note(ws, 24, "※ 混ぜると、団体数を追って回収を落とすか、回収を追って2月以降の資産を作り損ねる。", SEAL);
}

// ============================================================
// シート3：企業ロングリスト
// ============================================================
{
  const ws = wb.addWorksheet("企業ロングリスト");
  const widths = [5, 26, 16, 30, 12, 18, 30, 16, 8, 11, 11, 11, 11, 13, 26];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  title(ws, "企業ロングリスト（C2〜C4・C8・C10 で埋めていく）");
  ws.getCell("A2").value = "目標：8月末60社 → 10月200社 → 12月430社。打診はここから行い、反応・商談・結果を同じ行に記録する。";
  ws.getCell("A2").font = { size: 9, color: { argb: GREY } };

  let r = 4;
  hdrCell(ws.getCell(r, 1), "■ 業界仮説（C2で確定させる。ここが決まらないと抽出が始まらない）", "left");
  ws.mergeCells(r, 1, r, 15);
  const HYP = [
    ["スポーツ用品・スポーツ関連", "運動系915団体が最大セグメント。用具提供・遠征協賛は定型がある", "高"],
    ["旅行・交通・宿泊", "合宿と遠征。団体単位でまとまった需要が読める", "高"],
    ["飲料・食品（学生向け消費財）", "サンプリングとブランド認知。イベント協賛の王道", "高"],
    ["公益財団・助成金プログラム", "「協賛」ではなく「助成」。学生活動助成は募集が公開されており当たりやすい", "高"],
    ["楽器・音響・スタジオ", "文化系604団体。公演機材の協賛", "中"],
    ["印刷・制作・ノベルティ", "学園祭とパンフレット。イベント企画33団体に直結", "中"],
    ["地域企業・地銀・信用金庫", "CSRと地域貢献。地方大学（北海道・九州・東北・名古屋）と相性がよい", "中"],
    ["学生向けサービス（賃貸・通信）", "新歓期の接点。ただし3〜4月に寄るため今期は優先度低め", "低"],
    ["新卒採用に投資する企業", "学生接点が動機。⚠️ 就活系アフィリエイトは除外方針だが、企業協賛は別物。線引きをオーナーが確認すること", "要確認"],
  ];
  HYP.forEach(([ind, why, pri], i) => {
    const rr = r + 1 + i;
    ws.getCell(rr, 1).value = i + 1;
    ws.getCell(rr, 1).alignment = { horizontal: "center" };
    ws.getCell(rr, 2).value = ind;
    ws.getCell(rr, 2).font = { bold: true, color: { argb: INK }, size: 9.5 };
    ws.mergeCells(rr, 3, rr, 13);
    ws.getCell(rr, 3).value = why;
    ws.getCell(rr, 3).font = { size: 9, color: pri === "要確認" ? { argb: SEAL } : { argb: GREY } };
    ws.getCell(rr, 3).alignment = { horizontal: "left", wrapText: true };
    ws.getCell(rr, 14).value = pri;
    ws.getCell(rr, 14).alignment = { horizontal: "center" };
    ws.getCell(rr, 14).font = { bold: true, color: { argb: pri === "高" ? "FF1B5E20" : pri === "要確認" ? SEAL : GREY } };
  });

  r = 15;
  hdrCell(ws.getCell(r, 1), "■ ロングリスト（ここから下に追記していく）", "left");
  ws.mergeCells(r, 1, r, 15);
  const COLS2 = ["No", "企業名", "業界", "想定する協賛動機", "規模", "窓口部署", "連絡先（URL / メール）",
    "出所", "優先度", "打診予定月", "打診日", "反応", "商談日", "結果", "メモ"];
  COLS2.forEach((h, i) => hdrCell(ws.getCell(r + 1, i + 1), h, i === 3 || i === 6 ? "left" : "center"));
  for (let i = 0; i < 40; i++) {
    const rr = r + 2 + i;
    ws.getCell(rr, 1).value = i + 1;
    ws.getCell(rr, 1).alignment = { horizontal: "center" };
    ws.getCell(rr, 1).font = { size: 9, color: { argb: "FFB0B8C0" } };
    for (let ci = 1; ci <= 15; ci++) {
      ws.getCell(rr, ci).border = { bottom: { style: "hair", color: { argb: RULE } } };
    }
    ws.getCell(rr, 9).dataValidation = { type: "list", allowBlank: true, formulae: ['"A,B,C"'] };
    ws.getCell(rr, 12).dataValidation = { type: "list", allowBlank: true, formulae: ['"未送信,送信済,返信あり,不通,辞退"'] };
    ws.getCell(rr, 14).dataValidation = { type: "list", allowBlank: true, formulae: ['"—,商談中,成約,見送り"'] };
  }
  ws.views = [{ state: "frozen", ySplit: r + 1 }];
  note(ws, r + 44, "※ 優先度A＝8月末の60社に入れる、B＝10月まで、C＝12月まで。");
  note(ws, r + 45, "※ 「想定する協賛動機」を書けない企業は打診しない。書けない＝提案が作れないということ。", SEAL);
}

// ============================================================
// シート4：団体 声かけ優先順位
// ============================================================
{
  const ws = wb.addWorksheet("団体 声かけ優先順位");
  [6, 30, 16, 26, 8, 16, 8].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.getColumn(8).width = 14;
  title(ws, "団体の声かけ優先順位（B4・B5 の成果物）");

  const jsonPath = path.join(DIR, "org-outreach-summary.json");
  const S = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, "utf8")) : null;

  ws.getCell("A2").value = S
    ? `全件リストは 団体_声かけ優先順位.csv（${S.reachable.toLocaleString()}件・バッチ1〜6付き）。このシートは考え方と上位100件の抜粋。`
    : "先に node docs/models/build-org-outreach-list.mjs を実行してください。";
  ws.getCell("A2").font = { size: 9, color: { argb: GREY } };

  let r = 4;
  hdrCell(ws.getCell(r, 1), "■ スコアの考え方（100点満点）", "left");
  ws.mergeCells(r, 1, r, 8);
  [
    ["到達手段", 30, "X / Instagram / 公式サイトを各10点。DMが届かなければ何も始まらないので最重視"],
    ["大学規模", 25, "同じ大学に団体が多いほど口コミが効く。ネットワーク効果は大学の中で起きる"],
    ["協賛需要", 25, "カテゴリ別。学園祭25／運動系・国際交流20／文化系・メディア・ボランティア15／学術・趣味10"],
    ["団体規模", 20, "人数。100人以上20／50〜99は15／20〜49は10／それ未満と不明は5"],
  ].forEach(([k, p, why], i) => {
    const rr = r + 1 + i;
    ws.getCell(rr, 1).value = k;
    ws.getCell(rr, 1).font = { bold: true, color: { argb: INK } };
    ws.mergeCells(rr, 1, rr, 2);
    ws.getCell(rr, 3).value = p;
    ws.getCell(rr, 3).alignment = { horizontal: "center" };
    ws.getCell(rr, 3).font = { bold: true, color: { argb: SEAL } };
    ws.mergeCells(rr, 4, rr, 8);
    ws.getCell(rr, 4).value = why;
    ws.getCell(rr, 4).font = { size: 9, color: { argb: GREY } };
    ws.getCell(rr, 4).alignment = { horizontal: "left", wrapText: true };
  });

  r = 10;
  hdrCell(ws.getCell(r, 1), "■ バッチの配分（第1バッチだけは「学習」が目的）", "left");
  ws.mergeCells(r, 1, r, 8);
  ws.getCell(r + 1, 1).value =
    "第1バッチ200件は単純なスコア降順にしていない。降順にすると上位が早稲田だけで埋まり、claim率が「早稲田でどうだったか」しか分からなくなるため。";
  ws.mergeCells(r + 1, 1, r + 1, 8);
  ws.getCell(r + 1, 1).font = { size: 9.5, color: { argb: "FF1F2A36" } };
  ws.getCell(r + 1, 1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(r + 1).height = 28;
  ws.getCell(r + 2, 1).value =
    "「大学内順位 ÷ その大学の団体数」で並べ替え、13大学すべてから上位を比例配分している。大学別・カテゴリ別の claim 率を測ってから、第2バッチ以降を勝ち筋に寄せる（タスクB10）。";
  ws.mergeCells(r + 2, 1, r + 2, 8);
  ws.getCell(r + 2, 1).font = { size: 9.5, color: { argb: "FF1F2A36" } };
  ws.getCell(r + 2, 1).alignment = { wrapText: true, vertical: "top" };
  ws.getRow(r + 2).height = 28;

  r = 14;
  const PLAN = [["第1バッチ", "2026-08", 200], ["第2バッチ", "2026-09", 350], ["第3バッチ", "2026-10", 350],
    ["第4バッチ", "2026-11", 250], ["第5バッチ", "2026-12", 150], ["第6バッチ", "2027-01", 100]];
  ["バッチ", "時期", "件数"].forEach((h, i) => hdrCell(ws.getCell(r, i + 1), h));
  PLAN.forEach(([b, m, n], i) => {
    const rr = r + 1 + i;
    ws.getCell(rr, 1).value = b;
    ws.getCell(rr, 2).value = m;
    ws.getCell(rr, 3).value = n;
    [1, 2, 3].forEach((ci) => {
      ws.getCell(rr, ci).alignment = { horizontal: "center" };
      ws.getCell(rr, ci).border = { bottom: { style: "hair", color: { argb: RULE } } };
    });
  });
  ws.getCell(r + 7, 1).value = "合計";
  ws.getCell(r + 7, 1).font = { bold: true };
  ws.getCell(r + 7, 3).value = 1400;
  ws.getCell(r + 7, 3).font = { bold: true, color: { argb: SEAL } };
  ws.getCell(r + 7, 3).alignment = { horizontal: "center" };

  if (S) {
    ws.getCell(r, 5).value = "第1バッチ200件の大学配分";
    ws.getCell(r, 5).font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    ws.getCell(r, 5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } };
    ws.mergeCells(r, 5, r, 6);
    S.batch1Universities.forEach(([u, n], i) => {
      const rr = r + 1 + i;
      ws.getCell(rr, 5).value = u;
      ws.getCell(rr, 6).value = n;
      ws.getCell(rr, 6).alignment = { horizontal: "center" };
      [5, 6].forEach((ci) => (ws.getCell(rr, ci).border = { bottom: { style: "hair", color: { argb: RULE } } }));
    });
  }

  r = 30;
  hdrCell(ws.getCell(r, 1), "■ 上位100件（全件は 団体_声かけ優先順位.csv）", "left");
  ws.mergeCells(r, 1, r, 8);
  ["順位", "団体名", "大学", "カテゴリ", "人数", "到達手段", "スコア", "バッチ"]
    .forEach((h, i) => hdrCell(ws.getCell(r + 1, i + 1), h, i === 1 || i === 3 ? "left" : "center"));
  if (S) {
    S.top100.forEach((o, i) => {
      const rr = r + 2 + i;
      [o.order, o.name, o.university, o.category, o.mc ?? "不明", o.channels, o.score, o.batch]
        .forEach((v, ci) => {
          const c = ws.getCell(rr, ci + 1);
          c.value = v;
          c.font = { size: 9 };
          c.alignment = { horizontal: ci === 1 || ci === 3 ? "left" : "center" };
          c.border = { bottom: { style: "hair", color: { argb: RULE } } };
        });
    });
  }
  ws.views = [{ state: "frozen", ySplit: r + 1 }];
}

// ============================================================
// シート5：使い方
// ============================================================
{
  const ws = wb.addWorksheet("使い方");
  ws.getColumn("A").width = 115;
  title(ws, "このファイルの使い方");
  [
    "",
    "【シート構成】",
    "ガント　　　　　　　… 60タスクを6グループに分け、2026-08〜2027-01を半月刻み12コマで表す。メインの作業面。",
    "マイルストーン　　　… 月ごとに必ず出すもの（ゲート）と数値目標。回収レーンとネットワーク効果レーンの区別。",
    "企業ロングリスト　　… 業界仮説と、打診先を記録していく表。8月末60社→10月200社→12月430社。",
    "団体 声かけ優先順位… スコアの考え方、バッチ配分、上位100件。全件は 団体_声かけ優先順位.csv。",
    "",
    "【ガントのバーの動かし方】",
    "G列「開始」とH列「終了」に 1〜12 のコマ番号を入れる。1＝2026-08前半、2＝2026-08後半 … 12＝2027-01後半。",
    "バーは条件付き書式で描いているので、数字を変えれば即座に反映される。色はグループごとに自動で決まる。",
    "",
    "【グループ】",
    "① 土台・ブロッカー　… ここが通らないと他が進まないもの",
    "② 団体レーン　　　　… claim誘導とネットワーク効果。回収には効かないが2月以降の資産になる",
    "③ 企業レーン　　　　… 人件費を回収する本体。ここが遅れると回収が届かない",
    "④ プロダクト　　　　… 詰まった箇所だけ直す。新機能は原則作らない",
    "⑤ SEO・コンテンツ　… 下支え。月1〜2本。止めないが主軸にしない",
    "⑥ 運営・計測・法務　… 判断・確認・定例",
    "",
    "【いま最初にやる3つ】",
    "A1　contact@proofloop.jp の受信復旧　── 法務4文書の窓口が届いていない。最上流。",
    "B1　claim動線の設計とPlan Mode承認　── スキーマ変更を含む。B2が終わるまで掲載通知は1件も送れない。",
    "F1　100団体を別KPIにするかの判断　　── レーンを混ぜると、どちらも中途半端になる。",
    "",
    "【関連ファイル】",
    "docs/roadmap-2026-08-to-2027-01.md　　　　　　　　… 計画の文章。なぜこの順序なのかの根拠",
    "docs/models/ProofLoop_投資回収モデル_v2_2026-08-07.xlsx … 数値の根拠。前提を変えると全部が再計算される",
    "docs/models/団体_声かけ優先順位.csv　　　　　　　　… 2,354件の全件リスト（接触日・結果の記録欄つき）",
    "docs/task-board.md ／ docs/owner-todo.md　　　　　… 個別タスクの状態、オーナー対応事項",
    "",
    "【更新のルール】",
    "・毎月末に実測値を投資回収モデルへ入れ、月次目標を引き直す。目標を据え置いて未達を積むことはしない。",
    "・第1バッチ（B9）と企業打診 第1バッチ（C7）が出す実測値が最初の分岐点。9月頭に全体を組み替える前提で動く。",
  ].forEach((t, i) => {
    const c = ws.getCell(`A${i + 3}`);
    c.value = t;
    if (t.startsWith("【")) c.font = { bold: true, color: { argb: INK } };
    else if (/^[ABF]\d/.test(t)) c.font = { bold: true, color: { argb: SEAL } };
  });
}

await wb.xlsx.writeFile(OUT);
console.log("wrote:", OUT);
console.log(`タスク数: ${TASKS.length}`);

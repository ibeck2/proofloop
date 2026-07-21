# GPA計算機（大学別換算方式対応）実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 日本の大学ごとに異なるGPA換算方式に対応したGPA計算機を `/gpa` に公開し、上位校学生の流入獲得と「上位校比率」の計測を同時に実現する。

**Architecture:** 計算ロジックを `lib/gpa/` 配下の純粋関数として UI から完全に分離し、vitest で単体検証する。大学マスタは「換算方式（`GradeScale`）」と「大学（`University`）」を分離して持ち、各大学には出典URLと確認日を必須で持たせる。ページは `app/gpa/page.tsx`（サーバー：メタデータ・構造化データ・SEO本文）と `app/gpa/GpaCalculatorClient.tsx`（クライアント：入力UI・計算・GA4送信）に分ける。成績データはサーバーに保存せず、GA4イベントの集計値のみを取得する。

**Tech Stack:** Next.js 15 (App Router) / TypeScript / Tailwind CSS / react-hook-form（導入済み）/ vitest（本プランで新規導入）

**設計書:** `docs/superpowers/specs/2026-07-21-gpa-calculator-design.md`
**KWファクト台帳:** `docs/seo/keyword-facts.md`

## Global Constraints

- 絶対URLは必ず `SITE_URL`（`lib/site-url.ts`）を参照する。`https://proofloop.jp` を含むURLをハードコードしない。
- canonical / OGP の絶対URLは `${SITE_URL}/gpa`。
- デザイントークン厳守：`primary` = `#002b5c`、`accent` = `#8B0000`、`text-grey` = `#707070`。Tailwind クラス `text-primary` / `bg-primary` / `text-accent` / `text-text-grey` を使う。独自の配色を導入しない。
- フォント：`font-display`（Inter/Lexend/Noto Sans JP）＝見出し、`font-body`（Noto Sans JP）＝本文。
- `borderRadius` は全て `0px` に設定されている（角丸なしのデザイン）。`rounded-*` クラスを新たに使わない。
- **ナビゲーション（ヘッダー）に `/gpa` を追加しない**（CLAUDE.md §5）。導線は `/guide/credits`・`/guide` ハブ・フッターのみ。
- **就活系のリンク・アフィリエイトを一切設置しない**（CLAUDE.md §5）。
- パスエイリアスは `@/*` → リポジトリルート。ただし `lib/gpa/` 内部の相互参照は**相対パス**（`./types` 等）を使う（vitest にエイリアス設定を追加せずに済ませるため）。
- Supabase のスキーマ変更・テーブル追加は**行わない**。
- 新規依存の追加は `vitest`（devDependency）のみ。他のパッケージを追加しない。
- 大学の換算方式は**公式資料で裏が取れたもののみ**マスタに載せる。推測で埋めない。

## 設計書からの明確化（実装上の判断）

設計書 §3.6 は「`react-hook-form` + `zod` を使用」としているが、バリデーションの実装方針を以下に確定する。理由は、`calculateGpa` が既に全ての検証を担っており、zod スキーマを別に定義すると検証ロジックが二重管理になる（DRY違反）ため。

- **フォームの状態管理**：`react-hook-form` の `useFieldArray`（科目行の動的追加・削除）を使う。
- **検証の単一の真実**：`lib/gpa/calculate.ts` の `calculateGpa` が返す `Result` 型のエラーを、UI がインラインメッセージへマッピングする。zod スキーマは新規に定義しない。
- 新規依存は増えない（両方とも導入済み）。

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `docs/seo/gpa-university-scales.md` | 新規 | 13校の換算方式の調査記録（出典URL・確認日・原文抜粋） |
| `vitest.config.ts` | 新規 | vitest の対象ファイル設定 |
| `lib/gpa/types.ts` | 新規 | 型定義のみ。ロジックを持たない |
| `lib/gpa/scales.ts` | 新規 | 汎用換算方式（大学非依存のパターン）の定数 |
| `lib/gpa/calculate.ts` | 新規 | GPA計算・GPA帯判定の純粋関数 |
| `lib/gpa/calculate.test.ts` | 新規 | `calculate.ts` の単体テスト |
| `lib/gpa/universities.ts` | 新規 | 13校のマスタ＋大学固有の換算方式 |
| `lib/gpa/universities.test.ts` | 新規 | マスタの整合性テスト（参照切れ・出典欠落の検出） |
| `app/gpa/GpaCalculatorClient.tsx` | 新規 | 入力UI・計算実行・結果表示・CTA・GA4送信 |
| `app/gpa/page.tsx` | 新規 | メタデータ・構造化データ・SEO本文 |
| `app/sitemap.ts` | 変更 | `/gpa` を静的ページに追加 |
| `app/guide/credits/page.tsx` | 変更 | `/gpa` への内部リンクを追加 |
| `app/guide/page.tsx` | 変更 | `/gpa` への内部リンクを追加 |
| `components/Footer.tsx` | 変更 | `/gpa` への内部リンクを追加 |
| `package.json` | 変更 | `vitest` 追加、`test` スクリプト追加 |

---

## Task 1: 13校のGPA換算方式を調査し記録する

**このタスクにコード実装は含まれない。成果物は調査記録のみ。**
GPAの計算結果が誤っていれば、上位校学生に対する誤情報となり、E-E-A-T獲得を狙う本施策が逆に信頼を破壊する。したがって調査をコード実装より前に置く。

**Files:**
- Create: `docs/seo/gpa-university-scales.md`

**Interfaces:**
- Consumes: なし
- Produces: Task 3 の `lib/gpa/universities.ts` に転記する確定データ。各大学につき「評語→GP の対応表 または 素点換算式」「満点GPA」「不可の算入有無」「出典URL」「確認日」「学部差の有無」。

**調査対象13校**

| 区分 | 大学 |
|---|---|
| 東京一科 | 東京大学 / 京都大学 / 一橋大学 / 東京科学大学 |
| 旧帝 | 北海道大学 / 東北大学 / 名古屋大学 / 大阪大学 / 九州大学 |
| 早慶上智ICU | 早稲田大学 / 慶應義塾大学 / 上智大学 / 国際基督教大学（ICU） |

- [ ] **Step 1: 調査記録ファイルの雛形を作る**

`docs/seo/gpa-university-scales.md` を以下の内容で作成する。

```markdown
# 大学別GPA換算方式 調査記録

> `lib/gpa/universities.ts` の原本。**このファイルに出典URLと確認日が記載されていない大学は、マスタに載せない。**
> 数値を推測で埋めることを固く禁じる。裏が取れなければ「未確認」として残し、計算機の選択肢から外す。

## 記録フォーマット

各大学について以下を必ず埋める。

- **大学名 / 短縮名**
- **換算方式**：`評語方式` または `素点換算方式`
- **対応表または換算式**：評語ごとのGP、または素点からGPを求める式
- **満点GPA**
- **不可（F相当）の扱い**：GPA計算の分母に算入するか
- **学部差**：全学共通か、学部により異なるか
- **出典URL**：大学公式の履修要項・成績評価規程・GPA制度説明ページ
- **確認日**：YYYY-MM-DD
- **原文抜粋**：出典から該当箇所を引用（後から検証できるように）

---

## 調査ステータス

| 大学 | 状態 | 確認日 |
|---|---|---|
| 東京大学 | 未着手 | – |
| 京都大学 | 未着手 | – |
| 一橋大学 | 未着手 | – |
| 東京科学大学 | 未着手 | – |
| 北海道大学 | 未着手 | – |
| 東北大学 | 未着手 | – |
| 名古屋大学 | 未着手 | – |
| 大阪大学 | 未着手 | – |
| 九州大学 | 未着手 | – |
| 早稲田大学 | 未着手 | – |
| 慶應義塾大学 | 未着手 | – |
| 上智大学 | 未着手 | – |
| 国際基督教大学（ICU） | 未着手 | – |

（状態は `未着手` / `確認済` / `未確認（出典なし）` のいずれか）

---

## 調査結果

（ここに1大学ずつ追記する）
```

- [ ] **Step 2: 1大学ずつ公式資料を調査して追記する**

各大学について、以下の検索クエリで公式サイト（`.ac.jp` ドメイン）を探す。

```
<大学名> GPA 算出方法
<大学名> 成績評価 GP 履修要項
site:<大学ドメイン> GPA
```

**採用してよい出典**：大学公式サイト（`*.ac.jp`）の履修要項・学修要覧・成績評価に関する規程・教務課のGPA説明ページ・公式PDF。
**採用してはならない出典**：まとめサイト、個人ブログ、予備校・就活メディア、他のGPA計算サイト。

見つかったら「調査結果」セクションに追記する。記録例（フォーマットを示すための**書式サンプル**であり、実在の数値ではない。実際の調査結果で置き換えること）：

```markdown
### ◯◯大学

- **短縮名**：◯◯大
- **換算方式**：評語方式
- **対応表**：（出典の記載どおりに書く。例：評語Aに対しGP=4、評語Bに対しGP=3 …）
- **満点GPA**：（出典の記載どおり）
- **不可の扱い**：（出典の記載どおり。分母に算入する/しない）
- **学部差**：（全学共通 / 学部により異なる → 異なる場合はその旨）
- **出典URL**：https://www.example.ac.jp/...
- **確認日**：2026-07-2X
- **原文抜粋**：
  > （出典から該当箇所をそのまま引用）
```

**1大学あたりの調査上限は30分**とする。上限を超えても公式の出典が見つからない場合は、状態を `未確認（出典なし）` として記録し、次の大学へ進む。時間をかけて推測で埋めることを禁じる。

- [ ] **Step 3: 調査ステータス表を更新する**

13校すべてについて、ステータス表の「状態」と「確認日」を埋める。`未着手` が1つも残っていないことを確認する。

- [ ] **Step 4: 確認済みの大学数を記録する**

ファイル末尾に以下を追記する（`N` と `M` は実際の数に置き換える）。

```markdown
---

## 調査サマリ（2026-07-2X時点）

- 確認済：N校 → `lib/gpa/universities.ts` に登録する
- 未確認（出典なし）：M校 → マスタに載せない。汎用方式でフォールバックする
```

**確認済が0校だった場合は、そこで実装を止めて報告する。** 差別化の核が成立せず、設計の前提が崩れるため。

- [ ] **Step 5: Commit**

```bash
git add docs/seo/gpa-university-scales.md
git commit -m "docs: 大学別GPA換算方式の調査記録を追加（出典・確認日つき）"
```

---

## Task 2: 計算ロジックを vitest で TDD 実装する

vitest の導入・型定義・汎用換算方式は、いずれも計算ロジックを検証可能にするための前提であるため、このタスクにまとめる。

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/gpa/types.ts`
- Create: `lib/gpa/scales.ts`
- Create: `lib/gpa/calculate.ts`
- Test: `lib/gpa/calculate.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: なし
- Produces:
  - `lib/gpa/types.ts`：`GradeOption` / `GradeScale` / `University` / `Course` / `GpaResult` / `GpaBand`
  - `lib/gpa/scales.ts`：`GENERIC_SCALES: GradeScale[]`、`DEFAULT_SCALE_ID: string`
  - `lib/gpa/calculate.ts`：
    - `calculateGpa(input: { courses: Course[]; scale: GradeScale }): CalculateOutput`
    - `CalculateOutput = { ok: true; result: GpaResult } | { ok: false; reason: CalculateErrorReason; courseId?: string }`
    - `CalculateErrorReason = "no_courses" | "zero_credits" | "invalid_credits" | "invalid_grade" | "invalid_score"`
    - `toGpaBand(gpa: number): GpaBand`

- [ ] **Step 1: vitest をインストールする**

```bash
npm install -D vitest
```

- [ ] **Step 2: `package.json` に test スクリプトを追加する**

`"scripts"` に `"test"` を追加する（既存の行は変更しない）。

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "supabase:set-email-rate-limit": "node scripts/set-auth-rate-limit.js"
  },
```

- [ ] **Step 3: `vitest.config.ts` を作成する**

`lib/` 配下のみを対象にする。`app/` 配下のコンポーネントはテスト対象外（スコープ外）。

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: `lib/gpa/types.ts` を作成する**

```ts
/** 成績評語1つと、それに対応するグレードポイント */
export type GradeOption = {
  /** 表示ラベル。例: "秀", "A", "優" */
  label: string;
  /** グレードポイント。例: 4 */
  point: number;
};

/** GPA換算方式 */
export type GradeScale = {
  id: string;
  /** UIに表示する方式名 */
  label: string;
  /** 'grade' = 評語から換算 / 'score' = 素点から換算 */
  method: "grade" | "score";
  /** method === 'grade' のとき必須。表示順は配列順 */
  grades?: GradeOption[];
  /** method === 'score' のとき必須。素点(0-100)からGPを返す */
  scoreToPoint?: (score: number) => number;
  /** この方式の満点GPA */
  maxGpa: number;
  /** 方式の補足説明。UIに表示する */
  note?: string;
};

/** 大学 */
export type University = {
  id: string;
  /** 正式名称。例: "東京大学" */
  name: string;
  /** 選択UI用の短縮名。例: "東大" */
  shortName: string;
  /** 計測用の区分。'top' = 調査対象13校 / 'other' = それ以外 */
  tier: "top" | "other";
  /** 参照する GradeScale の id */
  scaleId: string;
  /** 換算方式の出典URL（大学公式）。空文字を許さない */
  sourceUrl: string;
  /** 出典を確認した日付。"YYYY-MM-DD" */
  verifiedAt: string;
  /** 学部差など、大学固有の注意書き */
  note?: string;
};

/** 入力された履修科目1件 */
export type Course = {
  id: string;
  name: string;
  /** 単位数。0以上 */
  credits: number;
  /** method === 'grade' のとき使用。GradeOption.label と一致させる */
  grade?: string;
  /** method === 'score' のとき使用。0-100 */
  score?: number;
};

/** 計算結果 */
export type GpaResult = {
  /** 小数第2位まで四捨五入 */
  gpa: number;
  totalCredits: number;
  /** GPAに算入された科目数 */
  countedCourses: number;
};

/** GA4送信・出し分けに使うGPA帯 */
export type GpaBand = "~2.0" | "2.0-2.5" | "2.5-3.0" | "3.0-3.5" | "3.5~";
```

- [ ] **Step 5: `lib/gpa/scales.ts` を作成する**

ここに置くのは**大学に依存しない汎用パターンのみ**。特定大学の方式は Task 3 で `universities.ts` 側に定義する。

```ts
import type { GradeScale } from "./types";

/**
 * 大学非依存の汎用換算方式。
 * 調査で出典が取れなかった大学、および一覧にない大学のフォールバックとして使う。
 */
export const GENERIC_SCALES: GradeScale[] = [
  {
    id: "generic-shuu-yuu-ryou-ka",
    label: "4段階（秀・優・良・可・不可）",
    method: "grade",
    grades: [
      { label: "秀", point: 4 },
      { label: "優", point: 3 },
      { label: "良", point: 2 },
      { label: "可", point: 1 },
      { label: "不可", point: 0 },
    ],
    maxGpa: 4,
    note: "多くの大学で使われている一般的な方式です。お使いの大学の履修要項で評語とGPの対応をご確認ください。",
  },
  {
    id: "generic-s-a-b-c-d",
    label: "4段階（S・A・B・C・D）",
    method: "grade",
    grades: [
      { label: "S", point: 4 },
      { label: "A", point: 3 },
      { label: "B", point: 2 },
      { label: "C", point: 1 },
      { label: "D", point: 0 },
    ],
    maxGpa: 4,
    note: "S/A/B/C/D 表記の一般的な方式です。お使いの大学の履修要項で評語とGPの対応をご確認ください。",
  },
];

/** 大学未選択時に使う既定の方式 */
export const DEFAULT_SCALE_ID = "generic-shuu-yuu-ryou-ka";
```

- [ ] **Step 6: 失敗するテストを書く**

`lib/gpa/calculate.test.ts` を作成する。

```ts
import { describe, expect, it } from "vitest";
import { calculateGpa, toGpaBand } from "./calculate";
import { GENERIC_SCALES } from "./scales";
import type { GradeScale } from "./types";

const gradeScale = GENERIC_SCALES[0]; // 秀4 / 優3 / 良2 / 可1 / 不可0

/** 素点換算のテスト専用スケール（実在の大学の方式ではない） */
const testScoreScale: GradeScale = {
  id: "test-score",
  label: "テスト用素点換算",
  method: "score",
  scoreToPoint: (score) => Math.max(0, Math.min(4, Math.floor((score - 50) / 10))),
  maxGpa: 4,
};

describe("calculateGpa", () => {
  it("単位数が同じ複数科目の平均を返す", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "微分積分", credits: 2, grade: "秀" }, // 4
        { id: "2", name: "線形代数", credits: 2, grade: "良" }, // 2
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(3);
    expect(out.result.totalCredits).toBe(4);
    expect(out.result.countedCourses).toBe(2);
  });

  it("単位数で加重平均する", () => {
    // (4*6 + 1*2) / 8 = 26/8 = 3.25
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "専門演習", credits: 6, grade: "秀" },
        { id: "2", name: "体育", credits: 2, grade: "可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(3.25);
  });

  it("不可（GP=0）の科目も分母の単位数に算入する", () => {
    // (3*2 + 0*2) / 4 = 1.5
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "英語", credits: 2, grade: "優" },
        { id: "2", name: "統計学", credits: 2, grade: "不可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(1.5);
    expect(out.result.totalCredits).toBe(4);
  });

  it("小数第2位まで四捨五入する", () => {
    // (4*2 + 3*2 + 2*2) / 6 = 18/6 = 3 ではなく、割り切れない例を使う
    // (4*2 + 3*2 + 1*2) / 6 = 16/6 = 2.666... → 2.67
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "A", credits: 2, grade: "秀" },
        { id: "2", name: "B", credits: 2, grade: "優" },
        { id: "3", name: "C", credits: 2, grade: "可" },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(2.67);
  });

  it("ちょうど .xx5 の値を切り上げる（浮動小数点誤差で切り下げない）", () => {
    // GPと単位数はいずれも整数なので、商が 23/40 = 0.575 のような
    // 「ちょうど .xx5」になる組み合わせは現実に発生する。
    // 単純な Math.round(x * 100) / 100 だとここが 0.57 に落ちる。
    // 秀(4)×1単位 + 不可(0)×3単位 + 可(1)×... ではなく、単純に総和23・総単位40を作る:
    // 優(3)×7単位 = 21 、可(1)×2単位 = 2 → 計23。単位数 7+2 = 9 ではなく40にするため
    // 不可(0)×31単位 を足す。 23 / 40 = 0.575
    const out = calculateGpa({
      scale: gradeScale,
      courses: [
        { id: "1", name: "A", credits: 7, grade: "優" }, // 3*7 = 21
        { id: "2", name: "B", credits: 2, grade: "可" }, // 1*2 = 2
        { id: "3", name: "C", credits: 31, grade: "不可" }, // 0*31 = 0
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.totalCredits).toBe(40);
    expect(out.result.gpa).toBe(0.58);
  });

  it("素点換算方式では scoreToPoint の結果を使う", () => {
    // 85点 → floor(35/10) = 3 、65点 → floor(15/10) = 1
    // (3*2 + 1*2) / 4 = 2
    const out = calculateGpa({
      scale: testScoreScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 85 },
        { id: "2", name: "B", credits: 2, score: 65 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.gpa).toBe(2);
  });

  it("科目が0件ならエラーを返す", () => {
    const out = calculateGpa({ scale: gradeScale, courses: [] });
    expect(out).toEqual({ ok: false, reason: "no_courses" });
  });

  it("単位数の合計が0ならゼロ除算せずエラーを返す", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [{ id: "1", name: "聴講", credits: 0, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "zero_credits" });
  });

  it("単位数が負ならエラーを返し、該当科目のidを含める", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [{ id: "c9", name: "A", credits: -1, grade: "優" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_credits", courseId: "c9" });
  });

  it("評語が方式に存在しなければエラーを返す", () => {
    const out = calculateGpa({
      scale: gradeScale,
      courses: [{ id: "c1", name: "A", credits: 2, grade: "X" }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_grade", courseId: "c1" });
  });

  it("素点が0-100の範囲外ならエラーを返す", () => {
    const out = calculateGpa({
      scale: testScoreScale,
      courses: [{ id: "c2", name: "A", credits: 2, score: 120 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c2" });
  });
});

describe("toGpaBand", () => {
  it("境界値を含めて正しい帯を返す", () => {
    expect(toGpaBand(0)).toBe("~2.0");
    expect(toGpaBand(1.99)).toBe("~2.0");
    expect(toGpaBand(2.0)).toBe("2.0-2.5");
    expect(toGpaBand(2.49)).toBe("2.0-2.5");
    expect(toGpaBand(2.5)).toBe("2.5-3.0");
    expect(toGpaBand(2.99)).toBe("2.5-3.0");
    expect(toGpaBand(3.0)).toBe("3.0-3.5");
    expect(toGpaBand(3.49)).toBe("3.0-3.5");
    expect(toGpaBand(3.5)).toBe("3.5~");
    expect(toGpaBand(4)).toBe("3.5~");
  });
});
```

- [ ] **Step 7: テストが失敗することを確認する**

```bash
npm test
```

Expected: FAIL。`Failed to resolve import "./calculate"` または `calculateGpa is not a function` 相当のエラーになる。

- [ ] **Step 8: `lib/gpa/calculate.ts` を実装する**

```ts
import type { Course, GpaBand, GpaResult, GradeScale } from "./types";

export type CalculateErrorReason =
  | "no_courses"
  | "zero_credits"
  | "invalid_credits"
  | "invalid_grade"
  | "invalid_score";

export type CalculateOutput =
  | { ok: true; result: GpaResult }
  | { ok: false; reason: CalculateErrorReason; courseId?: string };

/**
 * 小数第2位まで四捨五入する。
 *
 * 単純な `Math.round(value * 100) / 100` は使えない。GPと単位数はいずれも整数なので
 * 商は 23/40 = 0.575 のような「ちょうど .xx5」の値になりうるが、この値は二進浮動小数点で
 * 正確に表現できず、100倍した時点で 57.499... となって切り下がってしまう
 * （0.575 が 0.58 ではなく 0.57 になる）。単位数40は1学期で普通に到達する値であり、
 * 机上の極端な例ではない。EPSILON を加えてから丸めることでこのずれを打ち消す。
 */
function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * 科目1件のグレードポイントを求める。
 * 換算できない場合は null を返す（呼び出し側でエラー種別を判定する）。
 */
function resolvePoint(course: Course, scale: GradeScale): number | null {
  if (scale.method === "grade") {
    if (!course.grade) return null;
    const found = scale.grades?.find((g) => g.label === course.grade);
    return found ? found.point : null;
  }

  const score = course.score;
  if (score === undefined || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;
  if (!scale.scoreToPoint) return null;
  return scale.scoreToPoint(score);
}

/**
 * GPA = Σ(GP × 単位数) ÷ Σ(単位数)
 * 不可（GP=0）の科目も分母の単位数に算入する。
 */
export function calculateGpa(input: {
  courses: Course[];
  scale: GradeScale;
}): CalculateOutput {
  const { courses, scale } = input;

  if (courses.length === 0) {
    return { ok: false, reason: "no_courses" };
  }

  let weighted = 0;
  let totalCredits = 0;

  for (const course of courses) {
    if (!Number.isFinite(course.credits) || course.credits < 0) {
      return { ok: false, reason: "invalid_credits", courseId: course.id };
    }

    const point = resolvePoint(course, scale);
    if (point === null) {
      return {
        ok: false,
        reason: scale.method === "grade" ? "invalid_grade" : "invalid_score",
        courseId: course.id,
      };
    }

    weighted += point * course.credits;
    totalCredits += course.credits;
  }

  if (totalCredits === 0) {
    return { ok: false, reason: "zero_credits" };
  }

  return {
    ok: true,
    result: {
      gpa: roundTo2(weighted / totalCredits),
      totalCredits,
      countedCourses: courses.length,
    },
  };
}

/** GA4送信とCTA出し分けに使うGPA帯を返す */
export function toGpaBand(gpa: number): GpaBand {
  if (gpa < 2.0) return "~2.0";
  if (gpa < 2.5) return "2.0-2.5";
  if (gpa < 3.0) return "2.5-3.0";
  if (gpa < 3.5) return "3.0-3.5";
  return "3.5~";
}
```

- [ ] **Step 9: テストが通ることを確認する**

```bash
npm test
```

Expected: PASS。11件すべて green。

- [ ] **Step 10: 型チェックが通ることを確認する**

```bash
npx tsc --noEmit
```

Expected: 出力されるエラー行に `lib/gpa/` が1件も含まれないこと。既存の型エラー9件（`app/events/[id]/page.tsx` 他）はこのプランのスコープ外なので修正しない。

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/gpa/types.ts lib/gpa/scales.ts lib/gpa/calculate.ts lib/gpa/calculate.test.ts
git commit -m "feat: GPA計算ロジックを純粋関数として実装（vitest導入）"
```

---

## Task 3: 大学マスタを作り、整合性テストで守る

**Files:**
- Create: `lib/gpa/universities.ts`
- Test: `lib/gpa/universities.test.ts`

**Interfaces:**
- Consumes:
  - `lib/gpa/types.ts` の `GradeScale` / `University`
  - `lib/gpa/scales.ts` の `GENERIC_SCALES` / `DEFAULT_SCALE_ID`
  - `docs/seo/gpa-university-scales.md`（Task 1 の調査結果）
- Produces:
  - `UNIVERSITY_SCALES: GradeScale[]`（大学固有の方式。汎用と合わせたものが `ALL_SCALES`）
  - `ALL_SCALES: GradeScale[]`
  - `UNIVERSITIES: University[]`（`tier: "top"` の確認済み大学のみ）
  - `findScaleById(id: string): GradeScale | undefined`
  - `findUniversityById(id: string): University | undefined`

- [ ] **Step 1: `lib/gpa/universities.ts` を作成する**

`UNIVERSITY_SCALES` と `UNIVERSITIES` の中身は、**`docs/seo/gpa-university-scales.md` で「確認済」となっている大学のみ**を転記して埋める。未確認の大学は配列に入れない。

以下は**構造を示すファイル骨格**である。`/* ここに調査結果を転記する */` の位置に、調査記録の内容をそのまま反映すること。

```ts
import { GENERIC_SCALES, DEFAULT_SCALE_ID } from "./scales";
import type { GradeScale, University } from "./types";

/**
 * 大学固有の換算方式。
 * docs/seo/gpa-university-scales.md で出典が確認できた方式のみを定義する。
 * 汎用方式（GENERIC_SCALES）と同一内容になる大学は、ここに重複定義せず
 * UNIVERSITIES 側で汎用方式の id を参照させること。
 */
export const UNIVERSITY_SCALES: GradeScale[] = [
  /* ここに調査結果を転記する。
     大学固有の方式が1つも無い（全大学が汎用方式と一致した）場合は空配列のままでよい。
     各要素の形は lib/gpa/types.ts の GradeScale に従う。 */
];

/** 計算機で選択可能な全ての換算方式 */
export const ALL_SCALES: GradeScale[] = [...UNIVERSITY_SCALES, ...GENERIC_SCALES];

/**
 * 調査対象13校のうち、公式資料で換算方式の裏が取れた大学のみ。
 * sourceUrl / verifiedAt が空の大学をここに入れてはならない。
 */
export const UNIVERSITIES: University[] = [
  /* ここに調査結果を転記する。各要素の形：
     {
       id: "<英小文字とハイフンのみ>",
       name: "<正式名称>",
       shortName: "<短縮名>",
       tier: "top",
       scaleId: "<UNIVERSITY_SCALES か GENERIC_SCALES に存在する id>",
       sourceUrl: "<大学公式のURL>",
       verifiedAt: "<YYYY-MM-DD>",
       note: "<学部差などの注意書き。無ければ省略>",
     } */
];

export function findScaleById(id: string): GradeScale | undefined {
  return ALL_SCALES.find((scale) => scale.id === id);
}

export function findUniversityById(id: string): University | undefined {
  return UNIVERSITIES.find((university) => university.id === id);
}

/** 大学未選択時に使う方式 */
export function getDefaultScale(): GradeScale {
  const scale = findScaleById(DEFAULT_SCALE_ID);
  if (!scale) {
    throw new Error(`DEFAULT_SCALE_ID "${DEFAULT_SCALE_ID}" が ALL_SCALES に存在しません`);
  }
  return scale;
}
```

- [ ] **Step 2: 失敗するテストを書く**

`lib/gpa/universities.test.ts` を作成する。このテストは**データの中身ではなく整合性**を守る。参照切れ・出典欠落・日付書式の誤りを、マスタを拡張したときに自動で検出できるようにする。

```ts
import { describe, expect, it } from "vitest";
import {
  ALL_SCALES,
  UNIVERSITIES,
  findScaleById,
  findUniversityById,
  getDefaultScale,
} from "./universities";

describe("換算方式マスタ", () => {
  it("id が重複していない", () => {
    const ids = ALL_SCALES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("grade方式は grades を、score方式は scoreToPoint を持つ", () => {
    for (const scale of ALL_SCALES) {
      if (scale.method === "grade") {
        expect(scale.grades, `${scale.id} に grades がありません`).toBeDefined();
        expect(scale.grades!.length).toBeGreaterThan(0);
      } else {
        expect(
          typeof scale.scoreToPoint,
          `${scale.id} に scoreToPoint がありません`
        ).toBe("function");
      }
    }
  });

  it("既定の方式が取得できる", () => {
    expect(getDefaultScale()).toBeDefined();
  });
});

describe("大学マスタ", () => {
  it("id が重複していない", () => {
    const ids = UNIVERSITIES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("全ての大学の scaleId が実在する方式を指している", () => {
    for (const university of UNIVERSITIES) {
      expect(
        findScaleById(university.scaleId),
        `${university.name} の scaleId "${university.scaleId}" が見つかりません`
      ).toBeDefined();
    }
  });

  it("全ての大学が公式の出典URLを持つ", () => {
    for (const university of UNIVERSITIES) {
      expect(
        university.sourceUrl.startsWith("https://"),
        `${university.name} の sourceUrl が https:// で始まっていません`
      ).toBe(true);
    }
  });

  it("全ての大学が YYYY-MM-DD 形式の確認日を持つ", () => {
    for (const university of UNIVERSITIES) {
      expect(
        /^\d{4}-\d{2}-\d{2}$/.test(university.verifiedAt),
        `${university.name} の verifiedAt "${university.verifiedAt}" が不正です`
      ).toBe(true);
    }
  });

  it("マスタに載る大学は全て tier=top である", () => {
    for (const university of UNIVERSITIES) {
      expect(university.tier).toBe("top");
    }
  });

  it("1校以上が登録されている", () => {
    // 0校の場合はプラン Task 1 Step 4 の指示どおり実装を止めるため、
    // ここに到達する時点で必ず1校以上あるはず。
    expect(UNIVERSITIES.length).toBeGreaterThan(0);
  });

  it("findUniversityById が登録済みの大学を引ける", () => {
    const first = UNIVERSITIES[0];
    expect(findUniversityById(first.id)).toEqual(first);
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
npm test
```

Expected: FAIL。`lib/gpa/universities.ts` がまだ存在しない、またはインポート解決に失敗する。
（Step 1 を先に完了している場合は、この時点で PASS になることもある。その場合は Step 4 で意図的な失敗を確認する。）

- [ ] **Step 4: 整合性テストが本当に効くことを確認する**

`UNIVERSITIES` の先頭の要素の `scaleId` を一時的に `"does-not-exist"` に書き換えて実行する。

```bash
npm test
```

Expected: FAIL。`scaleId "does-not-exist" が見つかりません` を含むエラーが出る。
確認後、書き換えを**元に戻す**。

（`UNIVERSITIES` が空配列の場合＝Task 1で確認済が0校だった場合は、Task 1 Step 4 の指示どおり実装を止めて報告すること。）

- [ ] **Step 5: テストが通ることを確認する**

```bash
npm test
```

Expected: PASS。Task 2 の11件と合わせて全て green。

- [ ] **Step 6: 型チェックが通ることを確認する**

```bash
npx tsc --noEmit
```

Expected: 出力されるエラー行に `lib/gpa/` および `app/gpa/` が**1件も含まれない**こと。

このリポジトリには、本タスク以前から `app/events/[id]/page.tsx`・`app/mypage/page.tsx`・`app/schedule/page.tsx`・`components/UpcomingEvents.tsx`・`lib/organizationMembers.ts` に型エラーが9件存在する（`next.config.ts` の `typescript: { ignoreBuildErrors: true }` によりビルドは通る）。これらは既存の債務であり、本プランのスコープ外なので修正しない。`tsc` は非ゼロで終了するのが正常な状態である。判定は exit code ではなく、**自分が触ったファイルがエラー行に出ていないこと**で行う。

- [ ] **Step 7: Commit**

```bash
git add lib/gpa/universities.ts lib/gpa/universities.test.ts
git commit -m "feat: 大学別GPA換算方式のマスタと整合性テストを追加"
```

---

## Task 4: 計算UIコンポーネントを実装する

**Files:**
- Create: `app/gpa/GpaCalculatorClient.tsx`

**Interfaces:**
- Consumes:
  - `lib/gpa/calculate.ts` の `calculateGpa` / `toGpaBand` / `CalculateOutput`
  - `lib/gpa/universities.ts` の `UNIVERSITIES` / `findScaleById` / `getDefaultScale`
  - `lib/gpa/types.ts` の `Course` / `GpaResult` / `GradeScale`
- Produces: デフォルトエクスポート `GpaCalculatorClient`（props なし）。Task 5 の `app/gpa/page.tsx` から `<GpaCalculatorClient />` として使う。

- [ ] **Step 1: コンポーネントを作成する**

```tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { calculateGpa, toGpaBand } from "@/lib/gpa/calculate";
import {
  UNIVERSITIES,
  findScaleById,
  getDefaultScale,
} from "@/lib/gpa/universities";
import type { Course, GpaResult, GradeScale } from "@/lib/gpa/types";

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/** 未選択・一覧にない大学を表す値 */
const OTHER_UNIVERSITY = "other";

type CourseField = {
  name: string;
  credits: string;
  grade: string;
  score: string;
};

type FormValues = {
  universityId: string;
  courses: CourseField[];
};

const EMPTY_COURSE: CourseField = { name: "", credits: "", grade: "", score: "" };

function trackCalculate(params: {
  university_id: string;
  university_tier: string;
  gpa_band: string;
  course_count: number;
}) {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "gpa_calculate", params);
}

/** calculateGpa のエラー種別を、画面に出す日本語メッセージへ変換する */
function errorMessage(reason: string): string {
  switch (reason) {
    case "no_courses":
      return "科目を1つ以上入力してください。";
    case "zero_credits":
      return "単位数の合計が0のため計算できません。単位数を入力してください。";
    case "invalid_credits":
      return "単位数は0以上の数値で入力してください。";
    case "invalid_grade":
      return "すべての科目で成績を選択してください。";
    case "invalid_score":
      return "素点は0〜100の範囲で入力してください。";
    default:
      return "入力内容を確認してください。";
  }
}

export default function GpaCalculatorClient() {
  const [result, setResult] = useState<GpaResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      universityId: OTHER_UNIVERSITY,
      courses: [{ ...EMPTY_COURSE }, { ...EMPTY_COURSE }, { ...EMPTY_COURSE }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "courses" });

  const universityId = watch("universityId");

  const university = useMemo(
    () => UNIVERSITIES.find((u) => u.id === universityId),
    [universityId]
  );

  const scale: GradeScale = useMemo(() => {
    if (!university) return getDefaultScale();
    return findScaleById(university.scaleId) ?? getDefaultScale();
  }, [university]);

  const onSubmit = (values: FormValues) => {
    const courses: Course[] = values.courses
      // 完全に空の行は無視する（入力途中の行でエラーを出さないため）
      .filter(
        (c) =>
          c.name.trim() !== "" ||
          c.credits.trim() !== "" ||
          c.grade.trim() !== "" ||
          c.score.trim() !== ""
      )
      .map((c, index) => ({
        id: String(index),
        name: c.name,
        credits: Number(c.credits),
        grade: scale.method === "grade" ? c.grade : undefined,
        score: scale.method === "score" ? Number(c.score) : undefined,
      }));

    const output = calculateGpa({ courses, scale });

    if (!output.ok) {
      setResult(null);
      setFormError(errorMessage(output.reason));
      return;
    }

    setFormError(null);
    setResult(output.result);

    trackCalculate({
      university_id: university ? university.id : OTHER_UNIVERSITY,
      university_tier: university ? university.tier : "unset",
      gpa_band: toGpaBand(output.result.gpa),
      course_count: output.result.countedCourses,
    });
  };

  return (
    <div className="font-body">
      <form onSubmit={handleSubmit(onSubmit)} className="border border-border-grey p-6">
        {/* ── 大学選択 ───────────────────────── */}
        <div className="mb-6">
          <label
            htmlFor="universityId"
            className="block font-display text-sm font-bold text-primary"
          >
            大学を選ぶ
          </label>
          <p className="mt-1 text-xs text-text-grey">
            大学によってGPAの換算方式が異なります。一覧にない場合は「その他の大学」を選び、
            お使いの大学の履修要項で評語とGPの対応をご確認ください。
          </p>
          <select
            id="universityId"
            {...register("universityId")}
            className="mt-2 w-full border border-border-grey bg-white p-3 text-primary"
          >
            {UNIVERSITIES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
            <option value={OTHER_UNIVERSITY}>その他の大学（一般的な方式で計算）</option>
          </select>

          {/* 換算方式と出典の表示。競合ツールにない差別化点 */}
          <div className="mt-3 border-l-4 border-primary bg-neutral-light p-3 text-xs text-text-grey">
            <p className="font-bold text-primary">換算方式：{scale.label}</p>
            {scale.note ? <p className="mt-1">{scale.note}</p> : null}
            {university ? (
              <p className="mt-1">
                出典：
                <a
                  href={university.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                >
                  {university.name} 公式
                </a>
                （{university.verifiedAt} 確認）
              </p>
            ) : null}
            {university?.note ? <p className="mt-1">{university.note}</p> : null}
          </div>
        </div>

        {/* ── 科目入力 ───────────────────────── */}
        <div>
          <p className="font-display text-sm font-bold text-primary">履修科目</p>
          <p className="mt-1 text-xs text-text-grey">
            GPAに算入される科目のみ入力してください（認定単位・履修中の科目は除きます）。
          </p>

          <div className="mt-3 space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[8rem] flex-1">
                  <label className="block text-xs text-text-grey">科目名（任意）</label>
                  <input
                    type="text"
                    {...register(`courses.${index}.name`)}
                    className="mt-1 w-full border border-border-grey p-2 text-primary"
                    placeholder="微分積分"
                  />
                </div>

                <div className="w-24">
                  <label className="block text-xs text-text-grey">単位数</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    {...register(`courses.${index}.credits`)}
                    className="mt-1 w-full border border-border-grey p-2 text-primary"
                    placeholder="2"
                  />
                </div>

                {scale.method === "grade" ? (
                  <div className="w-32">
                    <label className="block text-xs text-text-grey">成績</label>
                    <select
                      {...register(`courses.${index}.grade`)}
                      className="mt-1 w-full border border-border-grey bg-white p-2 text-primary"
                    >
                      <option value="">選択</option>
                      {scale.grades?.map((g) => (
                        <option key={g.label} value={g.label}>
                          {g.label}（{g.point}）
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="w-32">
                    <label className="block text-xs text-text-grey">素点（0〜100）</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      {...register(`courses.${index}.score`)}
                      className="mt-1 w-full border border-border-grey p-2 text-primary"
                      placeholder="85"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                  className="border border-border-grey px-3 py-2 text-xs text-text-grey disabled:opacity-40"
                  aria-label={`${index + 1}行目を削除`}
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => append({ ...EMPTY_COURSE })}
            className="mt-3 border border-primary px-4 py-2 text-sm font-bold text-primary"
          >
            ＋ 科目を追加
          </button>
        </div>

        {formError ? (
          <p role="alert" className="mt-4 border-l-4 border-accent bg-neutral-light p-3 text-sm text-accent">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-6 w-full bg-primary px-6 py-4 font-display text-base font-bold text-white"
        >
          GPAを計算する
        </button>
      </form>

      {/* ── 結果 ───────────────────────── */}
      {result ? <GpaResultPanel result={result} maxGpa={scale.maxGpa} /> : null}
    </div>
  );
}

function GpaResultPanel({ result, maxGpa }: { result: GpaResult; maxGpa: number }) {
  const band = toGpaBand(result.gpa);

  return (
    <section aria-live="polite" className="mt-8 border border-primary p-6">
      <p className="font-display text-sm font-bold text-text-grey">あなたのGPA</p>
      <p className="mt-2 font-display text-5xl font-bold text-primary">
        {result.gpa.toFixed(2)}
        <span className="ml-2 text-lg text-text-grey">/ {maxGpa.toFixed(1)}</span>
      </p>
      <p className="mt-2 text-sm text-text-grey">
        算入科目：{result.countedCourses}科目／合計 {result.totalCredits} 単位
      </p>

      {/* GPA帯に応じた次アクション。就活系の導線は置かない */}
      <div className="mt-6 border-t border-border-grey pt-6">
        {band === "3.0-3.5" || band === "3.5~" ? (
          <div>
            <p className="font-display text-base font-bold text-primary">
              交換留学の出願要件を満たしている可能性があります
            </p>
            <p className="mt-2 text-sm text-text-grey">
              多くの大学の交換留学プログラムはGPAを出願要件に置いています。必要なGPAの目安と、
              留学先の選び方を確認してみてください。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/guide/study-abroad"
                className="bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                留学ガイドを読む
              </Link>
              <Link
                href="/guide/study-abroad/recommend"
                className="border border-primary px-5 py-3 text-sm font-bold text-primary"
              >
                留学先を診断する
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-display text-base font-bold text-primary">
              GPAは履修設計で変えられます
            </p>
            <p className="mt-2 text-sm text-text-grey">
              単位の取り方・必修と選択のバランス・成績評価の仕組みを理解すると、GPAは戦略的に上げられます。
            </p>
            <div className="mt-4">
              <Link
                href="/guide/credits"
                className="bg-primary px-5 py-3 text-sm font-bold text-white"
              >
                履修・単位ガイドを読む
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-border-grey pt-6">
        <p className="text-sm text-text-grey">
          学外の活動（学生団体・インターン・プロジェクト）は成績には出ませんが、実績として蓄積できます。
        </p>
        <Link href="/signup" className="mt-3 inline-block text-sm font-bold text-accent underline">
          ProofLoopで活動を記録する
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 型チェックが通ることを確認する**

```bash
npx tsc --noEmit
```

Expected: 出力されるエラー行に `lib/gpa/` および `app/gpa/` が**1件も含まれない**こと。

このリポジトリには、本タスク以前から `app/events/[id]/page.tsx`・`app/mypage/page.tsx`・`app/schedule/page.tsx`・`components/UpcomingEvents.tsx`・`lib/organizationMembers.ts` に型エラーが9件存在する（`next.config.ts` の `typescript: { ignoreBuildErrors: true }` によりビルドは通る）。これらは既存の債務であり、本プランのスコープ外なので修正しない。`tsc` は非ゼロで終了するのが正常な状態である。判定は exit code ではなく、**自分が触ったファイルがエラー行に出ていないこと**で行う。

- [ ] **Step 3: lint が通ることを確認する**

```bash
npm run lint
```

Expected: `/gpa` 配下に関するエラーが0件。

- [ ] **Step 4: Commit**

```bash
git add app/gpa/GpaCalculatorClient.tsx
git commit -m "feat: GPA計算UI（大学選択・出典表示・GPA帯別CTA・GA4計測）を実装"
```

---

## Task 5: `/gpa` ページ（メタデータ・構造化データ・SEO本文）を実装する

**Files:**
- Create: `app/gpa/page.tsx`

**Interfaces:**
- Consumes:
  - `app/gpa/GpaCalculatorClient.tsx` のデフォルトエクスポート
  - `lib/gpa/universities.ts` の `UNIVERSITIES`
  - `lib/site-url.ts` の `SITE_URL`
- Produces: `/gpa` ルート。Task 6 の sitemap・内部リンクが指す先。

- [ ] **Step 1: ページを作成する**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { UNIVERSITIES } from "@/lib/gpa/universities";
import GpaCalculatorClient from "./GpaCalculatorClient";

export const metadata: Metadata = {
  title: "GPA計算機｜大学別の換算方式に対応（東大・京大・早慶ほか） | ProofLoop",
  description:
    "大学ごとに異なるGPAの換算方式に対応したGPA計算機。評語とGPの対応は各大学の公式資料を出典として明示しています。単位数で加重した正確なGPAを、その場で計算できます。",
  keywords: [
    "GPA 計算",
    "GPA 計算機",
    "大学 GPA",
    "GPA 平均",
    "GPA 出し方",
    "交換留学 GPA",
  ],
  openGraph: {
    title: "GPA計算機｜大学別の換算方式に対応 | ProofLoop",
    description:
      "大学ごとに違うGPAの換算方式に対応。出典つきで正確に計算できるGPA計算機です。",
    url: `${SITE_URL}/gpa`,
  },
  alternates: { canonical: `${SITE_URL}/gpa` },
};

// ─────────────────────────────────────────────
// データ定数
// ─────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: "GPAはどうやって計算しますか？",
    answer:
      "科目ごとの成績をグレードポイント（GP）に換算し、単位数で加重した平均を取ります。式は「Σ（GP×単位数）÷ Σ単位数」です。単位数の大きい科目ほど、GPAへの影響が大きくなります。",
  },
  {
    question: "大学によってGPAの計算方法は違いますか？",
    answer:
      "違います。日本の大学では、評語（秀・優・良・可／S・A・B・C など）とグレードポイントの対応が大学ごとに定められており、素点からGPを算出する方式を採る大学もあります。満点も4.0とは限りません。そのためGPAの数値は、大学をまたいで単純に比較できません。",
  },
  {
    question: "不可（F）の科目もGPAに含まれますか？",
    answer:
      "多くの大学では、不可の科目もグレードポイント0として分母の単位数に算入されます。そのため単位を落とすとGPAは下がります。ただし扱いは大学によって異なるため、履修要項での確認をおすすめします。",
  },
  {
    question: "交換留学の出願にはどのくらいのGPAが必要ですか？",
    answer:
      "多くの大学の交換留学プログラムがGPAを出願要件に置いています。必要な水準は大学・派遣先によって異なるため、所属大学の国際交流課の募集要項を確認してください。GPAが要件に届いているかどうかは、留学先選びの出発点になります。",
  },
  {
    question: "この計算機の換算方式はどこから取っていますか？",
    answer:
      "各大学の公式サイトに掲載されている履修要項・成績評価に関する規程を出典としています。大学を選ぶと、参照した出典URLと確認日が画面に表示されます。出典が確認できなかった大学は一覧に含めず、一般的な方式で計算する扱いにしています。",
  },
];

export default function GpaPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GPA計算機（大学別換算方式対応）",
    url: `${SITE_URL}/gpa`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "All",
    offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 font-body">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
        GPA計算機｜大学別の換算方式に対応
      </h1>
      <p className="mt-4 text-base leading-relaxed text-text-grey">
        日本の大学は、成績評語とグレードポイントの対応が大学ごとに定められています。
        このGPA計算機は、各大学の公式資料を出典として換算方式を登録しており、
        単位数で加重した正確なGPAを計算できます。
        入力した成績はサーバーに保存されません。
      </p>

      <div className="mt-10">
        <GpaCalculatorClient />
      </div>

      {/* ── 解説：換算方式が大学ごとに違う理由 ───────── */}
      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold text-primary">
          なぜ大学ごとにGPAの計算方法が違うのか
        </h2>
        <p className="mt-4 leading-relaxed text-text-grey">
          GPA（Grade Point Average）は、履修した科目の成績をグレードポイントに換算し、
          単位数で加重平均した指標です。ただし日本の大学では、この「換算」の基準が
          全国で統一されていません。各大学が学則や成績評価に関する規程で独自に定めています。
        </p>
        <p className="mt-4 leading-relaxed text-text-grey">
          違いは主に3点に表れます。第一に、評語の表記（秀・優・良・可／S・A・B・C など）。
          第二に、評語に対応するグレードポイントの値。第三に、素点から直接グレードポイントを
          算出する方式を採る大学が存在すること。さらに、満点が4.0の大学もあれば、それ以外の大学もあります。
        </p>
        <p className="mt-4 leading-relaxed text-text-grey">
          このため、一般的なGPA計算ツールが用いる固定の換算表では、自分の大学の正確なGPAは求められません。
          この計算機が大学の選択を求めているのは、この差を吸収するためです。
        </p>
      </section>

      {/* ── 対応大学と出典 ───────────────────── */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-primary">
          対応している大学と出典
        </h2>
        <p className="mt-4 leading-relaxed text-text-grey">
          以下の大学については、公式サイトに掲載された履修要項・成績評価に関する規程を確認し、
          その内容にもとづいて換算方式を登録しています。出典が確認できなかった大学は
          一覧に含めず、一般的な方式で計算する扱いにしています。
        </p>

        {UNIVERSITIES.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-grey text-left">
                  <th className="py-3 pr-4 font-display text-primary">大学</th>
                  <th className="py-3 pr-4 font-display text-primary">出典</th>
                  <th className="py-3 font-display text-primary">確認日</th>
                </tr>
              </thead>
              <tbody>
                {UNIVERSITIES.map((university) => (
                  <tr key={university.id} className="border-b border-border-grey">
                    <td className="py-3 pr-4 text-primary">{university.name}</td>
                    <td className="py-3 pr-4">
                      <a
                        href={university.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline"
                      >
                        公式資料
                      </a>
                    </td>
                    <td className="py-3 text-text-grey">{university.verifiedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 border-l-4 border-accent bg-neutral-light p-4 text-sm text-text-grey">
            現在、出典を確認済みの大学はありません。一般的な換算方式で計算しています。
          </p>
        )}

        <p className="mt-4 text-xs text-text-grey">
          各大学の制度は改定されることがあります。正確な取り扱いは、必ず所属大学の最新の履修要項をご確認ください。
          学部により方式が異なる大学については、大学を選択した際に注意書きを表示しています。
        </p>
      </section>

      {/* ── FAQ ───────────────────────────── */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-bold text-primary">よくある質問</h2>
        <dl className="mt-6 space-y-6">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question} className="border-l-4 border-primary pl-4">
              <dt className="font-display text-base font-bold text-primary">
                {item.question}
              </dt>
              <dd className="mt-2 leading-relaxed text-text-grey">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── 関連ページ ───────────────────────── */}
      <section className="mt-12 border-t border-border-grey pt-8">
        <h2 className="font-display text-xl font-bold text-primary">関連ページ</h2>
        <ul className="mt-4 space-y-3">
          <li>
            <Link href="/guide/credits" className="text-accent underline">
              単位どうする？履修・GPA・卒業要件で失敗しないための完全ガイド
            </Link>
          </li>
          <li>
            <Link href="/guide/study-abroad" className="text-accent underline">
              留学どうする？交換留学の選び方と出願の進め方
            </Link>
          </li>
          <li>
            <Link href="/guide" className="text-accent underline">
              大学生活ガイド（トップ）
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: 型チェックが通ることを確認する**

```bash
npx tsc --noEmit
```

Expected: 出力されるエラー行に `lib/gpa/` および `app/gpa/` が**1件も含まれない**こと。

このリポジトリには、本タスク以前から `app/events/[id]/page.tsx`・`app/mypage/page.tsx`・`app/schedule/page.tsx`・`components/UpcomingEvents.tsx`・`lib/organizationMembers.ts` に型エラーが9件存在する（`next.config.ts` の `typescript: { ignoreBuildErrors: true }` によりビルドは通る）。これらは既存の債務であり、本プランのスコープ外なので修正しない。`tsc` は非ゼロで終了するのが正常な状態である。判定は exit code ではなく、**自分が触ったファイルがエラー行に出ていないこと**で行う。

- [ ] **Step 3: ビルドが通ることを確認する**

```bash
npm run build
```

Expected: ビルド成功。出力されるルート一覧に `/gpa` が含まれる。

- [ ] **Step 4: 開発サーバーで表示を確認する**

```bash
npm run dev
```

ブラウザで `http://localhost:3000/gpa` を開き、以下を目視で確認する。

1. 大学の選択肢に、Task 1 で「確認済」とした大学が並んでいる
2. 大学を選ぶと、換算方式・出典リンク・確認日が表示される
3. 科目を3行入力して「GPAを計算する」を押すと、GPAが小数第2位まで表示される
4. GPA 3.0以上のとき留学ガイドへのCTA、3.0未満のとき履修ガイドへのCTAが出る
5. 科目を空のまま計算すると「科目を1つ以上入力してください。」が表示される
6. 就活系のリンクがページ上に1つも無い

- [ ] **Step 5: Commit**

```bash
git add app/gpa/page.tsx
git commit -m "feat: /gpa ページ（メタデータ・構造化データ・出典一覧・FAQ）を追加"
```

---

## Task 6: sitemap 登録と内部リンクを敷設する

**Files:**
- Modify: `app/sitemap.ts`
- Modify: `app/guide/credits/page.tsx`
- Modify: `app/guide/page.tsx`
- Modify: `components/Footer.tsx`

**Interfaces:**
- Consumes: `/gpa` ルート（Task 5）
- Produces: なし（本プランの最終タスク）

- [ ] **Step 1: sitemap に `/gpa` を追加する**

`app/sitemap.ts` の `staticPages` 配列内、`/baito/simulator` のエントリの直後に以下を挿入する。

```ts
    {
      url: `${SITE_URL}/gpa`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
```

`priority` を 0.9 とするのは、`/gpa` が本施策の主要な流入獲得ページであり、`/baito`（0.9）と同格に扱うため。

- [ ] **Step 2: `/guide/credits` から内部リンクを張る**

`app/guide/credits/page.tsx` を開き、GPAについて言及している本文セクションを探す。そのセクションの末尾に、以下のリンクブロックを追加する。既存のマークアップのインデントとクラスの付け方に合わせること。

```tsx
        <div className="mt-6 border-l-4 border-primary bg-neutral-light p-4">
          <p className="font-display text-base font-bold text-primary">
            自分のGPAを計算してみる
          </p>
          <p className="mt-2 text-sm text-text-grey">
            大学ごとに異なる換算方式に対応したGPA計算機を用意しています。出典つきで正確に計算できます。
          </p>
          <Link href="/gpa" className="mt-3 inline-block text-sm font-bold text-accent underline">
            GPA計算機を使う
          </Link>
        </div>
```

`Link` は同ファイルで既に `next/link` からインポート済みであることを確認する。未インポートであれば追加する。

- [ ] **Step 3: `/guide` ハブから内部リンクを張る**

`app/guide/page.tsx` を開き、各ガイドページへのカード／リンクが並んでいる箇所を探す。既存カードと**同じマークアップ構造**で `/gpa` へのエントリを追加する。タイトルは「GPA計算機」、説明文は「大学別の換算方式に対応。出典つきで正確にGPAを計算できます。」とする。

既存カードの構造をそのまま流用すること。新しいスタイルを持ち込まない。

- [ ] **Step 4: フッターにリンクを追加する**

`components/Footer.tsx` を開き、ガイド系ページのリンクが並んでいるリストを探す。同じ形式で以下を追加する。

```tsx
              <li>
                <Link href="/gpa">GPA計算機</Link>
              </li>
```

既存の `<li>` のクラス指定に合わせること。

- [ ] **Step 5: ヘッダーナビゲーションに追加していないことを確認する**

```bash
git diff --name-only
```

Expected: 出力に `components/AppShell.tsx` が**含まれない**こと。CLAUDE.md §5 により、ナビゲーションへの新コンテンツページ追加は禁止されている。

- [ ] **Step 6: ビルドとテストが通ることを確認する**

```bash
npm test
npx tsc --noEmit
npm run build
```

3つを個別に実行する（`&&` で繋がない。`tsc` は既存エラーにより非ゼロ終了するため、後続が実行されなくなる）。

Expected:
- `npm test`：全件 PASS
- `npx tsc --noEmit`：エラー行に `lib/gpa/` と `app/gpa/` が1件も含まれない（既存の9件はスコープ外）
- `npm run build`：成功し、ルート一覧に `/gpa` が含まれる

- [ ] **Step 7: 内部リンクの動作を確認する**

```bash
npm run dev
```

以下の遷移を実際にクリックして確認する。

1. `http://localhost:3000/guide/credits` → 「GPA計算機を使う」→ `/gpa` に遷移する
2. `http://localhost:3000/guide` → 追加したカード → `/gpa` に遷移する
3. フッターの「GPA計算機」→ `/gpa` に遷移する
4. ヘッダーナビゲーションに「GPA計算機」が**出ていない**

- [ ] **Step 8: Commit**

```bash
git add app/sitemap.ts app/guide/credits/page.tsx app/guide/page.tsx components/Footer.tsx
git commit -m "feat: /gpa をsitemapに登録し、guide・フッターから内部リンクを敷設"
```

---

## 公開後の運用（本プランのスコープ外・記録用）

実装完了後、以下を別途実施する。プランのタスクには含めない。

1. Google Search Console で `/gpa` のインデックス登録をリクエストする。
2. GA4 で `gpa_calculate` イベントが受信できていることを確認する（公開翌日）。
3. 公開1ヶ月後、`university_tier = 'top'` の比率を集計し、`docs/seo/keyword-facts.md` に追記する。この数値が上位学生ターゲット仮説の判定材料になる。
4. `gpa 計算` の順位を Rank Tracker の追跡KWに追加する。
5. GPA 3.0以上の利用者の `/guide/study-abroad` 遷移率を確認し、第二弾（交換留学）の着手判断に使う。

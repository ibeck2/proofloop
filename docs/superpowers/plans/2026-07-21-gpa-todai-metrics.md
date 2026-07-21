# 東大2指標対応・まとめ入力モード 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/gpa` に東京大学の2指標（基本平均点・成績評価係数）を追加し、あわせて「評語ごとに合計単位数」で入力できるモードを追加する。

**Architecture:** `lib/gpa/` の指標モデルを「評語/素点 → GP(0〜4)」固定から、満点・指標名・重率の有無を方式（`GradeScale`）が宣言する形へ一般化する。計算方式に `raw`（評点をそのまま重率つきで加重平均）を追加し、UIは方式の宣言を読んで入力欄・結果表示・CTAを組み立てる。まとめ入力は純粋関数で `Course[]` を合成して既存の計算関数に渡し、計算側に分岐を持ち込まない。

**Tech Stack:** Next.js 15 (App Router) / TypeScript / Tailwind CSS / react-hook-form / vitest

**設計書:** `docs/superpowers/specs/2026-07-21-gpa-metrics-and-bulk-input-design.md`
**調査記録:** `docs/seo/gpa-university-scales.md`

## Global Constraints

- 絶対URLは必ず `SITE_URL`（`lib/site-url.ts`）を参照する。`https://proofloop.jp` をハードコードしない。
- デザイントークン厳守：`primary` = `#002b5c`、`accent` = `#8B0000`、`text-grey` = `#707070`、`border-grey`、`neutral-light`。独自の配色を導入しない。
- フォント：`font-display`（見出し）、`font-body`（本文）。
- `borderRadius` は全て `0px`（意図的な角丸なしデザイン）。`rounded-*` クラスを新たに使わない。
- **ナビゲーション（ヘッダー）に `/gpa` を追加しない**（CLAUDE.md §5）。
- **就活系のリンク・アフィリエイトを一切設置しない**（CLAUDE.md §5）。
- **新規依存を追加しない。**
- **Supabase のスキーマ変更・テーブル追加を行わない。成績データをサーバーに保存しない。**
- `lib/gpa/` 内部の相互参照は**相対パス**（`./types` 等）。`app/` から `lib/` へは `@/` エイリアス。
- **大学の換算方式は公式資料で裏が取れたもののみ登録する。推測で埋めない。** 出典に記載のない値は計算せず、計算できない旨を返す。
- `University` の `sourceUrl` と `verifiedAt` は必須。
- `npx tsc --noEmit` はこのリポジトリでは**既存の型エラー約9件**（`app/events/[id]/page.tsx`・`app/mypage/page.tsx`・`app/schedule/page.tsx`・`components/UpcomingEvents.tsx`・`lib/organizationMembers.ts`）のため非ゼロ終了する。これらは修正しない。判定は「自分が触ったファイルがエラー行に出ていないこと」で行う。
- 検証コマンドは `&&` で繋がず個別に実行する（`tsc` の非ゼロ終了で後続が動かなくなるため）。

## 設計書からの明確化（実装上の判断）

設計書 §4.1 は `GpaResult` → `MetricResult`、`.gpa` → `.value` の改名を指示しているが、関数名 `calculateGpa` については触れていない。同じ理由（基本平均点の 68.92 を「GPA」と名付けない）が関数名にも当てはまるため、**`calculateGpa` → `calculateMetric` も改名する**。同様に `toGpaBand` → `toValueBand`（引数に `maxValue` を取る）。設計書 §4.2・§4.3 の本文で `calculateGpa` と書かれている箇所は、すべて `calculateMetric` を指す。

---

## File Structure

| ファイル | 種別 | 責務 |
|---|---|---|
| `docs/seo/gpa-university-scales.md` | 変更 | 東大2指標の調査結果と公式計算例の数値表を追記 |
| `lib/gpa/types.ts` | 変更 | 型の一般化（`ScaleMethod`・`CtaPolicy`・`ValueBand`・`MetricResult`・`Course.weight`） |
| `lib/gpa/calculate.ts` | 変更 | `raw` 方式の追加、重率、`calculateMetric` / `toValueBand` |
| `lib/gpa/calculate.test.ts` | 変更 | 改名追従＋`raw`・重率・帯の新規テスト |
| `lib/gpa/scales.ts` | 変更 | 汎用方式に `maxValue` / `metricLabel` を付与 |
| `lib/gpa/universities.ts` | 変更 | 既存15方式の改名追従＋東大2エントリと2方式を追加 |
| `lib/gpa/universities.test.ts` | 変更 | 整合性テストを新フィールドへ拡張 |
| `lib/gpa/todai.test.ts` | 新規 | 東大公式の計算例6件をそのまま回帰テストにする |
| `lib/gpa/bulk.ts` | 新規 | 評語ごとの合計単位数から `Course[]` を合成する純粋関数 |
| `lib/gpa/bulk.test.ts` | 新規 | 合成関数のテスト |
| `app/gpa/ScaleInfoPanel.tsx` | 新規 | 換算方式・出典・注記の表示（純粋な表示コンポーネント） |
| `app/gpa/MetricResultPanel.tsx` | 新規 | 結果表示とCTA（純粋な表示コンポーネント） |
| `app/gpa/GradeTotalsInput.tsx` | 新規 | まとめ入力モードのUI |
| `app/gpa/GpaCalculatorClient.tsx` | 変更 | 状態管理と組み立て。表示は上記3つへ委譲 |
| `app/gpa/page.tsx` | 変更 | 東大に関する本文・FAQの改訂 |

科目行の入力は `useFieldArray` と密結合のため `GpaCalculatorClient.tsx` に残す。表示のみのブロックを切り出すことで、同ファイルは現在の406行から約320行に収まる。

---

## Task 1: 東大2指標の公式資料を調査し記録する

**このタスクにコード実装は含まれない。成果物は調査記録のみ。**

**Files:**
- Modify: `docs/seo/gpa-university-scales.md`

**Interfaces:**
- Consumes: なし
- Produces: Task 3 の `lib/gpa/universities.ts` と `lib/gpa/todai.test.ts` に転記する確定データ。

- [ ] **Step 1: 調査ステータス表に2行を追加する**

`docs/seo/gpa-university-scales.md` の調査ステータス表に、以下2行を追加する（状態は調査後に埋める。`未着手` / `確認済` / `未確認（出典なし）` のいずれかのみ）。

| 大学 | 状態 | 確認日 | 備考 |
|---|---|---|---|
| 東京大学（基本平均点） | 未着手 | – | – |
| 東京大学（成績評価係数） | 未着手 | – | – |

既存の「東京大学 / 未確認（出典なし）」の行はそのまま残し、備考に「全学のGPAは算出されない。代わりに基本平均点・成績評価係数を別行で収録」と追記する。

- [ ] **Step 2: 基本平均点を調査して追記する**

以下の公式資料を起点に調べる。`*.u-tokyo.ac.jp`（`c.u-tokyo.ac.jp`・`zenkyomu.c.u-tokyo.ac.jp` を含む）のみを出典として採用する。まとめサイト・個人ブログ・予備校/就活メディア・他のGPA計算サイトは採用しない。

- https://www.c.u-tokyo.ac.jp/zenki/news/kyoumu/heikinten.pdf （算出式）
- https://zenkyomu.c.u-tokyo.ac.jp/sentaku/heikinten-sample.pdf （科類別の計算例）

「調査結果」セクションに `### 東京大学（基本平均点）` として、既存エントリと同じフォーマットで記録する。以下を必ず埋める。

- **換算方式**：素点をそのまま加重平均する方式（GP換算をしない）
- **算出式**：出典の記載どおりに書く
- **満点**：出典の記載どおり
- **重率**：値の種類（1 / 0.1 / 0）と、それぞれがどういう科目に適用されるか
- **対象範囲**：どのセメスターまでか
- **未履修科目の扱い**：出典の記載どおり
- **学部差**：科類ごとの違いの有無
- **出典URL** と **確認日**（YYYY-MM-DD）
- **原文抜粋**：算出式の該当箇所を引用

- [ ] **Step 3: 公式の計算例を数値表として書き写す**

`heikinten-sample.pdf` に掲載されている科類別の計算例を、`#### 公式計算例（回帰テスト用）` という見出しで**そのまま表に写す**。各例について、科目ごとの `評点` `単位数` `重率` と、最終的な基本平均点の値を記録する。

この表は Task 3 でテストケースに変換する。**ここが不正確だとテストが誤った値を「正しい」と保証してしまう**ため、PDFの表を1行ずつ確認して写すこと。読み取れない行があれば、その計算例ごと採用せず「読み取り不能のため除外」と明記する。

- [ ] **Step 4: 成績評価係数を調査して追記する**

以下を起点に調べる。

- https://www.u-tokyo.ac.jp/content/400125968.xls （成績評価係数計算表：テンプレートと記入例）
- https://www.u-tokyo.ac.jp/adm/go-global/ja/application-tips-USTEP_FAQ （交換留学での扱い）

`### 東京大学（成績評価係数）` として記録する。以下を必ず埋める。

- **算出式**：出典の記載どおり
- **満点**
- **評価ポイント対応表**：4段階・5段階・100点満点それぞれと評価ポイントの対応
- **対象範囲**：どの期間の成績が対象か。大学院生の扱い
- **除外される科目**：合格/不合格の2段階評価など
- **不可（F）の扱い**：**白紙シートの式と記入例シートの注記が矛盾している。両方を引用し、矛盾している事実を明記する。** どちらかを正しいものとして選ばない
- **出典URL** と **確認日**、**原文抜粋**

- [ ] **Step 5: ステータス表を更新する**

追加した2行の状態と確認日を埋める。`未着手` が残っていないことを確認する。

**どちらかが `未確認（出典なし）` になった場合は、その時点で報告する。** 対応可能な指標だけで進めるか判断が要るため。

- [ ] **Step 6: Commit**

```bash
git add docs/seo/gpa-university-scales.md
git commit -m "docs: 東大の基本平均点・成績評価係数の調査記録を追加"
```

---

## Task 2: 指標モデルを一般化する

**Files:**
- Modify: `lib/gpa/types.ts`
- Modify: `lib/gpa/calculate.ts`
- Modify: `lib/gpa/calculate.test.ts`
- Modify: `lib/gpa/scales.ts`
- Modify: `lib/gpa/universities.ts`（機械的な改名と `metricLabel` の付与のみ）
- Modify: `app/gpa/GpaCalculatorClient.tsx`（機械的な改名追従のみ）

**Interfaces:**
- Consumes: なし
- Produces:
  - `lib/gpa/types.ts`：`ScaleMethod`, `CtaPolicy`, `ValueBand`, `GradeOption`, `GradeScale`, `University`, `Course`, `MetricResult`
  - `lib/gpa/calculate.ts`：
    - `calculateMetric(input: { courses: Course[]; scale: GradeScale }): CalculateOutput`
    - `CalculateOutput = { ok: true; result: MetricResult } | { ok: false; reason: CalculateErrorReason; courseId?: string }`
    - `CalculateErrorReason = "no_courses" | "zero_credits" | "invalid_credits" | "invalid_grade" | "invalid_score" | "invalid_weight"`
    - `toValueBand(value: number, maxValue: number): ValueBand`
  - `lib/gpa/scales.ts`：`GENERIC_SCALES`, `DEFAULT_SCALE_ID`（変更なし）

- [ ] **Step 1: `lib/gpa/types.ts` を書き換える**

ファイル全体を以下に置き換える。

```ts
/** 成績評語1つと、それに対応するグレードポイント */
export type GradeOption = {
  /** 表示ラベル。例: "秀", "A", "優" */
  label: string;
  /** グレードポイント。例: 4 */
  point: number;
};

/** 指標の計算方式 */
export type ScaleMethod =
  /** 評語 → グレードポイント */
  | "grade"
  /** 素点 → グレードポイント */
  | "score"
  /** 評点をそのまま加重平均する（グレードポイントへの換算をしない） */
  | "raw";

/** 結果パネルでどのCTAを出すか */
export type CtaPolicy =
  /** 値が3.0以上なら留学、未満なら履修設計（従来のGPA向け挙動） */
  | "gpa-threshold"
  /** 値によらず留学ガイドへ */
  | "always-study-abroad"
  /** 値によらず履修ガイドへ */
  | "always-credits";

/** GA4送信に使う、満点に対する比率の帯 */
export type ValueBand =
  | "0-50%"
  | "50-62%"
  | "62-75%"
  | "75-87%"
  | "87-100%";

/** 成績評価の換算方式 */
export type GradeScale = {
  id: string;
  /** UIに表示する方式名 */
  label: string;
  method: ScaleMethod;
  /** method === 'grade' のとき必須。表示順は配列順 */
  grades?: GradeOption[];
  /**
   * method === 'score' のとき必須。素点(0-100)からGPを返す。
   * 出典の対応表がその素点区間を定義していない場合は `null` を返すこと
   * （下位の区分に丸めて数値を捏造してはならない）。
   */
  scoreToPoint?: (score: number) => number | null;
  /** この方式の満点。GPAなら4や4.3、成績評価係数なら3、基本平均点なら100 */
  maxValue: number;
  /** 画面に出す指標名。"GPA" / "基本平均点" / "成績評価係数" */
  metricLabel: string;
  /** 値に付ける単位。基本平均点なら "点"。省略時は付けない */
  unitSuffix?: string;
  /** 重率の入力欄を出すか。基本平均点のみ true */
  usesWeight?: boolean;
  /** 「不可を計算から除外する」の切替を出す場合の設定 */
  failExclusionToggle?: {
    /** 除外対象とする評語のラベル */
    failLabels: string[];
    /** チェックボックスの脇に表示する説明 */
    note: string;
  };
  /** 結果パネルのCTA方針。省略時は "gpa-threshold" */
  ctaPolicy?: CtaPolicy;
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
  /** 計測用の区分。'top' = 調査対象の上位校 / 'other' = それ以外 */
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
  /** method === 'score' のとき使用。0-100。method === 'raw' では評点として使う */
  score?: number;
  /** 重率。usesWeight の方式でのみ使う。省略時は 1 として扱う */
  weight?: number;
};

/** 計算結果 */
export type MetricResult = {
  /** 小数第2位まで四捨五入した指標値 */
  value: number;
  /** 分母に実際に寄与した科目の素の単位数の合計（重率を掛ける前の値） */
  totalCredits: number;
  /** 分母に実際に寄与した科目数 */
  countedCourses: number;
};
```

- [ ] **Step 2: 失敗するテストを書く**

`lib/gpa/calculate.test.ts` の先頭のインポートを以下に置き換え、既存のテスト本文中の `calculateGpa` を `calculateMetric` に、`out.result.gpa` を `out.result.value` に、`toGpaBand` を使う `describe` ブロック全体を後述の新しいものに置き換える。既存のテストケースの入力値と期待値は変更しない。

```ts
import { describe, expect, it } from "vitest";
import { calculateMetric, toValueBand } from "./calculate";
import { GENERIC_SCALES } from "./scales";
import type { GradeScale } from "./types";
```

`toGpaBand` の `describe` ブロックを削除し、末尾に以下を追加する。

```ts
/** 重率つき素点方式のテスト専用スケール（実在の大学の方式ではない） */
const testRawScale: GradeScale = {
  id: "test-raw",
  label: "テスト用素点そのまま平均",
  method: "raw",
  maxValue: 100,
  metricLabel: "テスト平均点",
  unitSuffix: "点",
  usesWeight: true,
};

describe("calculateMetric / raw方式", () => {
  it("評点を単位数で加重平均する（重率はすべて1）", () => {
    // (80*2 + 60*2) / 4 = 70
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 80, weight: 1 },
        { id: "2", name: "B", credits: 2, score: 60, weight: 1 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(70);
    expect(out.result.totalCredits).toBe(4);
    expect(out.result.countedCourses).toBe(2);
  });

  it("重率0.1の科目は影響が小さくなる", () => {
    // (90*2*1 + 50*2*0.1) / (2*1 + 2*0.1) = (180 + 10) / 2.2 = 86.36...
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 90, weight: 1 },
        { id: "2", name: "B", credits: 2, score: 50, weight: 0.1 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(86.36);
  });

  it("重率0の科目は計算からも科目数からも除外される", () => {
    // 重率0のBは無視され、Aだけの平均 = 90
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 90, weight: 1 },
        { id: "2", name: "B", credits: 4, score: 10, weight: 0 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(90);
    expect(out.result.totalCredits).toBe(2);
    expect(out.result.countedCourses).toBe(1);
  });

  it("重率0の科目は評点が未入力でもエラーにならない", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [
        { id: "1", name: "A", credits: 2, score: 90, weight: 1 },
        { id: "2", name: "B", credits: 4, weight: 0 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(90);
  });

  it("重率が 1 / 0.1 / 0 以外ならエラーを返す", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "c1", name: "A", credits: 2, score: 90, weight: 0.5 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_weight", courseId: "c1" });
  });

  it("重率を省略した科目は重率1として扱う", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "1", name: "A", credits: 2, score: 90 }],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(90);
  });

  it("評点が0-100の範囲外ならエラーを返す", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "c2", name: "A", credits: 2, score: 120, weight: 1 }],
    });
    expect(out).toEqual({ ok: false, reason: "invalid_score", courseId: "c2" });
  });

  it("重率をすべて0にすると分母が0になりエラーを返す", () => {
    const out = calculateMetric({
      scale: testRawScale,
      courses: [{ id: "1", name: "A", credits: 2, score: 90, weight: 0 }],
    });
    expect(out).toEqual({ ok: false, reason: "zero_credits" });
  });
});

describe("重率は usesWeight の方式でのみ読まれる", () => {
  it("評語方式では weight が指定されていても無視される", () => {
    // 秀(4)×2 + 良(2)×2 = 12 / 4 = 3 。weight 0.1 は読まれない
    const out = calculateMetric({
      scale: gradeScale,
      courses: [
        { id: "1", name: "A", credits: 2, grade: "秀", weight: 0.1 },
        { id: "2", name: "B", credits: 2, grade: "良", weight: 0.1 },
      ],
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(3);
  });
});

describe("toValueBand", () => {
  it("満点4.0のGPAで従来の境界と同じ帯になる", () => {
    expect(toValueBand(1.99, 4)).toBe("0-50%");
    expect(toValueBand(2.0, 4)).toBe("50-62%");
    expect(toValueBand(2.49, 4)).toBe("50-62%");
    expect(toValueBand(2.5, 4)).toBe("62-75%");
    expect(toValueBand(2.99, 4)).toBe("62-75%");
    expect(toValueBand(3.0, 4)).toBe("75-87%");
    expect(toValueBand(3.49, 4)).toBe("75-87%");
    expect(toValueBand(3.5, 4)).toBe("87-100%");
    expect(toValueBand(4.0, 4)).toBe("87-100%");
  });

  it("満点100の指標でも同じ比率で区切られる", () => {
    expect(toValueBand(49, 100)).toBe("0-50%");
    expect(toValueBand(50, 100)).toBe("50-62%");
    expect(toValueBand(75, 100)).toBe("75-87%");
    expect(toValueBand(100, 100)).toBe("87-100%");
  });

  it("満点3の指標でも同じ比率で区切られる", () => {
    expect(toValueBand(1.49, 3)).toBe("0-50%");
    expect(toValueBand(2.25, 3)).toBe("75-87%");
    expect(toValueBand(3.0, 3)).toBe("87-100%");
  });
});
```

- [ ] **Step 3: テストが失敗することを確認する**

```bash
npm test
```

Expected: FAIL。`calculateMetric is not a function` または `does not provide an export named 'calculateMetric'` 相当のエラーになる。

- [ ] **Step 4: `lib/gpa/calculate.ts` を書き換える**

ファイル全体を以下に置き換える。

```ts
import type { Course, GradeScale, MetricResult, ValueBand } from "./types";

export type CalculateErrorReason =
  | "no_courses"
  | "zero_credits"
  | "invalid_credits"
  | "invalid_grade"
  | "invalid_score"
  | "invalid_weight";

export type CalculateOutput =
  | { ok: true; result: MetricResult }
  | { ok: false; reason: CalculateErrorReason; courseId?: string };

/** 重率として認める値 */
const ALLOWED_WEIGHTS = [1, 0.1, 0];

/**
 * 小数第2位まで四捨五入する。
 *
 * 単純な `Math.round(value * 100) / 100` は使えない。GPと単位数から作られる商は
 * 23/40 = 0.575 や 8.7/4 = 2.175 のような「ちょうど .xx5」になりうるが、
 * これらは二進浮動小数点で正確に表現できず、100倍すると 57.4999... /
 * 217.4999... となって切り下がってしまう。
 *
 * Number.EPSILON は 1.0 の ulp なので、2以上の値では丸め誤差に飲まれて効かない
 * （実際 2.175 が 2.17 になる）。GPAの桁で確実に効き、かつ本物の境界間隔より
 * 十分小さい絶対値でずらす。
 */
function roundTo2(value: number): number {
  return Math.round(value * 100 + 1e-9) / 100;
}

/**
 * 科目1件の「分子に使う値」を求める。
 * grade / score 方式ではグレードポイント、raw 方式では評点そのもの。
 * 換算できない場合は null を返す（呼び出し側でエラー種別を判定する）。
 */
function resolveValue(course: Course, scale: GradeScale): number | null {
  if (scale.method === "grade") {
    if (!course.grade) return null;
    const found = scale.grades?.find((g) => g.label === course.grade);
    return found ? found.point : null;
  }

  const score = course.score;
  if (score === undefined || !Number.isFinite(score)) return null;
  if (score < 0 || score > 100) return null;

  // raw 方式は換算せず評点をそのまま使う
  if (scale.method === "raw") return score;

  if (!scale.scoreToPoint) return null;
  return scale.scoreToPoint(score);
}

/**
 * 指標値 = Σ(値 × 単位数 × 重率) ÷ Σ(単位数 × 重率)
 *
 * - 重率は `usesWeight` の方式でのみ読む。それ以外の方式では常に1として扱うため、
 *   従来のGPA計算の挙動は変わらない。
 * - 重率0の科目は分子にも分母にも寄与しないため、評点・評語の検証を行わず、
 *   科目数・単位数の集計からも除外する。「算入科目3科目」と表示しながら
 *   実際は2科目分しか計算していない、という食い違いを作らないため。
 * - 不可（GP=0）の科目は分母の単位数に算入する。
 */
export function calculateMetric(input: {
  courses: Course[];
  scale: GradeScale;
}): CalculateOutput {
  const { courses, scale } = input;

  if (courses.length === 0) {
    return { ok: false, reason: "no_courses" };
  }

  let weightedSum = 0;
  let weightedCredits = 0;
  let totalCredits = 0;
  let countedCourses = 0;

  for (const course of courses) {
    if (!Number.isFinite(course.credits) || course.credits < 0) {
      return { ok: false, reason: "invalid_credits", courseId: course.id };
    }

    const weight = scale.usesWeight ? course.weight ?? 1 : 1;
    if (scale.usesWeight && !ALLOWED_WEIGHTS.includes(weight)) {
      return { ok: false, reason: "invalid_weight", courseId: course.id };
    }

    // 重率0の科目は何にも寄与しないので、値の検証もせずに飛ばす
    if (weight === 0) continue;

    const value = resolveValue(course, scale);
    if (value === null) {
      return {
        ok: false,
        reason: scale.method === "grade" ? "invalid_grade" : "invalid_score",
        courseId: course.id,
      };
    }

    const contribution = course.credits * weight;
    if (contribution === 0) continue;

    weightedSum += value * contribution;
    weightedCredits += contribution;
    totalCredits += course.credits;
    countedCourses += 1;
  }

  if (weightedCredits === 0) {
    return { ok: false, reason: "zero_credits" };
  }

  return {
    ok: true,
    result: {
      value: roundTo2(weightedSum / weightedCredits),
      totalCredits,
      countedCourses,
    },
  };
}

/**
 * GA4送信に使う、満点に対する比率の帯を返す。
 *
 * 満点が指標ごとに異なる（GPA 4.0/4.3、成績評価係数 3、基本平均点 100）ため、
 * 絶対値ではなく比率で区切る。境界は従来のGPA帯（4.0満点で 2.0 / 2.5 / 3.0 / 3.5）を
 * 比率に直したものなので、通常のGPAでは従来と同じ分布が得られる。
 */
export function toValueBand(value: number, maxValue: number): ValueBand {
  const ratio = maxValue > 0 ? value / maxValue : 0;
  if (ratio < 0.5) return "0-50%";
  if (ratio < 0.625) return "50-62%";
  if (ratio < 0.75) return "62-75%";
  if (ratio < 0.875) return "75-87%";
  return "87-100%";
}
```

- [ ] **Step 5: `lib/gpa/scales.ts` に新フィールドを付与する**

`GENERIC_SCALES` の2要素それぞれについて、`maxGpa: 4,` を以下2行に置き換える。他の行は変更しない。

```ts
    maxValue: 4,
    metricLabel: "GPA",
```

- [ ] **Step 6: `lib/gpa/universities.ts` の改名に追従する**

`UNIVERSITY_SCALES` 内のすべての方式について、`maxGpa: <値>,` を以下2行に置き換える（`<値>` はそのまま維持する）。

```ts
    maxValue: <値>,
    metricLabel: "GPA",
```

大学データ（`UNIVERSITIES`）と、方式の `grades` / `scoreToPoint` / `note` は**一切変更しない**。東大の追加は Task 3 で行う。

- [ ] **Step 7: `app/gpa/GpaCalculatorClient.tsx` の改名に追従する**

以下を機械的に置換する。**それ以外の変更を加えない**（新機能は Task 5・6 で追加する）。

- `import { calculateGpa, toGpaBand } from "@/lib/gpa/calculate";` → `import { calculateMetric, toValueBand } from "@/lib/gpa/calculate";`
- `import type { Course, GpaResult, GradeScale } from "@/lib/gpa/types";` → `import type { Course, MetricResult, GradeScale } from "@/lib/gpa/types";`
- `calculateGpa({` → `calculateMetric({`
- `GpaResult` 型注釈 → `MetricResult`
- `result.gpa` → `result.value`
- `toGpaBand(output.result.gpa)` → `toValueBand(output.result.value, scale.maxValue)`
- `maxGpa={scale.maxGpa}` → `maxValue={scale.maxValue}`、`GpaResultPanel` の props とその本体の `maxGpa` も `maxValue` に改名
- `gpa_band: toGpaBand(...)` の送信は `value_band` ではなく **`gpa_band` のまま**にしておく（GA4パラメータの変更は Task 5 で行う）

- [ ] **Step 8: テストが通ることを確認する**

```bash
npm test
```

Expected: PASS。既存29件＋新規12件＝41件がすべて green。

- [ ] **Step 9: 型チェックする**

```bash
npx tsc --noEmit
```

Expected: エラー行に `lib/gpa/` と `app/gpa/` が1件も含まれないこと。

- [ ] **Step 10: Commit**

```bash
git add lib/gpa/types.ts lib/gpa/calculate.ts lib/gpa/calculate.test.ts lib/gpa/scales.ts lib/gpa/universities.ts app/gpa/GpaCalculatorClient.tsx
git commit -m "refactor: 指標モデルを一般化し raw方式と重率に対応"
```

---

## Task 3: 東大2エントリを追加し、公式計算例で検証する

**Files:**
- Modify: `lib/gpa/universities.ts`
- Modify: `lib/gpa/universities.test.ts`
- Create: `lib/gpa/todai.test.ts`

**Interfaces:**
- Consumes: `lib/gpa/types.ts` の `GradeScale` / `University`、`lib/gpa/calculate.ts` の `calculateMetric`、`docs/seo/gpa-university-scales.md`（Task 1 の調査結果）
- Produces: `UNIVERSITIES` に `u-tokyo-basic-average` と `u-tokyo-grade-coefficient` の2エントリ、`UNIVERSITY_SCALES` に対応する2方式

- [ ] **Step 1: 2つの方式を `UNIVERSITY_SCALES` に追加する**

`docs/seo/gpa-university-scales.md` の調査結果から転記する。**推測で値を埋めない。** 骨格は以下のとおり。`/* 調査結果を転記 */` の箇所を実際の値で置き換える。

```ts
  {
    id: "u-tokyo-basic-average-scale",
    label: "東京大学の基本平均点（評点をそのまま加重平均）",
    method: "raw",
    maxValue: 100,
    metricLabel: "基本平均点",
    unitSuffix: "点",
    usesWeight: true,
    ctaPolicy: "always-credits",
    note: /* 調査結果を転記：対象範囲（前期課程まで）、重率の意味と選び方、
             未履修科目の扱い、指定平均点には未対応である旨 */,
  },
  {
    id: "u-tokyo-grade-coefficient-scale",
    label: "東京大学の成績評価係数（4段階）",
    method: "grade",
    grades: [
      /* 調査結果を転記：評語ラベルと評価ポイントの対応 */
    ],
    maxValue: 3,
    metricLabel: "成績評価係数",
    ctaPolicy: "always-study-abroad",
    failExclusionToggle: {
      failLabels: [/* 調査結果を転記：不可に相当する評語ラベル */],
      note: /* 調査結果を転記：公式資料内で記載が矛盾している事実と、
               提出先の指示を確認すべき旨 */,
    },
    note: /* 調査結果を転記：対象範囲（全学期・大学院は通算）、
             合格/不合格科目の除外、5段階評価では上位2段が同じポイントになること */,
  },
```

- [ ] **Step 2: 2つの大学エントリを `UNIVERSITIES` に追加する**

```ts
  {
    id: "u-tokyo-basic-average",
    name: "東京大学（基本平均点・進学選択用）",
    shortName: "東大（基本平均点）",
    tier: "top",
    scaleId: "u-tokyo-basic-average-scale",
    sourceUrl: /* 調査結果の出典URL */,
    verifiedAt: /* 調査結果の確認日 YYYY-MM-DD */,
    note: /* 調査結果を転記：どの指標をどの用途で使うかの案内 */,
  },
  {
    id: "u-tokyo-grade-coefficient",
    name: "東京大学（成績評価係数・奨学金／交換留学用）",
    shortName: "東大（成績評価係数）",
    tier: "top",
    scaleId: "u-tokyo-grade-coefficient-scale",
    sourceUrl: /* 調査結果の出典URL */,
    verifiedAt: /* 調査結果の確認日 YYYY-MM-DD */,
    note: /* 調査結果を転記 */,
  },
```

配置は既存の並び（東京一科 → 旧帝 → 早慶上智ICU）に合わせ、京都大学の前に置く。

- [ ] **Step 3: 公式計算例の回帰テストを書く**

`lib/gpa/todai.test.ts` を新規作成する。`docs/seo/gpa-university-scales.md` の「公式計算例（回帰テスト用）」の表を、1例につき1つの `it` として写す。

```ts
import { describe, expect, it } from "vitest";
import { calculateMetric } from "./calculate";
import { findScaleById } from "./universities";
import type { Course } from "./types";

/**
 * 東京大学が公式に公開している基本平均点の計算例を、そのまま回帰テストにする。
 * 出典と各例の数値は docs/seo/gpa-university-scales.md の
 * 「公式計算例（回帰テスト用）」を参照。
 * これが通ることで、重率つき加重平均の実装が公式の計算と一致することを保証する。
 */
describe("東京大学 基本平均点：公式計算例との一致", () => {
  const scale = findScaleById("u-tokyo-basic-average-scale");

  it("方式がマスタに登録されている", () => {
    expect(scale).toBeDefined();
  });

  /* 調査記録の計算例ごとに、以下の形の it を作る。
     courses には PDF の表の各行（評点・単位数・重率）をそのまま写す。
     expected には PDF に記載された基本平均点の値をそのまま書く。 */
  it("計算例1（科類名を転記）", () => {
    const courses: Course[] = [
      /* 例：{ id: "1", name: "科目名", credits: 2, score: 74, weight: 1 }, */
    ];
    const out = calculateMetric({ courses, scale: scale! });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.value).toBe(/* PDFに記載された値 */);
  });
});
```

**注意**：`docs/seo/gpa-university-scales.md` で「読み取り不能のため除外」とした計算例は、テストにも入れない。写せた例だけをテストにする。

- [ ] **Step 4: テストが失敗することを確認する**

Step 1・2 を先に完了している場合、この時点で計算例テストが通る可能性がある。その場合は**重率の扱いを意図的に壊して失敗を確認する**：`lib/gpa/calculate.ts` の `const weight = scale.usesWeight ? course.weight ?? 1 : 1;` を一時的に `const weight = 1;` に変え、

```bash
npm test
```

Expected: FAIL。計算例テストが公式の値と一致しなくなる。確認後、**必ず元に戻す**。

これを行う理由：重率を無視しても偶然一致するような計算例をテストにしていないことを確かめるため。

- [ ] **Step 5: 整合性テストを拡張する**

`lib/gpa/universities.test.ts` の `describe("換算方式マスタ", ...)` に以下を追加する。

```ts
  it("すべての方式が maxValue と metricLabel を持つ", () => {
    for (const scale of ALL_SCALES) {
      expect(
        typeof scale.maxValue === "number" && scale.maxValue > 0,
        `${scale.id} の maxValue が不正です`
      ).toBe(true);
      expect(
        typeof scale.metricLabel === "string" && scale.metricLabel.length > 0,
        `${scale.id} の metricLabel が空です`
      ).toBe(true);
    }
  });

  it("重率を使う方式は raw 方式である", () => {
    for (const scale of ALL_SCALES) {
      if (scale.usesWeight) {
        expect(scale.method, `${scale.id} は usesWeight だが raw ではありません`).toBe(
          "raw"
        );
      }
    }
  });

  it("raw 方式は grades も scoreToPoint も持たない", () => {
    for (const scale of ALL_SCALES) {
      if (scale.method === "raw") {
        expect(scale.grades, `${scale.id} は raw なのに grades を持っています`).toBeUndefined();
        expect(
          scale.scoreToPoint,
          `${scale.id} は raw なのに scoreToPoint を持っています`
        ).toBeUndefined();
      }
    }
  });

  it("failExclusionToggle の failLabels は実在する評語を指している", () => {
    for (const scale of ALL_SCALES) {
      const toggle = scale.failExclusionToggle;
      if (!toggle) continue;
      expect(toggle.failLabels.length).toBeGreaterThan(0);
      for (const label of toggle.failLabels) {
        const found = scale.grades?.some((g) => g.label === label);
        expect(found, `${scale.id} の failLabels "${label}" が grades にありません`).toBe(
          true
        );
      }
    }
  });
```

- [ ] **Step 6: テストが通ることを確認する**

```bash
npm test
```

Expected: PASS。Task 2 の41件＋整合性テスト4件＋計算例テストがすべて green。

- [ ] **Step 7: 型チェックする**

```bash
npx tsc --noEmit
```

Expected: エラー行に `lib/gpa/` が1件も含まれないこと。

- [ ] **Step 8: Commit**

```bash
git add lib/gpa/universities.ts lib/gpa/universities.test.ts lib/gpa/todai.test.ts
git commit -m "feat: 東大の基本平均点・成績評価係数を追加し公式計算例で検証"
```

---

## Task 4: 表示コンポーネントを切り出す（挙動変更なし）

このタスクは**純粋なリファクタリング**である。画面の見た目・文言・挙動を一切変えない。

**Files:**
- Create: `app/gpa/ScaleInfoPanel.tsx`
- Create: `app/gpa/MetricResultPanel.tsx`
- Modify: `app/gpa/GpaCalculatorClient.tsx`

**Interfaces:**
- Consumes: `lib/gpa/types.ts` の `GradeScale` / `University` / `MetricResult`、`lib/gpa/calculate.ts` の `toValueBand`
- Produces:
  - `ScaleInfoPanel`（デフォルトエクスポート）props: `{ scale: GradeScale; university?: University }`
  - `MetricResultPanel`（デフォルトエクスポート）props: `{ result: MetricResult; scale: GradeScale }`

- [ ] **Step 1: `app/gpa/ScaleInfoPanel.tsx` を作る**

`GpaCalculatorClient.tsx` の「換算方式と出典の表示。競合ツールにない差別化点」というコメントが付いた `<div className="mt-3 border-l-4 border-primary bg-neutral-light p-3 ...">` ブロック（大学選択の `<select>` の直後）を、**JSXをそのまま**新ファイルへ移す。

```tsx
import type { GradeScale, University } from "@/lib/gpa/types";

/**
 * 選択中の換算方式と、その出典・確認日・注記を表示する。
 * 出典と確認日の明示はこのツールの差別化の核なので、省略しないこと。
 */
export default function ScaleInfoPanel({
  scale,
  university,
}: {
  scale: GradeScale;
  university?: University;
}) {
  // ここに移動した JSX をそのまま貼る。
  // 元の JSX 内の `scale` と `university` はそのまま props を参照する。
}
```

移動元のブロックは削除し、`<ScaleInfoPanel scale={scale} university={university} />` に置き換える。

- [ ] **Step 2: `app/gpa/MetricResultPanel.tsx` を作る**

`GpaCalculatorClient.tsx` の末尾にある `function GpaResultPanel({ result, maxValue }: ...)` 関数全体を新ファイルへ移し、デフォルトエクスポートにする。props を `{ result: MetricResult; scale: GradeScale }` に変え、本体で `maxValue` を参照している箇所を `scale.maxValue` に読み替える。

```tsx
import Link from "next/link";
import { toValueBand } from "@/lib/gpa/calculate";
import type { GradeScale, MetricResult } from "@/lib/gpa/types";

export default function MetricResultPanel({
  result,
  scale,
}: {
  result: MetricResult;
  scale: GradeScale;
}) {
  // 移動した本体をそのまま貼る。
  // `maxValue` → `scale.maxValue` に読み替える。
  // CTA の分岐条件は現時点では変更しない（Task 5 で ctaPolicy に置き換える）。
}
```

呼び出し側は `<MetricResultPanel result={result} scale={scale} />` にする。`GpaCalculatorClient.tsx` から `GpaResultPanel` の定義と、そこだけで使っていた `Link` などのインポートを削除する。

- [ ] **Step 3: 型チェックする**

```bash
npx tsc --noEmit
```

Expected: エラー行に `app/gpa/` が1件も含まれないこと。

- [ ] **Step 4: lint する**

```bash
npm run lint
```

Expected: `app/gpa/` に起因するエラーが0件。

- [ ] **Step 5: テストが通ることを確認する**

```bash
npm test
```

Expected: PASS（`lib/` を触っていないので件数は Task 3 と同じ）。

- [ ] **Step 6: 画面が変わっていないことを確認する**

```bash
npm run dev
```

`http://localhost:3000/gpa` を開き、以下を目視で確認する。**このタスクは見た目を変えないので、変化があれば移動を誤っている。**

1. 大学を選ぶと換算方式・注記・出典リンク・確認日が従来どおり表示される
2. 科目を入力して計算すると結果パネルが従来どおり表示される
3. GPA 3.0以上で留学CTA、未満で履修CTAという分岐が従来どおり

確認後、開発サーバーを停止する。

- [ ] **Step 7: Commit**

```bash
git add app/gpa/ScaleInfoPanel.tsx app/gpa/MetricResultPanel.tsx app/gpa/GpaCalculatorClient.tsx
git commit -m "refactor: /gpa の表示ブロックをコンポーネントへ切り出し"
```

---

## Task 5: 重率入力・不可除外・結果パネルの一般化・CTA方針・GA4

**Files:**
- Modify: `app/gpa/GpaCalculatorClient.tsx`
- Modify: `app/gpa/MetricResultPanel.tsx`

**Interfaces:**
- Consumes: Task 2〜4 の成果物すべて
- Produces: なし（UIの完成）

- [ ] **Step 1: 結果パネルを指標名・満点・単位から組み立てる**

`app/gpa/MetricResultPanel.tsx` の見出しと数値表示を、固定文字列から `scale` の宣言を読む形へ変える。

```tsx
      <p className="font-display text-sm font-bold text-text-grey">
        あなたの{scale.metricLabel}
      </p>
      <p className="mt-2 font-display text-5xl font-bold text-primary">
        {result.value.toFixed(2)}
        {scale.unitSuffix ?? ""}
        <span className="ml-2 text-lg text-text-grey">
          / {scale.maxValue.toFixed(scale.maxValue >= 100 ? 0 : 1)}
          {scale.unitSuffix ?? ""}
        </span>
      </p>
```

表示例：GPA は「2.65 / 4.3」、基本平均点は「68.92点 / 100点」、成績評価係数は「2.40 / 3.0」。

- [ ] **Step 2: CTAを `ctaPolicy` で分岐させる**

`MetricResultPanel.tsx` の CTA 分岐条件を、値の絶対比較から方針の判定へ置き換える。

```tsx
  const policy = scale.ctaPolicy ?? "gpa-threshold";
  const showStudyAbroad =
    policy === "always-study-abroad" ||
    (policy === "gpa-threshold" && result.value >= 3.0);
```

`showStudyAbroad` が true なら従来の留学CTAブロック、false なら従来の履修CTAブロックを表示する。**CTAブロックの文言とリンク先は変更しない。** 就活系のリンクは引き続き設置しない。

- [ ] **Step 3: 重率のセレクトを科目行に追加する**

`GpaCalculatorClient.tsx` の `CourseField` 型に `weight` を追加し、`EMPTY_COURSE` に `weight: "1"` を加える。

```ts
type CourseField = {
  name: string;
  credits: string;
  grade: string;
  score: string;
  weight: string;
};

const EMPTY_COURSE: CourseField = {
  name: "",
  credits: "",
  grade: "",
  score: "",
  weight: "1",
};
```

科目行の `<div className="flex flex-wrap items-end gap-2">` 内、成績／素点の入力の直後に以下を追加する。`scale.usesWeight` のときだけ表示する。

```tsx
                {scale.usesWeight ? (
                  <div className="w-28">
                    <label
                      htmlFor={`${fieldIdPrefix}-course-${index}-weight`}
                      className="block text-xs text-text-grey"
                    >
                      重率
                    </label>
                    <select
                      id={`${fieldIdPrefix}-course-${index}-weight`}
                      {...register(`courses.${index}.weight`)}
                      className="mt-1 w-full border border-border-grey bg-white p-2 text-primary"
                    >
                      <option value="1">1</option>
                      <option value="0.1">0.1</option>
                      <option value="0">0（対象外）</option>
                    </select>
                  </div>
                ) : null}
```

`onSubmit` の `courses` を組み立てる `.map` に重率を渡す。

```ts
        weight: scale.usesWeight ? toNumber(c.weight) : undefined,
```

- [ ] **Step 4: 重率エラーのメッセージを追加する**

`errorMessage` の `switch` に以下の `case` を追加する。

```ts
    case "invalid_weight":
      return "重率は 1・0.1・0 のいずれかを選んでください。";
```

- [ ] **Step 5: 不可除外のチェックボックスを追加する**

`GpaCalculatorClient.tsx` に状態を追加する。

```ts
  const [excludeFail, setExcludeFail] = useState(false);
```

大学を切り替えたときに結果をクリアしている `useEffect` に、この状態のリセットも加える。

```ts
  useEffect(() => {
    setResult(null);
    setFormError(null);
    setExcludeFail(false);
  }, [universityId]);
```

科目入力の下、「＋ 科目を追加」ボタンの直後に以下を追加する。

```tsx
          {scale.failExclusionToggle ? (
            <div className="mt-4 border-l-4 border-primary bg-neutral-light p-3">
              <label className="flex items-start gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  checked={excludeFail}
                  onChange={(e) => setExcludeFail(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-bold">
                    不可（{scale.failExclusionToggle.failLabels.join("・")}）の科目を計算から除外する
                  </span>
                  <span className="mt-1 block text-xs text-text-grey">
                    {scale.failExclusionToggle.note}
                  </span>
                </span>
              </label>
            </div>
          ) : null}
```

`onSubmit` で、`calculateMetric` に渡す直前に対象科目を除外する。

```ts
    const failLabels = scale.failExclusionToggle?.failLabels ?? [];
    const targetCourses =
      excludeFail && failLabels.length > 0
        ? courses.filter((c) => !(c.grade && failLabels.includes(c.grade)))
        : courses;

    const output = calculateMetric({ courses: targetCourses, scale });
```

以降の `errorMessage(output, ...)` にも `targetCourses` を渡す。

- [ ] **Step 6: GA4パラメータを更新する**

`trackCalculate` の型と本体を以下に変える。

```ts
function trackCalculate(params: {
  university_id: string;
  university_tier: string;
  metric_id: string;
  value_band: string;
  course_count: number;
  input_mode: string;
}) {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "gpa_calculate", params);
}
```

呼び出し側を以下に変える。`input_mode` は現時点では常に `"per-course"` を渡す（Task 6 で実際のモードを渡すよう変更する）。

```ts
    trackCalculate({
      university_id: university ? university.id : OTHER_UNIVERSITY,
      university_tier: university ? university.tier : "unset",
      metric_id: scale.id,
      value_band: toValueBand(output.result.value, scale.maxValue),
      course_count: output.result.countedCourses,
      input_mode: "per-course",
    });
```

**評点・評語・素点そのものは送信しない。**

- [ ] **Step 7: 型チェックと lint**

```bash
npx tsc --noEmit
```
Expected: エラー行に `app/gpa/` が1件も含まれないこと。

```bash
npm run lint
```
Expected: `app/gpa/` に起因するエラーが0件。

- [ ] **Step 8: 画面で確認する**

```bash
npm run dev
```

`http://localhost:3000/gpa` で以下を確認する。

1. 「東京大学（基本平均点・進学選択用）」を選ぶと、科目行に**重率のセレクトが出る**。結果は「あなたの基本平均点」「◯◯.◯◯点 / 100点」と表示される
2. 重率を0にした科目が結果の「算入科目」「合計単位」に含まれない
3. 「東京大学（成績評価係数・奨学金／交換留学用）」を選ぶと、**不可除外のチェックボックスが出る**。チェックのON/OFFで結果が変わる。満点は「/ 3.0」
4. 成績評価係数では値によらず**留学ガイドのCTA**が出る。基本平均点では値によらず**履修ガイドのCTA**が出る
5. 京都大学など既存の大学では、重率セレクトも不可除外チェックボックスも**出ない**。結果表示とCTAは従来どおり
6. 就活系のリンクがページ上に1つも無い

確認後、開発サーバーを停止する。

- [ ] **Step 9: Commit**

```bash
git add app/gpa/GpaCalculatorClient.tsx app/gpa/MetricResultPanel.tsx
git commit -m "feat: 重率入力・不可除外トグル・指標別の結果表示とCTAを実装"
```

---

## Task 6: まとめ入力モード

**Files:**
- Create: `lib/gpa/bulk.ts`
- Create: `lib/gpa/bulk.test.ts`
- Create: `app/gpa/GradeTotalsInput.tsx`
- Modify: `app/gpa/GpaCalculatorClient.tsx`

**Interfaces:**
- Consumes: `lib/gpa/types.ts` の `Course` / `GradeScale`、`lib/gpa/calculate.ts` の `calculateMetric`
- Produces:
  - `lib/gpa/bulk.ts`：`coursesFromGradeTotals(scale: GradeScale, totals: Record<string, number>): Course[]`、`supportsBulkInput(scale: GradeScale): boolean`
  - `GradeTotalsInput`（デフォルトエクスポート）props: `{ scale: GradeScale; totals: Record<string, string>; onChange: (label: string, value: string) => void; idPrefix: string }`

- [ ] **Step 1: 失敗するテストを書く**

`lib/gpa/bulk.test.ts` を新規作成する。

```ts
import { describe, expect, it } from "vitest";
import { coursesFromGradeTotals, supportsBulkInput } from "./bulk";
import { GENERIC_SCALES } from "./scales";
import type { GradeScale } from "./types";

const gradeScale = GENERIC_SCALES[0]; // 秀4 / 優3 / 良2 / 可1 / 不可0

const scoreScale: GradeScale = {
  id: "test-score",
  label: "テスト用素点換算",
  method: "score",
  scoreToPoint: (s) => (s >= 60 ? 1 : 0),
  maxValue: 4,
  metricLabel: "GPA",
};

const rawWeightedScale: GradeScale = {
  id: "test-raw",
  label: "テスト用重率つき",
  method: "raw",
  maxValue: 100,
  metricLabel: "基本平均点",
  usesWeight: true,
};

describe("supportsBulkInput", () => {
  it("評語方式は対応する", () => {
    expect(supportsBulkInput(gradeScale)).toBe(true);
  });

  it("素点方式は対応しない", () => {
    expect(supportsBulkInput(scoreScale)).toBe(false);
  });

  it("重率を使う方式は対応しない", () => {
    expect(supportsBulkInput(rawWeightedScale)).toBe(false);
  });
});

describe("coursesFromGradeTotals", () => {
  it("評語ごとに1科目ぶんの Course を作る", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: 20, 良: 12 });
    expect(courses).toEqual([
      { id: "bulk-秀", name: "秀", credits: 20, grade: "秀" },
      { id: "bulk-良", name: "良", credits: 12, grade: "良" },
    ]);
  });

  it("方式の評語の並び順を保つ", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 可: 2, 秀: 4 });
    expect(courses.map((c) => c.grade)).toEqual(["秀", "可"]);
  });

  it("単位数が0の評語は含めない", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: 4, 優: 0 });
    expect(courses.map((c) => c.grade)).toEqual(["秀"]);
  });

  it("方式に存在しない評語は無視する", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: 4, Z: 10 });
    expect(courses.map((c) => c.grade)).toEqual(["秀"]);
  });

  it("NaN の単位数は含めない", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: NaN, 良: 2 });
    expect(courses.map((c) => c.grade)).toEqual(["良"]);
  });

  it("負の単位数はそのまま渡す（検証は calculateMetric の責務）", () => {
    const courses = coursesFromGradeTotals(gradeScale, { 秀: -2 });
    expect(courses).toEqual([
      { id: "bulk-秀", name: "秀", credits: -2, grade: "秀" },
    ]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
npm test
```

Expected: FAIL。`./bulk` を解決できない旨のエラー。

- [ ] **Step 3: `lib/gpa/bulk.ts` を実装する**

```ts
import type { Course, GradeScale } from "./types";

/**
 * まとめ入力（評語ごとに合計単位数を入れる方式）に対応できるかを返す。
 *
 * 素点方式は連続値のため評語単位でまとめられない。重率を使う方式は
 * 科目ごとに重率を選ぶ必要があるため、まとめ入力とは両立しない。
 */
export function supportsBulkInput(scale: GradeScale): boolean {
  return scale.method === "grade" && !scale.usesWeight;
}

/**
 * 評語ごとの合計単位数から Course[] を合成する。
 *
 * 合成した配列はそのまま calculateMetric に渡す。計算側にまとめ入力の
 * 概念を持ち込まないための変換層。
 *
 * - 並び順は方式の grades の順に揃える（入力オブジェクトのキー順に依存しない）
 * - 単位数が 0 または NaN の評語は除外する
 * - 方式に存在しない評語は無視する
 * - 負の単位数はそのまま通す。入力値の妥当性検証は calculateMetric の責務であり、
 *   ここで弾くと検証が二重管理になる
 */
export function coursesFromGradeTotals(
  scale: GradeScale,
  totals: Record<string, number>
): Course[] {
  const courses: Course[] = [];

  for (const option of scale.grades ?? []) {
    const credits = totals[option.label];
    if (credits === undefined) continue;
    if (!Number.isFinite(credits)) continue;
    if (credits === 0) continue;

    courses.push({
      id: `bulk-${option.label}`,
      name: option.label,
      credits,
      grade: option.label,
    });
  }

  return courses;
}
```

- [ ] **Step 4: テストが通ることを確認する**

```bash
npm test
```

Expected: PASS。Task 3 までの件数＋9件。

- [ ] **Step 5: `app/gpa/GradeTotalsInput.tsx` を作る**

```tsx
import type { GradeScale } from "@/lib/gpa/types";

/**
 * まとめ入力モードのUI。評語ごとに合計単位数を1つずつ入力させる。
 * 値の保持は親（GpaCalculatorClient）が行う。
 */
export default function GradeTotalsInput({
  scale,
  totals,
  onChange,
  idPrefix,
}: {
  scale: GradeScale;
  totals: Record<string, string>;
  onChange: (label: string, value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="mt-3 space-y-3">
      {scale.grades?.map((option) => (
        <div key={option.label} className="flex items-end gap-3">
          <label
            htmlFor={`${idPrefix}-total-${option.label}`}
            className="w-32 text-sm text-primary"
          >
            {option.label}（{option.point}）
          </label>
          <div className="w-32">
            <span className="block text-xs text-text-grey">合計単位数</span>
            <input
              id={`${idPrefix}-total-${option.label}`}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={totals[option.label] ?? ""}
              onChange={(e) => onChange(option.label, e.target.value)}
              className="mt-1 w-full border border-border-grey p-2 text-primary"
              placeholder="0"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: モード切替を `GpaCalculatorClient.tsx` に組み込む**

インポートを追加する。

```tsx
import { coursesFromGradeTotals, supportsBulkInput } from "@/lib/gpa/bulk";
import GradeTotalsInput from "./GradeTotalsInput";
```

状態を追加する。

```ts
  const [inputMode, setInputMode] = useState<"per-course" | "by-grade">(
    "per-course"
  );
  const [gradeTotals, setGradeTotals] = useState<Record<string, string>>({});
```

大学切替時の `useEffect` に、まとめ入力の値のリセットも加える。

```ts
  useEffect(() => {
    setResult(null);
    setFormError(null);
    setExcludeFail(false);
    setGradeTotals({});
  }, [universityId]);
```

まとめ入力に非対応の方式へ切り替えたら自動で科目ごと入力へ戻す。

```ts
  const bulkSupported = supportsBulkInput(scale);

  useEffect(() => {
    if (!bulkSupported) setInputMode("per-course");
  }, [bulkSupported]);
```

「履修科目」の見出しの直後に、切替ボタンを追加する。

```tsx
          {bulkSupported ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInputMode("per-course");
                  setResult(null);
                  setFormError(null);
                }}
                className={`border px-4 py-2 text-sm font-bold ${
                  inputMode === "per-course"
                    ? "border-primary bg-primary text-white"
                    : "border-border-grey text-text-grey"
                }`}
              >
                科目ごとに入力
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("by-grade");
                  setResult(null);
                  setFormError(null);
                }}
                className={`border px-4 py-2 text-sm font-bold ${
                  inputMode === "by-grade"
                    ? "border-primary bg-primary text-white"
                    : "border-border-grey text-text-grey"
                }`}
              >
                成績ごとにまとめて入力
              </button>
            </div>
          ) : null}
```

科目行のリストと「＋ 科目を追加」ボタンを `{inputMode === "per-course" ? ( ... ) : ( <GradeTotalsInput ... /> )}` で囲む。

```tsx
          {inputMode === "per-course" ? (
            <>
              {/* 既存の fields.map(...) のブロックと「＋ 科目を追加」ボタン */}
            </>
          ) : (
            <GradeTotalsInput
              scale={scale}
              totals={gradeTotals}
              idPrefix={fieldIdPrefix}
              onChange={(label, value) =>
                setGradeTotals((prev) => ({ ...prev, [label]: value }))
              }
            />
          )}
```

- [ ] **Step 7: `onSubmit` をモードで分岐させる**

`onSubmit` の冒頭で、モードに応じて `courses` を作る。以降の処理（不可除外・`calculateMetric` 呼び出し・エラー表示）は共通のまま。

```ts
    const courses: Course[] =
      inputMode === "by-grade"
        ? coursesFromGradeTotals(
            scale,
            Object.fromEntries(
              Object.entries(gradeTotals).map(([k, v]) => [k, toNumber(v)])
            )
          )
        : values.courses
            .filter(/* 既存の空行フィルタをそのまま */)
            .map(/* 既存の map をそのまま */);
```

GA4送信の `input_mode` を実際のモードにする。

```ts
      input_mode: inputMode,
```

- [ ] **Step 8: 型チェックと lint**

```bash
npx tsc --noEmit
```
Expected: エラー行に `app/gpa/` と `lib/gpa/` が1件も含まれないこと。

```bash
npm run lint
```
Expected: `app/gpa/` に起因するエラーが0件。

- [ ] **Step 9: 画面で確認する**

```bash
npm run dev
```

`http://localhost:3000/gpa` で以下を確認する。

1. 京都大学（評語方式）を選ぶと**モード切替ボタンが2つ出る**
2. 「成績ごとにまとめて入力」に切り替えると、評語ごとの合計単位数の入力欄に変わる
3. 「A+ に 20、B に 12」と入れて計算すると、手計算値と一致する
4. 東北大学（素点方式）と東京大学（基本平均点）では**切替ボタンが出ない**
5. まとめ入力中に東北大学へ切り替えると、自動で科目ごと入力に戻る
6. モードを切り替えると結果が消える

確認後、開発サーバーを停止する。

- [ ] **Step 10: Commit**

```bash
git add lib/gpa/bulk.ts lib/gpa/bulk.test.ts app/gpa/GradeTotalsInput.tsx app/gpa/GpaCalculatorClient.tsx
git commit -m "feat: 評語ごとの合計単位数で入力するモードを追加"
```

---

## Task 7: ページ本文と FAQ を改訂する

**Files:**
- Modify: `app/gpa/page.tsx`

**Interfaces:**
- Consumes: `lib/gpa/universities.ts` の `UNIVERSITIES`（東大2エントリが含まれるようになっている）
- Produces: なし（本プランの最終タスク）

- [ ] **Step 1: 東大に関する段落を書き換える**

現在の「なお東京大学は、全学の公式な案内で『東京大学ではGPAを算出していません』と明示しており…対応大学一覧には含めていません。」という段落を、以下に置き換える。

```tsx
          <p className="mt-4 text-sm leading-relaxed text-text-grey">
            <strong className="text-primary">東京大学</strong>は、全学の公式な案内で
            「東京大学ではGPAを算出していません」と明示しており、全学共通のGP換算表は存在しません。
            ただし実際には、進学選択で用いる<strong className="text-primary">基本平均点</strong>と、
            奨学金・交換留学の選抜で用いる<strong className="text-primary">成績評価係数</strong>という
            2つの指標があり、この計算機は両方に対応しています。
            2つは対象範囲も算出方法も異なるため、用途に応じて選んでください。
            いずれもGPAそのものではないため、GPAの提出を求められている場合は提出先にご確認ください。
          </p>
```

- [ ] **Step 2: FAQ の東大の項目を書き換える**

`FAQ_ITEMS` 内の「東京大学が対応大学一覧にないのはなぜですか？」の項目を、以下に置き換える。

```ts
  {
    question: "東京大学のGPAはどう計算しますか？",
    answer:
      "東京大学は全学としてGPAを算出していないと公式に明示しています。代わりに、進学選択で用いる「基本平均点」と、奨学金・交換留学の選抜で用いる「成績評価係数」という2つの指標があります。基本平均点は評点（0〜100点）を単位数と重率で加重平均した0〜100点の値で、前期課程までの科目が対象です。成績評価係数は評語を0〜3の評価ポイントに換算して単位数で加重平均した値で、入学後の全学期が対象です。この計算機は両方に対応しています。",
  },
```

`FAQ_ITEMS` は JSON-LD の `FAQPage` と画面の `<dl>` の両方から参照されているため、この1箇所の変更で構造化データも同時に更新される。

- [ ] **Step 3: 冒頭の説明文に東大を含める**

`<h1>` 直下の説明段落の末尾に、以下の一文を追加する。

```tsx
          東京大学については、GPAに代わる基本平均点と成績評価係数に対応しています。
```

- [ ] **Step 4: 型チェックとビルド**

```bash
npx tsc --noEmit
```
Expected: エラー行に `app/gpa/` が1件も含まれないこと。

```bash
npm run build
```
Expected: ビルド成功。ルート一覧に `/gpa` が含まれる。

- [ ] **Step 5: テストが通ることを確認する**

```bash
npm test
```

Expected: PASS（全件）。

- [ ] **Step 6: 画面で確認する**

```bash
npm run dev
```

`http://localhost:3000/gpa` で以下を確認する。

1. 対応大学の表に東大の2エントリが出ており、それぞれ出典リンクと確認日がある
2. 東大の段落とFAQが新しい内容になっている
3. 就活系のリンクがページ上に1つも無い

確認後、開発サーバーを停止する。

- [ ] **Step 7: Commit**

```bash
git add app/gpa/page.tsx
git commit -m "docs: /gpa の本文とFAQを東大2指標対応に合わせて改訂"
```

---

## 公開後の運用（本プランのスコープ外・記録用）

1. GA4 で `metric_id` と `input_mode` が受信できていることを確認する（公開翌日）。
2. `東大 GPA`・`基本平均点`・`成績評価係数` を Rank Tracker の追跡KWに追加する。
3. `input_mode = "by-grade"` の利用比率を1ヶ月後に確認し、低ければ切替UIの発見性を改善する。
4. 指定平均点（学部ごとの平均点）は重率表が入手できていないため未対応。入手できた時点で別タスクとして検討する。
5. 結果の共有機能・ログイン保存機能は別specで設計する。

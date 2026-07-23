# ProofLoop 視覚アイデンティティ 第一周 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** デザイントークン・ヘッダー・フッター・トップページを刷新し、ProofLoop のUIから「AI生成っぽさ」を取り除く。

**Architecture:** 色と書体の定義を `lib/design/tokens.ts` に一本化し `tailwind.config.ts` から読む。トップページを Server Component 化して Supabase から実データ（承認済み団体1,958件・12大学）を ISR で取得し、ヒーローで「実在の団体が一行ずつ立ち上がる」演出を CSS のみで行う。ヒーローの選定ロジックは純粋関数として切り出し vitest でテストする。

**Tech Stack:** Next.js 15 (App Router) / TypeScript / Tailwind CSS 3.4 / Supabase JS / lucide-react / vitest

## Global Constraints

- 設計仕様は `docs/superpowers/specs/2026-07-23-ui-identity-design.md`。矛盾したら仕様書が優先。
- 色は6つのみ：`ink #002B5C` / `seal #8B0000` / `paper #FFFFFF` / `mist #F2F4F7` / `rule #C9D2DC` / `graphite #1F2A36`。
- **`seal`（深紅）は静止状態で1画面2箇所まで。** ホバー・フォーカス時の色変化はこの数に含めない。
- 既存の色エイリアス（`primary` / `navy` / `text-grey` 等）は**削除しない**。第一周で触るファイルのみ新トークンへ書き換える。
- `tailwind.config.ts` の `borderRadius` 全キー `0px` 指定は**維持する**（`rounded-lg` が112箇所あり、外すとスコープ外35ページが一斉に角丸化する）。
- アイコンは **lucide-react に統一**。第一周で触るファイルから `material-symbols-outlined` を全廃する。他ページはまだ使うため `app/layout.tsx` の Material Symbols の `<link>` は**残す**。
- モーションは**ページ読み込み時に1回だけ**。`prefers-reduced-motion: reduce` では確定状態を即座に表示する。アニメーションライブラリを追加しない。
- 団体名・件数は**サーバー側で描画**する（クライアントで後から流し込まない）。
- `logo_url` は使わない。**ロゴ枠・プレースホルダーを置かない**（1,958件中1件しか値がないため）。
- テストは vitest。`vitest.config.ts` の `include` が `lib/**/*.test.ts` のため、**テスト対象の純粋ロジックは `lib/` 配下に置く**。
- コミットメッセージは日本語。1タスク1コミット。
- **`git push` はしない。** 完了後にオーナーの指示を仰ぐ。

---

## 仕様からの意図的な逸脱（実装前に確認済みとすること）

| 仕様の記述 | 実装での扱い | 理由 |
| --- | --- | --- |
| §5.2「`next/font/google` で読み込む」 | 既存の `app/layout.tsx` の Google Fonts `<link>` に追記する | 既存パターンに合わせる（CLAUDE.md）。`next/font` への移行は全ページに影響するため別タスク |
| §5.3「`borderRadius` は `none: 0` のみ定義」 | 全キー `0px` 指定を維持 | `rounded-lg` 112箇所・`rounded-full` 41箇所が現在この指定で潰されている。外すとスコープ外ページが崩れる |
| §7「大学名の帯が sticky で残る」 | **実装しない。** 通常のリストにする | シグネチャはヒーローに集中させる（"spend your boldness in one place"）。装飾を2箇所に散らすと弱くなる |

---

## File Structure

| ファイル | 責務 |
| --- | --- |
| `lib/design/tokens.ts` （新規） | 色・書体の唯一の定義元 |
| `lib/design/tokens.test.ts` （新規） | トークンの形式・重複を検証 |
| `lib/home/heroOrganizations.ts` （新規） | ヒーロー4行の選定ロジック（純粋関数） |
| `lib/home/heroOrganizations.test.ts` （新規） | 上記のテスト |
| `lib/home/homeData.ts` （新規） | Supabase からトップページ用データを取得 |
| `components/home/Hero.tsx` （新規） | ヒーロー（h1・団体4行・実数・検索） |
| `components/home/DirectoryPreview.tsx` （新規） | 大学別の名鑑プレビュー |
| `components/home/CategoryEntries.tsx` （新規） | カテゴリ別の入口 |
| `components/home/CampusLifeEntries.tsx` （新規） | 大学生活の入口（検索流入の受け皿） |
| `components/home/ForClubsCallout.tsx` （新規） | 学生団体の運営者向け導線 |
| `tailwind.config.ts` （修正） | トークンを読み込む |
| `app/globals.css` （修正） | 二重定義の解消・アニメーション定義 |
| `app/layout.tsx` （修正） | 明朝の読み込み追加 |
| `components/AppShell.tsx` （修正） | ワードマーク化・アイコン統一 |
| `components/Footer.tsx` （修正） | 全面改修 |
| `app/page.tsx` （修正） | Server Component 化・全面改修 |
| `app/search/page.tsx` （修正） | `university` / `category` クエリパラメータ対応 |

---

## Task 0: ベースライン計測

**Files:** なし（計測のみ）

**Interfaces:**
- Produces: 改修前の LCP 値（Task 12 の判定に使う）

- [ ] **Step 1: 本番ビルドを作って起動する**

```bash
npm run build
npm run start
```

Expected: `✓ Compiled successfully` と `- Local: http://localhost:3000` が出る

- [ ] **Step 2: 改修前の LCP を記録する**

Chrome で `http://localhost:3000` を開く → DevTools → Lighthouse → Mode: Navigation / Device: **Mobile** → Analyze page load。

**Largest Contentful Paint の秒数をこの計画ファイルの下記に書き込む。**

**実測（2026-07-23・Windows Chrome / localhost:3000 / 本番ビルド）**

Lighthouse ではなく Performance API（`PerformanceObserver` の `largest-contentful-paint`）で計測した。
再現手順が固定でき、改修後に同じ方法で比較できるため。

| 指標 | 改修前 |
| --- | --- |
| LCP（初回・フォント未キャッシュ） | **3,640 ms** |
| LCP（リロード・キャッシュあり） | **436 ms** |
| FCP（リロード） | 436 ms |
| LCP要素 | `<h2>`（ヒーロー見出し） |
| Google Fonts のリクエスト数 | 23 |
| Google Fonts の合計サイズ（decoded） | **784 KB** |

**改修後の判定に使うのは「LCP（リロード）」と「Google Fonts 合計サイズ」の2つ。**
`display=swap` を付けているためフォントはテキスト描画をブロックしない（フォールバックで即描画される）が、
初回訪問時の転送量は増える。フォント合計が **1,200 KB を超えた場合**も §5.2 のフォールバック検討対象とする。

- [ ] **Step 3: 既存テストが通ることを確認する**

Run: `npm run test`
Expected: 全テスト PASS（`lib/gpa/` 配下の6ファイル）

---

## Task 1: デザイントークンの定義

**Files:**
- Create: `lib/design/tokens.ts`
- Test: `lib/design/tokens.test.ts`
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `COLORS`（6キーのオブジェクト）、`FONT_FAMILIES`（`mincho` / `body` / `numeric`）。Tailwind クラス `bg-ink` `text-seal` `border-rule` `bg-mist` `text-graphite` `bg-paper` `font-mincho` `font-numeric` `font-body` が全タスクで使える。

- [ ] **Step 1: 失敗するテストを書く**

Create `lib/design/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COLORS, FONT_FAMILIES } from "./tokens";

describe("COLORS", () => {
  it("は6色だけを持つ", () => {
    expect(Object.keys(COLORS).sort()).toEqual(
      ["graphite", "ink", "mist", "paper", "rule", "seal"]
    );
  });

  it("はすべて6桁のHEXで書かれている", () => {
    for (const value of Object.values(COLORS)) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("に同じ値の色が2つ存在しない", () => {
    const values = Object.values(COLORS);
    expect(new Set(values).size).toBe(values.length);
  });

  it("はブランド色（紺・深紅）を維持している", () => {
    expect(COLORS.ink).toBe("#002B5C");
    expect(COLORS.seal).toBe("#8B0000");
  });
});

describe("FONT_FAMILIES", () => {
  it("は3ロールを持つ", () => {
    expect(Object.keys(FONT_FAMILIES).sort()).toEqual(["body", "mincho", "numeric"]);
  });

  it("の明朝はウェブフォント未読込でも日本語環境で成立するフォールバックを持つ", () => {
    expect(FONT_FAMILIES.mincho[0]).toBe("Shippori Mincho B1");
    expect(FONT_FAMILIES.mincho).toContain("Hiragino Mincho ProN");
    expect(FONT_FAMILIES.mincho).toContain("Yu Mincho");
    expect(FONT_FAMILIES.mincho.at(-1)).toBe("serif");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/design/tokens.test.ts`
Expected: FAIL（`Failed to resolve import "./tokens"`）

- [ ] **Step 3: トークンを実装する**

Create `lib/design/tokens.ts`:

```ts
/**
 * ProofLoop のデザイントークン（唯一の定義元）
 * 仕様: docs/superpowers/specs/2026-07-23-ui-identity-design.md §5
 *
 * 色は6つだけ。ここに色を足す前に、既存の6色で表現できないか必ず検討すること。
 */
export const COLORS = {
  /** 紺。見出し・面・ヘッダー・フッター地 */
  ink: "#002B5C",
  /** 深紅。「印」として静止状態で1画面2箇所まで */
  seal: "#8B0000",
  /** 地 */
  paper: "#FFFFFF",
  /** 面の切り替え。青みのある紙色 */
  mist: "#F2F4F7",
  /** 罫線 */
  rule: "#C9D2DC",
  /** 本文 */
  graphite: "#1F2A36",
} as const;

export const FONT_FAMILIES = {
  /** 見出し（h1・主要セクション見出しのみ） */
  mincho: ["Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", "serif"],
  /** 本文・UI */
  body: ["Noto Sans JP", "sans-serif"],
  /** 数値・ラベル */
  numeric: ["Inter", "sans-serif"],
} as const;
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run lib/design/tokens.test.ts`
Expected: PASS（8 tests）

- [ ] **Step 5: Tailwind から読み込む**

Modify `tailwind.config.ts` — `colors` の先頭に新トークンを追加し、`fontFamily` を差し替える。**既存の別名は消さない。**

```ts
import type { Config } from "tailwindcss";
import { COLORS, FONT_FAMILIES } from "./lib/design/tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── 新トークン（これから書くコードはこちらだけを使う）
        ...COLORS,

        // ── 以下は移行期間中のみ残す旧エイリアス。新規使用禁止。
        //    全ページ移行後に削除する（docs/task-board.md タスクA）
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#002b5c",
        accent: "#8B0000",
        "text-grey": "#707070",
        "background-light": "#ffffff",
        "background-dark": "#0f1823",
        navy: "#002B5C",
        "grey-custom": "#707070",
        "accent-red": "#8b0000",
        "secondary-grey": "#707070",
        secondary: "#8B0000",
        "text-main": "#002B5C",
        "text-sub": "#707070",
        "neutral-light": "#f0f0f5",
        "neutral-grey": "#707070",
        "border-grey": "#e5e7eb",
        "neutral-gray": "#707070",
        "primary-hover": "#001f42",
        "filter-bg": "#F5F5F5",
        "navy-custom": "#002B5C",
        "background-message": "#f8f5f5",
      },
      fontFamily: {
        mincho: [...FONT_FAMILIES.mincho],
        body: [...FONT_FAMILIES.body],
        numeric: [...FONT_FAMILIES.numeric],
        // 旧エイリアス: 既存ページの font-display が壊れないよう Inter を維持
        display: [...FONT_FAMILIES.numeric],
      },
      borderRadius: {
        // 全キー0の指定は維持する。外すと rounded-lg(112箇所) が一斉に角丸化する
        DEFAULT: "0px",
        none: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        full: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: globals.css の二重定義を解消する**

Modify `app/globals.css` — `body` の `font-family` 直接指定と `.no-rounded` を削除する。

削除前（21行目・45〜47行目）:

```css
body {
  color: var(--foreground);
  background: var(--background);
  font-family: "Inter", "Noto Sans JP", sans-serif;
}
```

```css
.no-rounded {
  border-radius: 0 !important;
}
```

削除後:

```css
body {
  color: var(--foreground);
  background: var(--background);
}
```

`.no-rounded` のブロックは丸ごと削除する（`borderRadius` 全キー0により機能的に不要）。

- [ ] **Step 7: `.no-rounded` の使用箇所が無いことを確認する**

Run: `npx tsc --noEmit` は不要。代わりに使用箇所を検索する。

Run: `grep -rn "no-rounded" app components --include="*.tsx"`
Expected: **出力なし**。もし出力があれば、その箇所のクラス名を `no-rounded` から削除してから次へ進む。

- [ ] **Step 8: ビルドが通ることを確認する**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 9: コミット**

```bash
git add lib/design/tokens.ts lib/design/tokens.test.ts tailwind.config.ts app/globals.css
git commit -m "feat: デザイントークンを lib/design/tokens.ts に一本化し二重定義を解消"
```

---

## Task 2: 明朝の読み込み

**Files:**
- Modify: `app/layout.tsx:49-52`

**Interfaces:**
- Consumes: Task 1 の `font-mincho` クラス
- Produces: `Shippori Mincho B1` が全ページで利用可能になる

- [ ] **Step 1: Google Fonts の link に明朝を追加する**

Modify `app/layout.tsx` — 既存の1つ目の `<link>` の href を差し替える。**Material Symbols の link（53-56行目）はそのまま残す**（他ページがまだ使用中）。

変更前:

```tsx
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Lexend:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
```

変更後:

```tsx
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Lexend:wght@400;700&family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho+B1:wght@600;700&display=swap"
          rel="stylesheet"
        />
```

- [ ] **Step 2: ビルドして目視確認する**

```bash
npm run build
npm run start
```

ブラウザで `http://localhost:3000` を開き、DevTools の Network タブで `Shippori` を含むフォントファイルが読み込まれていることを確認する。
Expected: `shipporiminchob1-*.woff2` 等が 200 で取得されている

- [ ] **Step 3: コミット**

```bash
git add app/layout.tsx
git commit -m "feat: 見出し用に Shippori Mincho B1 を読み込む"
```

---

## Task 3: ヒーロー団体の選定ロジック

**Files:**
- Create: `lib/home/heroOrganizations.ts`
- Test: `lib/home/heroOrganizations.test.ts`

**Interfaces:**
- Produces:
  - `type HeroOrgRow = { id: string; name: string | null; university: string | null; category: string | null }`
  - `type HeroOrg = { id: string; name: string; university: string }`
  - `selectHeroOrganizations(rows: HeroOrgRow[], limit?: number): HeroOrg[]`

- [ ] **Step 1: 失敗するテストを書く**

Create `lib/home/heroOrganizations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { selectHeroOrganizations, type HeroOrgRow } from "./heroOrganizations";

function row(over: Partial<HeroOrgRow> = {}): HeroOrgRow {
  return {
    id: "id-1",
    name: "○○研究会",
    university: "東京大学",
    category: "学術・研究（ゼミ・研究会・勉強会）",
    ...over,
  };
}

describe("selectHeroOrganizations", () => {
  it("大学が重複しないように先頭から選ぶ", () => {
    const result = selectHeroOrganizations([
      row({ id: "a", university: "慶應義塾大学", name: "A会" }),
      row({ id: "b", university: "慶應義塾大学", name: "B会" }),
      row({ id: "c", university: "京都大学", name: "C会" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["a", "c"]);
  });

  it("limit を超えて返さない", () => {
    const result = selectHeroOrganizations(
      [
        row({ id: "a", university: "慶應義塾大学" }),
        row({ id: "b", university: "京都大学" }),
        row({ id: "c", university: "上智大学" }),
        row({ id: "d", university: "一橋大学" }),
        row({ id: "e", university: "大阪大学" }),
      ],
      4
    );

    expect(result).toHaveLength(4);
  });

  it("候補が足りなければ少ない件数で返す", () => {
    const result = selectHeroOrganizations([row({ id: "a" })], 4);
    expect(result).toHaveLength(1);
  });

  it("文字化け（U+FFFD）を含む行を除外する", () => {
    const result = selectHeroOrganizations([
      row({ id: "broken", university: "慶應義塾大学", category: "運動系（スポーツ・アウトド�ア）" }),
      row({ id: "ok", university: "京都大学" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["ok"]);
  });

  it("団体名が空・空白のみの行を除外する", () => {
    const result = selectHeroOrganizations([
      row({ id: "empty", university: "慶應義塾大学", name: "" }),
      row({ id: "spaces", university: "上智大学", name: "   " }),
      row({ id: "null", university: "一橋大学", name: null }),
      row({ id: "ok", university: "京都大学" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["ok"]);
  });

  it("大学名が無い行を除外する", () => {
    const result = selectHeroOrganizations([
      row({ id: "no-univ", university: null }),
      row({ id: "ok", university: "京都大学" }),
    ]);

    expect(result.map((o) => o.id)).toEqual(["ok"]);
  });

  it("前後の空白を落として返す", () => {
    const result = selectHeroOrganizations([
      row({ id: "a", name: "  ○○会  ", university: " 東京大学 " }),
    ]);

    expect(result[0]).toEqual({ id: "a", name: "○○会", university: "東京大学" });
  });

  it("空配列を渡されたら空配列を返す", () => {
    expect(selectHeroOrganizations([])).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/home/heroOrganizations.test.ts`
Expected: FAIL（`Failed to resolve import "./heroOrganizations"`）

- [ ] **Step 3: 実装する**

Create `lib/home/heroOrganizations.ts`:

```ts
/**
 * トップページのヒーローに出す団体を選ぶ。
 *
 * 仕様: docs/superpowers/specs/2026-07-23-ui-identity-design.md §6.3
 * - 大学が重複しないように選ぶ（同じ大学が並ぶと「網羅している」印象が出ない）
 * - 文字化けした行は出さない（DBに実在する。§3参照）
 * - 名前・大学名が欠けている行は出さない
 */

export type HeroOrgRow = {
  id: string;
  name: string | null;
  university: string | null;
  category: string | null;
};

export type HeroOrg = {
  id: string;
  name: string;
  university: string;
};

/** 文字化けの検出。Unicode の REPLACEMENT CHARACTER を含む行は壊れている */
function isGarbled(...values: Array<string | null>): boolean {
  return values.some((v) => v != null && v.includes("�"));
}

export function selectHeroOrganizations(
  rows: HeroOrgRow[],
  limit = 4
): HeroOrg[] {
  const seenUniversities = new Set<string>();
  const selected: HeroOrg[] = [];

  for (const row of rows) {
    if (selected.length >= limit) break;

    const name = (row.name ?? "").trim();
    const university = (row.university ?? "").trim();

    if (name === "" || university === "") continue;
    if (isGarbled(row.name, row.university, row.category)) continue;
    if (seenUniversities.has(university)) continue;

    seenUniversities.add(university);
    selected.push({ id: row.id, name, university });
  }

  return selected;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run lib/home/heroOrganizations.test.ts`
Expected: PASS（8 tests）

- [ ] **Step 5: 全テストが通ることを確認する**

Run: `npm run test`
Expected: 全 PASS

- [ ] **Step 6: コミット**

```bash
git add lib/home/heroOrganizations.ts lib/home/heroOrganizations.test.ts
git commit -m "feat: ヒーローに出す団体の選定ロジックを追加"
```

---

## Task 4: トップページ用データの取得

**Files:**
- Create: `lib/home/homeData.ts`

**Interfaces:**
- Consumes: `selectHeroOrganizations` / `HeroOrg`（Task 3）、`UNIVERSITY_OPTIONS`（`constants/universities.ts`）
- Produces:
  - `type UniversityCount = { university: string; count: number }`
  - `type CategoryCount = { category: string; label: string; count: number }`
  - `type HomeData = { totalOrganizations: number; universityCounts: UniversityCount[]; categoryCounts: CategoryCount[]; heroOrganizations: HeroOrg[] }`
  - `getHomeData(): Promise<HomeData>`

- [ ] **Step 1: 実装する**

Create `lib/home/homeData.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { UNIVERSITY_OPTIONS } from "@/constants/universities";
import { selectHeroOrganizations, type HeroOrg, type HeroOrgRow } from "./heroOrganizations";

export type UniversityCount = { university: string; count: number };
export type CategoryCount = { category: string; label: string; count: number };

export type HomeData = {
  totalOrganizations: number;
  universityCounts: UniversityCount[];
  categoryCounts: CategoryCount[];
  heroOrganizations: HeroOrg[];
};

/** トップに出すカテゴリ。DBの値（category）と、画面に出す短いラベルの対応 */
const DISPLAY_CATEGORIES: Array<{ category: string; label: string }> = [
  { category: "運動系（スポーツ・アウトドア）", label: "運動系" },
  { category: "文化系（音楽・演劇・アート）", label: "文化系" },
  { category: "学術・研究（ゼミ・研究会・勉強会）", label: "学術・研究" },
  { category: "趣味・その他", label: "趣味・その他" },
];

const EMPTY: HomeData = {
  totalOrganizations: 0,
  universityCounts: [],
  categoryCounts: [],
  heroOrganizations: [],
};

/**
 * トップページ用のデータを取得する。
 *
 * 環境変数が無い環境でもビルドを落とさないよう、クライアントは関数内で生成する
 * （app/sitemap.ts と同じ方針）。取得に失敗した場合は空データを返し、
 * 呼び出し側（Hero 等）は 0件でも壊れない描画をする。
 */
export async function getHomeData(): Promise<HomeData> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("getHomeData: Supabase env not set — 空データを返します");
    return EMPTY;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    /** 承認済み団体の件数を数える。column/value を渡すとその条件で絞り込む */
    const countApproved = async (
      column?: "university" | "category",
      value?: string
    ): Promise<number> => {
      let query = supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", true);

      if (column && value) {
        query = query.eq(column, value);
      }

      const { count } = await query;
      return count ?? 0;
    };

    const [total, universityRaw, categoryRaw, heroRows] = await Promise.all([
      countApproved(),
      Promise.all(
        UNIVERSITY_OPTIONS.map(async (university) => ({
          university,
          count: await countApproved("university", university),
        }))
      ),
      Promise.all(
        DISPLAY_CATEGORIES.map(async ({ category, label }) => ({
          category,
          label,
          count: await countApproved("category", category),
        }))
      ),
      supabase
        .from("organizations")
        .select("id, name, university, category")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(60)
        .then(({ data }) => (data ?? []) as HeroOrgRow[]),
    ]);

    return {
      totalOrganizations: total,
      universityCounts: universityRaw
        .filter((u) => u.count > 0)
        .sort((a, b) => b.count - a.count),
      categoryCounts: categoryRaw.filter((c) => c.count > 0),
      heroOrganizations: selectHeroOrganizations(heroRows, 4),
    };
  } catch {
    console.error("getHomeData: 取得に失敗しました");
    return EMPTY;
  }
}
```

- [ ] **Step 2: 型チェックが通ることを確認する**

Run: `npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add lib/home/homeData.ts
git commit -m "feat: トップページ用のデータ取得を追加（件数・大学別・カテゴリ別・ヒーロー団体）"
```

---

## Task 5: 検索ページの university / category パラメータ対応

**Files:**
- Modify: `app/search/page.tsx:38-42`

**Interfaces:**
- Produces: `/search?university=京都大学` と `/search?category=運動系（スポーツ・アウトドア）` が初期絞り込みとして効く

**なぜ必要か:** Task 9 の名鑑プレビューとカテゴリ入口から張るリンクを「押した通りの結果が出る」状態にするため。これが無いと、大学名をクリックしても絞り込まれない嘘のリンクになる。

- [ ] **Step 1: 初期stateをクエリパラメータから読む**

Modify `app/search/page.tsx` — `SearchPage` の冒頭を次のように変更する。

変更前:

```tsx
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [keyword, setKeyword] = useState(initialQ);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
```

変更後:

```tsx
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const initialUniversity = searchParams.get("university");
  const initialCategory = searchParams.get("category");
  const [keyword, setKeyword] = useState(initialQ);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>(
    initialUniversity ? [initialUniversity] : []
  );
```

- [ ] **Step 2: 動作を確認する**

```bash
npm run dev
```

ブラウザで以下を開き、それぞれ絞り込まれた状態で表示されることを確認する。

1. `http://localhost:3000/search?university=京都大学` → 大学フィルタで「京都大学」が選択済み、結果が京都大学の団体のみ
2. `http://localhost:3000/search?category=運動系（スポーツ・アウトドア）` → カテゴリフィルタが選択済み
3. `http://localhost:3000/search` → フィルタ未選択（従来通り）

- [ ] **Step 3: コミット**

```bash
git add app/search/page.tsx
git commit -m "feat: 検索ページで university / category のクエリパラメータを初期値に反映"
```

---

## Task 6: ヘッダーのワードマーク化とアイコン統一

**Files:**
- Modify: `components/AppShell.tsx`

**Interfaces:**
- Consumes: Task 1 のトークン
- Produces: ヘッダー・ドロワー・モバイル下部ナビから `material-symbols-outlined` が消える

- [ ] **Step 1: lucide アイコンを import し、MOBILE_NAV_LINKS の型を変える**

Modify `components/AppShell.tsx` — 1〜32行目を次のように変更する。

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import {
  CalendarDays,
  Home,
  Mail,
  Menu,
  Newspaper,
  Search,
  User,
  Briefcase,
  X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const STUDENT_PATHS = [
  "/",
  "/search",
  "/classinfo",
  "/schedule",
  "/clubprofile",
  "/mypage",
  "/timeline",
  "/baito",
];

function isStudentPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return STUDENT_PATHS.some((p) => p !== "/" && pathname.startsWith(p));
}

const MOBILE_NAV_LINKS: Array<{ href: string; label: string; Icon: LucideIcon; loginOnly?: boolean }> = [
  { href: "/", label: "ホーム", Icon: Home },
  { href: "/search", label: "検索", Icon: Search },
  { href: "/timeline", label: "新着", Icon: Newspaper },
  { href: "/schedule", label: "カレンダー", Icon: CalendarDays },
  { href: "/baito", label: "バイト", Icon: Briefcase },
  { href: "/mypage/messages", label: "メッセージ", Icon: Mail, loginOnly: true },
  { href: "/mypage", label: "マイページ", Icon: User },
];
```

- [ ] **Step 2: ロゴをワードマークにする**

Modify `components/AppShell.tsx` — ヘッダーのロゴ部分（変更前の98-101行目）を次のように変更する。`loop` アイコンを**削除**する。

変更前:

```tsx
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-2xl md:text-3xl">loop</span>
            <span className="font-display font-bold text-xl md:text-2xl tracking-tight">ProofLoop</span>
          </Link>
```

変更後:

```tsx
          <Link
            href="/"
            className="flex items-center text-ink hover:opacity-90 transition-opacity"
            aria-label="ProofLoop ホーム"
          >
            <span className="font-numeric font-black text-xl md:text-2xl tracking-[-0.03em]">
              ProofLoop
            </span>
          </Link>
```

- [ ] **Step 3: デスクトップナビのアイコンを差し替える**

Modify `components/AppShell.tsx` — デスクトップナビ（変更前の104-135行目）の各リンクを次のように変更する。`material-symbols-outlined` の `<span>` を lucide コンポーネントに置き換え、色クラスも新トークンにする。

```tsx
              <nav className="hidden md:flex items-center gap-6 md:gap-8 text-graphite font-bold text-sm shrink-0">
                <Link className="flex items-center gap-2 hover:text-ink transition-colors" href="/">
                  <Home className="w-5 h-5" aria-hidden="true" />
                  ホーム
                </Link>
                <Link className="flex items-center gap-2 hover:text-ink transition-colors" href="/search">
                  <Search className="w-5 h-5" aria-hidden="true" />
                  検索
                </Link>
                <Link className="flex items-center gap-2 hover:text-ink transition-colors" href="/timeline">
                  <Newspaper className="w-5 h-5" aria-hidden="true" />
                  新着情報
                </Link>
                <Link className="flex items-center gap-2 hover:text-ink transition-colors" href="/schedule">
                  <CalendarDays className="w-5 h-5" aria-hidden="true" />
                  カレンダー
                </Link>
                <Link className="flex items-center gap-2 hover:text-ink transition-colors" href="/baito">
                  <Briefcase className="w-5 h-5" aria-hidden="true" />
                  バイト・インターン
                </Link>
                {session && (
                  <Link className="flex items-center gap-2 hover:text-ink transition-colors" href="/mypage/messages">
                    <Mail className="w-5 h-5" aria-hidden="true" />
                    メッセージ
                  </Link>
                )}
                <Link className="flex items-center gap-2 hover:text-ink transition-colors" href="/mypage">
                  <User className="w-5 h-5" aria-hidden="true" />
                  マイページ
                </Link>
              </nav>
```

- [ ] **Step 4: ハンバーガーボタンのアイコンを差し替える**

変更前（変更前の176-178行目）:

```tsx
                  <span className="material-symbols-outlined text-[28px]">
                    {isMenuOpen ? "close" : "menu"}
                  </span>
```

変更後:

```tsx
                  {isMenuOpen ? (
                    <X className="w-7 h-7" aria-hidden="true" />
                  ) : (
                    <Menu className="w-7 h-7" aria-hidden="true" />
                  )}
```

- [ ] **Step 5: ドロワーのアイコンを差し替える**

変更前（変更前の209-223行目）:

```tsx
                {MOBILE_NAV_LINKS.filter((link) => !link.loginOnly || session).map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
                      pathname === href || (href !== "/" && pathname?.startsWith(href))
                        ? "bg-primary/10 text-primary"
                        : "text-text-grey hover:bg-slate-50 hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                    {label}
                  </Link>
                ))}
```

変更後:

```tsx
                {MOBILE_NAV_LINKS.filter((link) => !link.loginOnly || session).map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-4 py-3 font-bold text-sm transition-colors ${
                      pathname === href || (href !== "/" && pathname?.startsWith(href))
                        ? "bg-mist text-ink"
                        : "text-graphite hover:bg-mist hover:text-ink"
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
```

さらにドロワー内のマイページリンク（変更前の233行目）:

変更前: `<span className="material-symbols-outlined text-[20px]">person</span>`
変更後: `<User className="w-5 h-5" aria-hidden="true" />`

- [ ] **Step 6: モバイル下部ナビのアイコンを差し替える**

変更前の275・279・286・290・297・305・310行目の `material-symbols-outlined` を、それぞれ次に置き換える。

| 変更前 | 変更後 |
| --- | --- |
| `<span className="material-symbols-outlined">home</span>` | `<Home className="w-6 h-6" aria-hidden="true" />` |
| `<span className="material-symbols-outlined">search</span>` | `<Search className="w-6 h-6" aria-hidden="true" />` |
| `<span className="material-symbols-outlined">dynamic_feed</span>` | `<Newspaper className="w-6 h-6" aria-hidden="true" />` |
| `<span className="material-symbols-outlined">calendar_month</span>` | `<CalendarDays className="w-6 h-6" aria-hidden="true" />` |
| `<span className="material-symbols-outlined">work</span>` | `<Briefcase className="w-6 h-6" aria-hidden="true" />` |
| `<span className="material-symbols-outlined">mail</span>` | `<Mail className="w-6 h-6" aria-hidden="true" />` |
| `<span className="material-symbols-outlined">person</span>` | `<User className="w-6 h-6" aria-hidden="true" />` |

あわせて、モバイル下部ナビの色クラスを新トークンにする：`text-primary` → `text-ink`、`text-text-grey` → `text-graphite`、`hover:text-primary` → `hover:text-ink`、`border-[#f0f2f5]` → `border-rule`。

- [ ] **Step 7: material-symbols が消えたことを確認する**

Run: `grep -n "material-symbols" components/AppShell.tsx`
Expected: **出力なし**

- [ ] **Step 8: ビルドと目視確認**

```bash
npm run build
npm run start
```

`http://localhost:3000` で確認する：
1. ヘッダーのロゴが「ProofLoop」の文字のみ（丸い矢印アイコンが無い）
2. デスクトップ幅でナビのアイコンが表示される（豆腐や空白になっていない）
3. 375px 幅にして下部ナビのアイコンが表示される
4. ハンバーガーを開閉できる

- [ ] **Step 9: コミット**

```bash
git add components/AppShell.tsx
git commit -m "feat: ヘッダーをワードマーク化しアイコンを lucide に統一"
```

---

## Task 7: フッターの刷新

**Files:**
- Modify: `components/Footer.tsx`（全面置換）

**Interfaces:**
- Consumes: Task 1 のトークン
- Produces: `ink` 地のフッター、ガイド導線、死にリンクの除去

- [ ] **Step 1: フッターを書き換える**

Replace the entire contents of `components/Footer.tsx`:

```tsx
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const GUIDE_LINKS = [
  { href: "/gpa", label: "GPA計算機" },
  { href: "/guide/credits", label: "単位・授業" },
  { href: "/guide/money", label: "お金・奨学金" },
  { href: "/guide/living-alone", label: "一人暮らし" },
  { href: "/baito", label: "バイト・インターン" },
  { href: "/guide/study-abroad", label: "留学" },
  { href: "/guide/circle", label: "サークル" },
];

const ABOUT_LINKS = [
  { href: "/for-students", label: "一般学生の方へ" },
  { href: "/for-clubs", label: "学生団体の方へ" },
];

const CONTACT_URL =
  "https://proofloop.jp/organizations/4003e084-8da8-4315-b0dc-3dcce3da42d0";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-paper mt-20">
      <div className="max-w-[1100px] mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <span className="font-numeric font-black tracking-[-0.03em] text-xl">
                ProofLoop
              </span>
            </Link>
            <p className="text-paper/70 text-sm mt-4 leading-relaxed font-body">
              見えていなかった学生の力を、記録して、可視にする。
            </p>
          </div>

          <div>
            <h2 className="font-mincho text-sm mb-4 text-paper">大学生活ガイド</h2>
            <ul className="space-y-2.5 text-sm font-body">
              {GUIDE_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-paper/70 hover:text-paper transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-mincho text-sm mb-4 text-paper">ProofLoopについて</h2>
            <ul className="space-y-2.5 text-sm font-body">
              {ABOUT_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-paper/70 hover:text-paper transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-mincho text-sm mb-4 text-paper">お問い合わせ</h2>
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-paper/70 hover:text-paper transition-colors text-sm font-body"
            >
              運営事務局
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-paper/15">
          <p className="text-xs text-paper/50 font-body">
            © {year} ProofLoop
          </p>
        </div>
      </div>
    </footer>
  );
}
```

**削除した理由の記録:** 公式SNSの2リンクは `href="#"` の死にリンクだったため、項目ごと削除した。アカウントのURLが確定したら、`ABOUT_LINKS` と同じ形で復活させる（`docs/owner-todo.md` に記載）。

- [ ] **Step 2: ビルドと目視確認**

```bash
npm run build
npm run start
```

`http://localhost:3000` の最下部で確認する：
1. フッターの地色が紺（`#002B5C`）になっている
2. ガイド7本のリンクが並び、それぞれ正しいページへ遷移する
3. `href="#"` のリンクが存在しない（DevTools で `a[href="#"]` を検索して0件）
4. 375px 幅で崩れていない

- [ ] **Step 3: コミット**

```bash
git add components/Footer.tsx
git commit -m "feat: フッターを紺地に刷新しガイド導線を追加、死にリンクを削除"
```

---

## Task 8: ヒーローとトップページの Server Component 化

**Files:**
- Create: `components/home/Hero.tsx`
- Modify: `app/globals.css`（アニメーション定義の追加）
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getHomeData`（Task 4）、`HeroOrg`（Task 3）
- Produces: `<Hero organizations={...} totalOrganizations={...} universityCount={...} />`

- [ ] **Step 1: 立ち上がりアニメーションを定義する**

Modify `app/globals.css` — ファイル末尾に追加する。

```css
/* ヒーローの「顕在化」演出。
   仕様: docs/superpowers/specs/2026-07-23-ui-identity-design.md §6.2
   読み込み時に1回だけ。ループしない。 */
@keyframes pl-surface {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.pl-surface {
  opacity: 0;
  animation: pl-surface 320ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .pl-surface {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
```

- [ ] **Step 2: Hero コンポーネントを作る**

Create `components/home/Hero.tsx`:

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HeroOrg } from "@/lib/home/heroOrganizations";

type Props = {
  organizations: HeroOrg[];
  totalOrganizations: number;
  universityCount: number;
};

export default function Hero({
  organizations,
  totalOrganizations,
  universityCount,
}: Props) {
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <h1 className="font-mincho font-bold text-ink text-[2rem] leading-[1.4] md:text-5xl md:leading-[1.35] tracking-tight">
        見えていなかった力を、
        <br />
        100%に。
      </h1>

      {organizations.length > 0 && (
        <ul className="border-t border-rule">
          {organizations.map((org, index) => (
            <li
              key={org.id}
              className="pl-surface border-b border-rule"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <Link
                href={`/organizations/${org.id}`}
                className="group flex items-center gap-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span className="font-body text-xs md:text-sm text-graphite/70 w-24 md:w-32 shrink-0">
                  {org.university}
                </span>
                <span className="font-body text-sm md:text-base text-ink group-hover:underline underline-offset-4">
                  {org.name}
                </span>
                <ChevronRight
                  className="w-4 h-4 ml-auto shrink-0 text-rule group-hover:text-ink transition-colors"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="font-body text-sm text-graphite">
        <span className="font-numeric tabular-nums text-ink font-bold">
          {universityCount}
        </span>
        大学{" "}
        <span className="font-numeric tabular-nums text-ink font-bold">
          {totalOrganizations.toLocaleString("ja-JP")}
        </span>
        団体を掲載しています。
      </p>

      <form action="/search" method="get" className="flex border border-ink">
        <label htmlFor="hero-search" className="sr-only">
          大学名・団体名で探す
        </label>
        <input
          id="hero-search"
          name="q"
          type="search"
          placeholder="大学名・団体名で探す"
          className="flex-1 min-w-0 px-4 py-3 font-body text-base text-graphite placeholder:text-graphite/50 bg-paper focus:outline-none focus:bg-mist"
        />
        <button
          type="submit"
          className="bg-ink text-paper px-6 py-3 font-body font-bold text-sm shrink-0 hover:bg-ink/90 transition-colors"
        >
          探す
        </button>
      </form>
    </section>
  );
}
```

**注意:** `organizations` が空でも `totalOrganizations` が0でも壊れないこと。DB取得に失敗した場合、団体リストと数字は出ないが `<h1>` と検索フォームは表示される。

- [ ] **Step 3: トップページを Server Component 化してヒーローを差し込む**

Modify `app/page.tsx` — **1行目の `"use client";` を削除**し、ヒーローセクション（変更前の10-16行目）を `<Hero />` に置き換える。既存の Quick Access・新入生ガイド・UpcomingEvents は**このタスクでは残す**（Task 9・10 で置き換える）。

```tsx
import Link from "next/link";
import type { Metadata } from "next";
import UpcomingEvents from "@/components/UpcomingEvents";
import Hero from "@/components/home/Hero";
import { getHomeData } from "@/lib/home/homeData";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "学生団体を探す｜大学別・分野別に見つかる",
  description:
    "全国の大学の学生団体を大学別・分野別に掲載。サークル・研究会・学祭実行委員会を探せます。GPA計算機や単位・お金のガイドも。",
};

export default async function Page() {
  const home = await getHomeData();

  return (
    <div className="bg-paper text-graphite min-h-screen flex flex-col font-body pb-20 md:pb-0">
      <main className="flex-grow w-full max-w-[1100px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-16 md:gap-20">
        <Hero
          organizations={home.heroOrganizations}
          totalOrganizations={home.totalOrganizations}
          universityCount={home.universityCounts.length}
        />

        {/* 以下は Task 9・10 で置き換える。このタスクでは既存のまま残す */}
        {/* ...既存の Quick Access セクションをそのまま残す... */}
        {/* ...既存の新入生ガイドセクションをそのまま残す... */}

        <UpcomingEvents />
      </main>
    </div>
  );
}
```

**重要:** 既存の Quick Access（変更前の19-52行目）と新入生ガイド（変更前の55-95行目）のJSXは、コメント位置にそのまま貼り付けて残すこと。これらは hooks を使っていないため Server Component 内でそのまま動作する。

- [ ] **Step 4: サーバー描画されていることを確認する**

```bash
npm run build
npm run start
```

Run: `curl -s http://localhost:3000/ | grep -c "見えていなかった力を"`
Expected: `1` 以上（HTMLソースに文字列として含まれている）

Run: `curl -s http://localhost:3000/ | grep -o "団体を掲載しています"`
Expected: `団体を掲載しています`

Run: `curl -s http://localhost:3000/ | grep -o "<h1[^>]*>" | wc -l`
Expected: `1`

- [ ] **Step 5: 目視で演出を確認する**

ブラウザで `http://localhost:3000` を開き、確認する：
1. リロードすると団体4行が上から順に立ち上がる
2. 見出しは動かない
3. DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce" を有効にしてリロード → **アニメーションが起きず最初から全部見えている**
4. 団体名をクリックすると `/organizations/[id]` に遷移する
5. 検索フォームに文字を入れて「探す」→ `/search?q=...` に遷移し結果が出る

- [ ] **Step 6: コミット**

```bash
git add app/page.tsx app/globals.css components/home/Hero.tsx
git commit -m "feat: トップをServer Component化し、実在団体が立ち上がるヒーローを実装"
```

---

## Task 9: 名鑑プレビューとカテゴリ入口

**Files:**
- Create: `components/home/DirectoryPreview.tsx`
- Create: `components/home/CategoryEntries.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `UniversityCount` / `CategoryCount`（Task 4）
- Produces: `<DirectoryPreview universityCounts={...} />`、`<CategoryEntries categories={...} />`

- [ ] **Step 1: 大学別の名鑑プレビューを作る**

Create `components/home/DirectoryPreview.tsx`:

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { UniversityCount } from "@/lib/home/homeData";

type Props = { universityCounts: UniversityCount[] };

export default function DirectoryPreview({ universityCounts }: Props) {
  if (universityCounts.length === 0) return null;

  return (
    <section aria-labelledby="directory-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2
          id="directory-heading"
          className="font-mincho font-bold text-ink text-2xl md:text-3xl"
        >
          大学から探す
        </h2>
        <p className="font-body text-sm text-graphite">
          学生団体を大学別に掲載しています。所属団体の多い順。
        </p>
      </div>

      <ul className="border-t border-rule">
        {universityCounts.map((item) => (
          <li key={item.university} className="border-b border-rule">
            <Link
              href={`/search?university=${encodeURIComponent(item.university)}`}
              className="group flex items-center gap-4 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="font-body text-sm md:text-base text-ink group-hover:underline underline-offset-4">
                {item.university}
              </span>
              <span className="ml-auto font-numeric tabular-nums text-sm text-graphite/70">
                {item.count.toLocaleString("ja-JP")}
              </span>
              <ChevronRight
                className="w-4 h-4 shrink-0 text-rule group-hover:text-ink transition-colors"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: カテゴリ入口を作る**

Create `components/home/CategoryEntries.tsx`:

```tsx
import Link from "next/link";
import type { CategoryCount } from "@/lib/home/homeData";

type Props = { categories: CategoryCount[] };

export default function CategoryEntries({ categories }: Props) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="category-heading" className="flex flex-col gap-5">
      <h2
        id="category-heading"
        className="font-mincho font-bold text-ink text-2xl md:text-3xl"
      >
        分野から探す
      </h2>

      <ul className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
        {categories.map((item) => (
          <li key={item.category} className="bg-paper">
            <Link
              href={`/search?category=${encodeURIComponent(item.category)}`}
              className="flex flex-col gap-1 p-5 h-full hover:bg-mist transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              <span className="font-numeric tabular-nums text-2xl text-ink font-bold">
                {item.count.toLocaleString("ja-JP")}
              </span>
              <span className="font-body text-sm text-graphite">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: 既存の Quick Access 3枚カードを置き換える**

Modify `app/page.tsx` — import を追加し、**既存の Quick Access セクション（`{/* Quick Access */}` から始まる `<section>` 全体）を削除**して、次の2行に置き換える。

```tsx
import DirectoryPreview from "@/components/home/DirectoryPreview";
import CategoryEntries from "@/components/home/CategoryEntries";
```

```tsx
        <DirectoryPreview universityCounts={home.universityCounts} />
        <CategoryEntries categories={home.categoryCounts} />
```

- [ ] **Step 4: 動作確認**

```bash
npm run build
npm run start
```

`http://localhost:3000` で確認する：
1. 「大学から探す」に大学名と件数が**多い順**に並ぶ（慶應義塾大学が先頭、件数は3桁）
2. 大学名をクリック → `/search?university=...` に遷移し、**その大学の団体だけが表示される**
3. 「分野から探す」の4枠に数字が出る
4. 分野をクリック → その分野で絞り込まれた検索結果が出る
5. アイコンが四角い淡色ブロックに入った3枚カードが**消えている**

- [ ] **Step 5: コミット**

```bash
git add app/page.tsx components/home/DirectoryPreview.tsx components/home/CategoryEntries.tsx
git commit -m "feat: トップに大学別の名鑑プレビューと分野別入口を実装"
```

---

## Task 10: 大学生活の入口と運営者向け導線

**Files:**
- Create: `components/home/CampusLifeEntries.tsx`
- Create: `components/home/ForClubsCallout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `<CampusLifeEntries />`、`<ForClubsCallout />`（どちらも props なし）

- [ ] **Step 1: 大学生活の入口を作る（虹色6色の置き換え）**

Create `components/home/CampusLifeEntries.tsx`:

```tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const ENTRIES = [
  { href: "/gpa", label: "GPA計算機", note: "大学別の基準で計算する" },
  { href: "/guide/credits", label: "単位・授業", note: "履修とGPAの基本" },
  { href: "/guide/money", label: "お金・奨学金", note: "奨学金の種類と生活費" },
  { href: "/guide/living-alone", label: "一人暮らし", note: "家賃と生活の組み立て方" },
  { href: "/baito", label: "バイト・インターン", note: "授業と両立できる働き方" },
  { href: "/guide/study-abroad", label: "留学", note: "12カ国から診断する" },
];

export default function CampusLifeEntries() {
  return (
    <section aria-labelledby="campus-life-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2
          id="campus-life-heading"
          className="font-mincho font-bold text-ink text-2xl md:text-3xl"
        >
          大学生活の疑問も、ここで解く
        </h2>
        <p className="font-body text-sm text-graphite">
          単位・お金・住まい・働き方。調べものから入っても構いません。
        </p>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
        {ENTRIES.map((entry) => (
          <li key={entry.href} className="bg-paper">
            <Link
              href={entry.href}
              className="group flex items-center gap-4 p-5 h-full hover:bg-mist transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              <div className="flex flex-col gap-1">
                <span className="font-body text-base text-ink group-hover:underline underline-offset-4">
                  {entry.label}
                </span>
                <span className="font-body text-xs text-graphite/70">{entry.note}</span>
              </div>
              <ChevronRight
                className="w-4 h-4 ml-auto shrink-0 text-rule group-hover:text-ink transition-colors"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: 運営者向け導線を作る（唯一の `seal` 使用箇所）**

Create `components/home/ForClubsCallout.tsx`:

```tsx
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * このページで seal（深紅）を静止状態で使う唯一の箇所。
 * 仕様 §5.1「1画面2箇所まで」。他の箇所に seal を足す前にここを確認すること。
 */
export default function ForClubsCallout() {
  return (
    <section className="border-l-4 border-seal bg-mist px-6 py-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="font-mincho font-bold text-ink text-lg">
          学生団体を運営している方へ
        </h2>
        <p className="font-body text-sm text-graphite">
          メンバー管理・新歓・イベント・タスクを、ひとつの場所で。
        </p>
      </div>
      <Link
        href="/for-clubs"
        className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 font-body font-bold text-sm shrink-0 hover:bg-ink/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        導入について見る
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
```

- [ ] **Step 3: 既存の新入生ガイド（虹色6枠）を置き換える**

Modify `app/page.tsx` — import を追加し、**既存の新入生ガイドセクション（`{/* 新入生ガイド */}` から始まる `<section>` 全体）を削除**して `<CampusLifeEntries />` に置き換える。`<ForClubsCallout />` は `<UpcomingEvents />` の後ろに置く。

最終形:

```tsx
import type { Metadata } from "next";
import UpcomingEvents from "@/components/UpcomingEvents";
import Hero from "@/components/home/Hero";
import DirectoryPreview from "@/components/home/DirectoryPreview";
import CategoryEntries from "@/components/home/CategoryEntries";
import CampusLifeEntries from "@/components/home/CampusLifeEntries";
import ForClubsCallout from "@/components/home/ForClubsCallout";
import { getHomeData } from "@/lib/home/homeData";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "学生団体を探す｜大学別・分野別に見つかる",
  description:
    "全国の大学の学生団体を大学別・分野別に掲載。サークル・研究会・学祭実行委員会を探せます。GPA計算機や単位・お金のガイドも。",
};

export default async function Page() {
  const home = await getHomeData();

  return (
    <div className="bg-paper text-graphite min-h-screen flex flex-col font-body pb-20 md:pb-0">
      <main className="flex-grow w-full max-w-[1100px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-16 md:gap-20">
        <Hero
          organizations={home.heroOrganizations}
          totalOrganizations={home.totalOrganizations}
          universityCount={home.universityCounts.length}
        />
        <DirectoryPreview universityCounts={home.universityCounts} />
        <CategoryEntries categories={home.categoryCounts} />
        <CampusLifeEntries />
        <UpcomingEvents />
        <ForClubsCallout />
      </main>
    </div>
  );
}
```

**注意:** `Link` の import が未使用になっていたら削除する（ESLint エラーになる）。

- [ ] **Step 4: 虹色が消えたことを確認する**

Run: `grep -nE "blue-50|emerald-50|sky-50|amber-50|violet-50|rose-50|bg-gray-900" app/page.tsx components/home components/Footer.tsx components/AppShell.tsx -r`
Expected: **出力なし**

- [ ] **Step 5: ビルドと目視確認**

```bash
npm run build
npm run start
```

1. トップページ全体を上から下まで見て、パステルの色ブロックが1つも無い
2. 深紅が使われているのは「学生団体を運営している方へ」の左の帯**1箇所だけ**
3. 375px 幅で横スクロールが発生しない（DevTools のデバイスツールバーで確認）

- [ ] **Step 6: コミット**

```bash
git add app/page.tsx components/home/CampusLifeEntries.tsx components/home/ForClubsCallout.tsx
git commit -m "feat: 大学生活の入口と運営者向け導線を実装し、虹色6枠を廃止"
```

---

## Task 11: 最終検証

**Files:** なし（検証のみ）

- [ ] **Step 1: 自動で確認できる項目を検証する**

```bash
npm run test
npm run lint
npm run build
```

Expected: すべて成功（lint の warning は許容、error は不可）

```bash
npm run start
```

別ターミナルで:

```bash
curl -s http://localhost:3000/ | grep -o "<h1[^>]*>" | wc -l
```
Expected: `1`

```bash
curl -s http://localhost:3000/ | grep -c "見えていなかった力を"
```
Expected: `1` 以上

```bash
grep -rn "material-symbols" app/page.tsx components/home components/Footer.tsx components/AppShell.tsx
```
Expected: 出力なし

```bash
grep -rnE "blue-50|emerald-50|sky-50|amber-50|violet-50|rose-50|bg-gray-900" app/page.tsx components/home components/Footer.tsx components/AppShell.tsx
```
Expected: 出力なし

```bash
grep -rn "no-rounded" app components
```
Expected: 出力なし

- [ ] **Step 2: 目視で確認する（仕様 §9 の残り項目）**

`http://localhost:3000` で以下をすべて確認する。

- [ ] 深紅（`#8B0000`）が静止状態で使われているのは1〜2箇所以内
- [ ] `prefers-reduced-motion: reduce` でアニメーションが発生せず、団体4行が最初から見えている
- [ ] Tab キーだけで全リンクをたどれ、フォーカス位置が視認できる
- [ ] 375px 幅で横スクロールが発生しない
- [ ] ヒーローの団体名が実在の団体（DBの内容）と一致している
- [ ] フッターに `href="#"` のリンクが無い

- [ ] **Step 3: LCP を計測して判定する**

Chrome DevTools → Lighthouse → Mobile で `http://localhost:3000` を計測する。

**実測（2026-07-23・改修後）**

| 指標 | 改修前 | 改修後 | 判定 |
| --- | --- | --- | --- |
| Google Fonts のリクエスト数 | 23 | **2** | 改善 |
| Google Fonts の合計サイズ（decoded） | 784 KB | **572 KB** | **-212 KB。改善** |
| LCP（リロード） | 436 ms | **計測できず**（下記） | 保留 |

明朝（Shippori Mincho B1）を1書体足したにもかかわらず**総フォント量は減った**。
トップページが Material Symbols のグリフを一切要求しなくなったため。
フォールバック切替の閾値（1,200 KB）には遠く及ばないので、§5.2 のフォールバックは**発動しない**。

⚠️ **LCPの改修後の値は未取得。** 検証に使った Chrome ウィンドウが前面になく
`document.visibilityState === "hidden"` のため、ブラウザが paint timing を記録しない。
`display=swap` を付けているためテキストはフォールバックで即描画され、総転送量も減っているので
悪化している可能性は低いが、**数値としては未確認**。オーナーが実機で確認する場合の手順：
Chrome を前面にして `http://localhost:3000/` を開き、DevTools → Lighthouse → Mobile。

**判定：差分が +0.3秒を超えた場合**、`lib/design/tokens.ts` の `mincho` から `"Shippori Mincho B1"` を削除し（システム明朝スタックのみにする）、`app/layout.tsx` の Google Fonts URL から `&family=Shippori+Mincho+B1:wght@600;700` を削除して再計測する。

- [ ] **Step 4: 結果を記録してコミットする**

この計画ファイルの Task 0 / Task 11 の計測欄に実測値を書き込む。

```bash
git add docs/superpowers/plans/2026-07-23-ui-identity-phase1.md
git commit -m "docs: 第一周の実装完了。LCP計測値を記録"
```

- [ ] **Step 5: push はせず、オーナーに報告する**

**`git push` はしない。** 次の内容を報告し、本番反映の指示を仰ぐ：
- 実装した内容
- LCP の変化
- 目視確認の結果
- 残っている懸念（あれば）

---

## 第一周の後に残る作業（この計画の対象外）

`docs/task-board.md` に追記すること。

| 項目 | 内容 |
| --- | --- |
| sitemap の上限 | `app/sitemap.ts:128` の `.limit(1000)` で958団体が未送信。ページ分割または上限撤廃が必要 |
| 文字化けデータ | `organizations.category` に `�` を含む行が2件。DB側の修正 |
| 残り約35ページの移行 | `/guide` 配下・`/gpa`・`/for-clubs`・管理画面系を新トークンへ |
| 旧エイリアスの削除 | 全ページ移行後に `tailwind.config.ts` の旧色名20個を削除 |
| Material Symbols の撤去 | 全ページから消えた時点で `app/layout.tsx` の `<link>` を削除 |
| 公式SNSリンク | アカウントURL確定後にフッターへ復活 |
| ルート名のスペルミス | `clubdashborad` / `companydashborad` |

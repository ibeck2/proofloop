# アフィリエイト リソースカード基盤 実装計画（計画1）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一次情報（公式・無料）を主役に、広告リンクを開示付きで横に添える「リソースカード」の基盤を作り、`/guide/living-alone` と `/guide/money` に適用する。

**Architecture:** 信頼性を守る強制ルール（rel/開示ラベルの自動付与・広告のみブロックの禁止・計測）を**すべて `lib/` の純粋関数に寄せて vitest でユニットテスト**し、コンポーネントは薄い表示層に留める（リポジトリ既存規約に一致）。リンクデータは version-controlled な `lib/guide/resources.ts` に集約し、git diff で改変を担保する。

**Tech Stack:** Next.js 15（App Router）/ TypeScript / Tailwind（6色トークン `lib/design/tokens.ts`）/ vitest（node環境）/ GA4（`window.gtag`）

## Global Constraints

- **一次情報が主役**。各リソースグループに非アフィリエイトのリンクを必ず1つ以上含める（`findAdOnlyGroups` がテストで担保）。
- **全アフィリエイトリンクに開示**：`rel="sponsored noopener noreferrer"`・`target="_blank"`・「※広告」ラベルを**コンポーネントが自動付与**（書き手が付け忘れられない）。ステマ規制（景表法）順守。
- **就活系NG**：新卒スカウト・逆求人・転職エージェント系（ビズリーチ/UTBoard/OfferBox 等）への直リンク禁止。バイト・インターン・クラウドソーシングは可。`lib/guide/resources.ts` 冒頭にコメントで明記。
- **URLは `lib/guide/resources.ts` に集約**（ハードコード散在禁止・CLAUDE.md §5）。
- **本番の実アフィリエイトURLと深い一次情報ソースは Phase 0/1 の成果物**。本計画は基盤と、確実に安定した公式ドメインの初期シードまでを作る。実データ拡充は別ステップ。
- テストは `lib/**/*.test.ts`・`environment: node`。コンポーネント（`.tsx`）はユニットテストせず、`npm run lint` と手動確認で検証（既存規約）。
- 色は6色トークン（`bg-paper`/`text-ink`/`text-graphite`/`bg-mist`/`border-rule` 等）を使用。深紅（accent）は静止1画面2箇所の予算を超えない。

---

### Task 1: リンク属性の強制ロジック `resourceLinkAttrs`

アフィリエイトリンクに `rel="sponsored ..."`・`target`・広告フラグを機械的に決める純粋関数。開示の付け忘れを構造的に防ぐ土台。

**Files:**
- Create: `lib/guide/resourceLink.ts`
- Test: `lib/guide/resourceLink.test.ts`

**Interfaces:**
- Consumes: `ResourceKind`（Task 3 で定義するが、本タスクでは型を先行定義し Task 3 が re-export する）
- Produces: `resourceLinkAttrs(kind: ResourceKind): { rel: string; target: string; isAd: boolean }`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// lib/guide/resourceLink.test.ts
import { describe, expect, it } from "vitest";
import { resourceLinkAttrs } from "./resourceLink";

describe("resourceLinkAttrs", () => {
  it("affiliate は rel に sponsored を含み、広告フラグが立ち、新規タブで開く", () => {
    const attrs = resourceLinkAttrs("affiliate");
    expect(attrs.rel).toContain("sponsored");
    expect(attrs.rel).toContain("noopener");
    expect(attrs.rel).toContain("noreferrer");
    expect(attrs.target).toBe("_blank");
    expect(attrs.isAd).toBe(true);
  });

  it("official は sponsored を付けず、広告フラグは立たない", () => {
    const attrs = resourceLinkAttrs("official");
    expect(attrs.rel).not.toContain("sponsored");
    expect(attrs.isAd).toBe(false);
  });

  it("guide も広告ではない", () => {
    expect(resourceLinkAttrs("guide").isAd).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/guide/resourceLink.test.ts`
Expected: FAIL（`resourceLink` モジュールが存在しない旨）

- [ ] **Step 3: 最小実装を書く**

```ts
// lib/guide/resourceLink.ts
export type ResourceKind = "official" | "guide" | "affiliate";

export interface ResourceLinkAttrs {
  rel: string;
  target: string;
  isAd: boolean;
}

/** リンク種別から rel / target / 広告フラグを決める。
 * affiliate は必ず sponsored を含め、広告として開示する（付け忘れ防止）。 */
export function resourceLinkAttrs(kind: ResourceKind): ResourceLinkAttrs {
  if (kind === "affiliate") {
    return { rel: "sponsored noopener noreferrer", target: "_blank", isAd: true };
  }
  return { rel: "noopener noreferrer", target: "_blank", isAd: false };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/guide/resourceLink.test.ts`
Expected: PASS（3件）

- [ ] **Step 5: コミット**

```bash
git add lib/guide/resourceLink.ts lib/guide/resourceLink.test.ts
git commit -m "feat: リソースリンクの rel/開示を決める resourceLinkAttrs を追加"
```

---

### Task 2: 「広告のみブロック」禁止の検証 `findAdOnlyGroups`

各リソースグループに非アフィリエイトのリンクが1つ以上あることを保証する純粋関数。実データに対するテストを**ビルド時ガード**として使う。

**Files:**
- Create: `lib/guide/validateResourceGroups.ts`
- Test: `lib/guide/validateResourceGroups.test.ts`

**Interfaces:**
- Consumes: `ResourceGroupData`（Task 3 で定義。本タスクでは最小の構造だけ参照）
- Produces: `findAdOnlyGroups(groups: ResourceGroupData[]): string[]`（違反グループの id 配列。空なら健全）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// lib/guide/validateResourceGroups.test.ts
import { describe, expect, it } from "vitest";
import { findAdOnlyGroups } from "./validateResourceGroups";
import type { ResourceGroupData } from "./resources";

const adOnly: ResourceGroupData = {
  id: "ad-only",
  heading: "広告だけ",
  links: [{ kind: "affiliate", label: "探す", url: "https://ad.example" }],
};
const healthy: ResourceGroupData = {
  id: "healthy",
  heading: "健全",
  links: [
    { kind: "official", label: "公式", url: "https://gov.example" },
    { kind: "affiliate", label: "探す", url: "https://ad.example" },
  ],
};

describe("findAdOnlyGroups", () => {
  it("広告のみのグループの id を返す", () => {
    expect(findAdOnlyGroups([adOnly, healthy])).toEqual(["ad-only"]);
  });
  it("すべて健全なら空配列", () => {
    expect(findAdOnlyGroups([healthy])).toEqual([]);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/guide/validateResourceGroups.test.ts`
Expected: FAIL（`validateResourceGroups` と `resources` が未定義。※`resources.ts` は Task 3 で作るため、この時点では import エラーになる。Task 3 完了後に再実行して緑にする）

- [ ] **Step 3: 最小実装を書く**

```ts
// lib/guide/validateResourceGroups.ts
import type { ResourceGroupData } from "./resources";

/** 非アフィリエイトのリンクを1つも持たない（＝広告のみの）グループの id を返す。
 * 信頼性原則「一次情報が主役／広告のみのブロックを作らない」を機械的に担保する。 */
export function findAdOnlyGroups(groups: ResourceGroupData[]): string[] {
  return groups
    .filter((g) => g.links.length > 0 && g.links.every((l) => l.kind === "affiliate"))
    .map((g) => g.id);
}
```

- [ ] **Step 4: Task 3 完了までテストは赤のまま**

この関数の型は `resources.ts` の `ResourceGroupData` に依存する。Task 3 を先に着手して型とデータを用意し、そこで本テスト＋実データテストをまとめて緑にする。ここでは実装ファイルのコミットのみ行う。

- [ ] **Step 5: コミット**

```bash
git add lib/guide/validateResourceGroups.ts lib/guide/validateResourceGroups.test.ts
git commit -m "feat: 広告のみブロックを検出する findAdOnlyGroups を追加"
```

---

### Task 3: リンクデータの型とシード `resources.ts`

リンクの型定義と、`/guide/living-alone`・`/guide/money` の初期データ（安定した公式ドメインのシード）。実データテストでビルド時ガードを効かせる。

**Files:**
- Create: `lib/guide/resources.ts`
- Test: `lib/guide/resources.test.ts`

**Interfaces:**
- Consumes: `ResourceKind`（Task 1 の `resourceLink.ts` から再輸出）
- Produces:
  - `interface ResourceLink { kind: ResourceKind; label: string; url: string; note?: string; advertiser?: string }`
  - `interface ResourceGroupData { id: string; heading: string; links: ResourceLink[] }`
  - `LIVING_ALONE_RESOURCES: ResourceGroupData[]`
  - `MONEY_RESOURCES: ResourceGroupData[]`

- [ ] **Step 1: 実データの健全性テストを書く**

```ts
// lib/guide/resources.test.ts
import { describe, expect, it } from "vitest";
import { LIVING_ALONE_RESOURCES, MONEY_RESOURCES } from "./resources";
import { findAdOnlyGroups } from "./validateResourceGroups";

const allGroups = [...LIVING_ALONE_RESOURCES, ...MONEY_RESOURCES];

describe("リソースデータの健全性", () => {
  it("広告のみのグループが存在しない（一次情報が主役）", () => {
    expect(findAdOnlyGroups(allGroups)).toEqual([]);
  });
  it("グループ id はページ内で一意（GA計測の position 用）", () => {
    const ids = allGroups.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("affiliate リンクは advertiser（計測識別子）を持つ", () => {
    const ads = allGroups.flatMap((g) => g.links).filter((l) => l.kind === "affiliate");
    for (const ad of ads) expect(ad.advertiser, ad.label).toBeTruthy();
  });
  it("すべての url が http(s) で始まる", () => {
    for (const g of allGroups)
      for (const l of g.links) expect(l.url).toMatch(/^https?:\/\//);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/guide/resources.test.ts`
Expected: FAIL（`resources` が存在しない）

- [ ] **Step 3: 型とシードデータを書く**

```ts
// lib/guide/resources.ts
//
// ProofLoop リソースカードのリンク集約。
// 【就活系NG】母体 iBECK が就活事業者のため、新卒スカウト・逆求人・転職
// エージェント系（ビズリーチ / UTBoard / OfferBox / dodaキャンパス 等）への
// アフィリエイト直リンクは禁止。バイト・インターン・クラウドソーシングは可。
// 【一次情報が主役】各グループに非アフィリエイトを1つ以上（findAdOnlyGroups で担保）。
// 【シード】以下は安定した公式ドメインの初期値。深い一次情報ソースと実際の
// アフィリエイト(MyLink)URL は Phase 0/1 で拡充する。
export type { ResourceKind } from "./resourceLink";
import type { ResourceKind } from "./resourceLink";

export interface ResourceLink {
  kind: ResourceKind;
  label: string;
  url: string;
  note?: string;       // 「公式・無料」などの補足
  advertiser?: string; // kind==='affiliate' のとき GA 計測に使う識別子
}

export interface ResourceGroupData {
  id: string;          // ページ内一意。GA の position に使う
  heading: string;
  links: ResourceLink[];
}

export const LIVING_ALONE_RESOURCES: ResourceGroupData[] = [
  {
    id: "moving",
    heading: "引越しを安くする",
    links: [
      {
        kind: "official",
        label: "国民生活センター（引越しサービスの相談）",
        url: "https://www.kokusen.go.jp/",
        note: "公式・無料",
      },
    ],
  },
  {
    id: "housing",
    heading: "部屋を探す・契約の基礎",
    links: [
      {
        kind: "official",
        label: "国土交通省 賃貸住宅の契約ガイド",
        url: "https://www.mlit.go.jp/",
        note: "公式・無料",
      },
    ],
  },
];

export const MONEY_RESOURCES: ResourceGroupData[] = [
  {
    id: "scholarship",
    heading: "奨学金を調べる",
    links: [
      {
        kind: "official",
        label: "日本学生支援機構（JASSO）奨学金",
        url: "https://www.jasso.go.jp/",
        note: "公式・無料",
      },
    ],
  },
  {
    id: "money-basics",
    heading: "お金の基礎知識",
    links: [
      {
        kind: "official",
        label: "金融庁 基礎から学べる金融ガイド",
        url: "https://www.fsa.go.jp/",
        note: "公式・無料",
      },
    ],
  },
];
```

- [ ] **Step 4: Task 2・Task 3 のテストをまとめて通す**

Run: `npx vitest run lib/guide/`
Expected: PASS（`resourceLink` 3件・`validateResourceGroups` 2件・`resources` 4件）

- [ ] **Step 5: コミット**

```bash
git add lib/guide/resources.ts lib/guide/resources.test.ts
git commit -m "feat: リソースカードの型と公式ソースのシードデータを追加"
```

---

### Task 4: アフィリエイトクリックの計測 `affiliateClick`

広告リンククリックを GA4 に送る。既存 `app/gpa/GpaCalculatorClient.tsx` の `window.gtag("event", ...)` パターンを踏襲。パラメータ生成を純粋関数に切り出してテストする。

**Files:**
- Create: `lib/analytics/affiliateClick.ts`
- Test: `lib/analytics/affiliateClick.test.ts`

**Interfaces:**
- Produces:
  - `interface AffiliateClickEvent { page: string; advertiser: string; position: string }`
  - `buildAffiliateClickParams(e: AffiliateClickEvent): { link_page: string; advertiser: string; position: string }`
  - `trackAffiliateClick(e: AffiliateClickEvent): void`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// lib/analytics/affiliateClick.test.ts
import { describe, expect, it } from "vitest";
import { buildAffiliateClickParams } from "./affiliateClick";

describe("buildAffiliateClickParams", () => {
  it("GA4 に送るパラメータへ変換する", () => {
    expect(
      buildAffiliateClickParams({
        page: "/guide/living-alone",
        advertiser: "albeeeX",
        position: "moving",
      })
    ).toEqual({ link_page: "/guide/living-alone", advertiser: "albeeeX", position: "moving" });
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx vitest run lib/analytics/affiliateClick.test.ts`
Expected: FAIL（`affiliateClick` が存在しない）

- [ ] **Step 3: 最小実装を書く**

```ts
// lib/analytics/affiliateClick.ts
export interface AffiliateClickEvent {
  page: string;       // 例 "/guide/living-alone"
  advertiser: string; // 例 "albeeeX"
  position: string;   // リソースグループ id
}

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void };

/** GA4 イベント affiliate_click のパラメータを組み立てる（純粋関数・テスト対象）。 */
export function buildAffiliateClickParams(e: AffiliateClickEvent) {
  return { link_page: e.page, advertiser: e.advertiser, position: e.position };
}

/** 広告クリックを GA4 に送る。gtag が無い環境では何もしない。 */
export function trackAffiliateClick(e: AffiliateClickEvent): void {
  if (typeof window === "undefined") return;
  const w = window as GtagWindow;
  if (typeof w.gtag !== "function") return;
  w.gtag("event", "affiliate_click", buildAffiliateClickParams(e));
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx vitest run lib/analytics/affiliateClick.test.ts`
Expected: PASS（1件）

- [ ] **Step 5: コミット**

```bash
git add lib/analytics/affiliateClick.ts lib/analytics/affiliateClick.test.ts
git commit -m "feat: 広告クリックを GA4 に送る affiliateClick を追加"
```

---

### Task 5: 表示コンポーネント `ResourceGroupList`

リソースグループ群を描画する薄いクライアントコンポーネント。`resourceLinkAttrs` と `trackAffiliateClick` を消費し、開示ラベルと rel を自動付与する。ユニットテストは行わず（既存規約）、lint とビルドで検証。

**Files:**
- Create: `components/guide/ResourceGroupList.tsx`

**Interfaces:**
- Consumes: `ResourceGroupData`（Task 3）、`resourceLinkAttrs`（Task 1）、`trackAffiliateClick`（Task 4）
- Produces: `export function ResourceGroupList({ groups, page }: { groups: ResourceGroupData[]; page: string }): JSX.Element`

- [ ] **Step 1: コンポーネントを書く**

```tsx
// components/guide/ResourceGroupList.tsx
"use client";

import { ExternalLink } from "lucide-react";
import type { ResourceGroupData } from "@/lib/guide/resources";
import { resourceLinkAttrs } from "@/lib/guide/resourceLink";
import { trackAffiliateClick } from "@/lib/analytics/affiliateClick";

export function ResourceGroupList({
  groups,
  page,
}: {
  groups: ResourceGroupData[];
  page: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.id} className="border border-rule bg-paper p-5 flex flex-col gap-3">
          <h3 className="text-ink font-bold text-base">{group.heading}</h3>
          <ul className="flex flex-col gap-2">
            {group.links.map((link) => {
              const attrs = resourceLinkAttrs(link.kind);
              return (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target={attrs.target}
                    rel={attrs.rel}
                    onClick={
                      attrs.isAd
                        ? () =>
                            trackAffiliateClick({
                              page,
                              advertiser: link.advertiser ?? "unknown",
                              position: group.id,
                            })
                        : undefined
                    }
                    className="flex items-center gap-1.5 text-sm text-ink hover:underline"
                  >
                    <span>{link.label}</span>
                    {attrs.isAd && (
                      <span className="text-[10px] text-graphite border border-rule px-1 py-0.5">
                        ※広告
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-graphite" aria-hidden="true" />
                  </a>
                  {link.note && (
                    <span className="block text-xs text-graphite mt-0.5">{link.note}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: lint とビルドで検証**

Run: `npm run lint`
Expected: エラーなし（未使用 import・型エラーが無い）

- [ ] **Step 3: コミット**

```bash
git add components/guide/ResourceGroupList.tsx
git commit -m "feat: リソースカード表示コンポーネント ResourceGroupList を追加"
```

---

### Task 6: `/guide/living-alone` に適用

一人暮らしガイドの本文末尾付近に、関連リソースのセクションを差し込む。

**Files:**
- Modify: `app/guide/living-alone/page.tsx`

**Interfaces:**
- Consumes: `ResourceGroupList`（Task 5）、`LIVING_ALONE_RESOURCES`（Task 3）

- [ ] **Step 1: import を追加**

`app/guide/living-alone/page.tsx` の import 群（先頭）に追記：

```tsx
import { ResourceGroupList } from "@/components/guide/ResourceGroupList";
import { LIVING_ALONE_RESOURCES } from "@/lib/guide/resources";
```

- [ ] **Step 2: セクションを本文末尾（関連ガイドへの導線の直前）に挿入**

ページ本文の JSX 内、末尾のまとめ／関連リンク直前に以下を挿入：

```tsx
<section className="flex flex-col gap-4">
  <h2 className="text-ink font-display text-xl md:text-2xl font-bold">
    一人暮らしの準備に役立つ窓口・サービス
  </h2>
  <p className="text-graphite text-sm">
    まず公式・無料の一次情報で相場と注意点を押さえ、必要なら関連サービスで比較してください。
  </p>
  <ResourceGroupList groups={LIVING_ALONE_RESOURCES} page="/guide/living-alone" />
</section>
```

- [ ] **Step 3: lint と型チェック**

Run: `npm run lint`
Expected: エラーなし

- [ ] **Step 4: 開発サーバーで目視（既存プロセスと同時 build しない）**

Run: `npm run dev`（既に起動済みなら再利用）→ ブラウザで `http://localhost:3000/guide/living-alone` を開く
Expected: 末尾にカードが2枚表示され、各カードに公式リンクが出る。広告リンクは現時点では無し（シードは公式のみ）。

- [ ] **Step 5: コミット**

```bash
git add app/guide/living-alone/page.tsx
git commit -m "feat: 一人暮らしガイドにリソースカードを設置"
```

---

### Task 7: `/guide/money` に適用

お金・奨学金ガイドに同じくリソースカードを差し込む。

**Files:**
- Modify: `app/guide/money/page.tsx`

**Interfaces:**
- Consumes: `ResourceGroupList`（Task 5）、`MONEY_RESOURCES`（Task 3）

- [ ] **Step 1: import を追加**

`app/guide/money/page.tsx` の import 群に追記：

```tsx
import { ResourceGroupList } from "@/components/guide/ResourceGroupList";
import { MONEY_RESOURCES } from "@/lib/guide/resources";
```

- [ ] **Step 2: セクションを本文末尾（関連ガイド導線の直前）に挿入**

```tsx
<section className="flex flex-col gap-4">
  <h2 className="text-ink font-display text-xl md:text-2xl font-bold">
    お金の相談に役立つ窓口・サービス
  </h2>
  <p className="text-graphite text-sm">
    公式・無料の一次情報で制度を確認し、必要なら関連サービスを比較してください。
  </p>
  <ResourceGroupList groups={MONEY_RESOURCES} page="/guide/money" />
</section>
```

- [ ] **Step 3: lint と型チェック**

Run: `npm run lint`
Expected: エラーなし

- [ ] **Step 4: 目視**

ブラウザで `http://localhost:3000/guide/money`
Expected: 末尾にカード2枚（奨学金＝JASSO、基礎知識＝金融庁）が表示される。

- [ ] **Step 5: 全テストを通す**

Run: `npm run test`
Expected: 既存テスト＋新規（`lib/guide/*`・`lib/analytics/*`）がすべて PASS

- [ ] **Step 6: コミット**

```bash
git add app/guide/money/page.tsx
git commit -m "feat: お金ガイドにリソースカードを設置"
```

---

## 後続（本計画の対象外・別ステップ）

- **Phase 0（VC案件棚卸し・claude-in-chrome）**：ユーザーのログイン済みブラウザで sid:3766669 の承認済み広告主を棚卸し → 各グループに `kind:"affiliate"` のリンク（MyLink URL・`advertiser`）を `resources.ts` に追記。追記後 `npm run test` で `findAdOnlyGroups` と url 形式の健全性が自動チェックされる。
- **Phase 1（一次情報の深堀り）**：各グループに公式・無料ソースを追加調査してユーザー承認の上で追記。
- **baito のリンク投入**：既存 `job_listings.affiliate_url` に生成済み MyLink を投入（コード変更不要・`/admin/jobs` か SQL）。
- **計画2：月次鮮度監視ジョブ**（GitHub Actions × Claude API）は別計画で作成。`resources.ts` を単一走査元にする。

## Self-Review

- **Spec coverage**：原則1（一次情報主役）=Task 2/3、原則2（開示・rel）=Task 1/5、原則3（広告のみ禁止）=Task 2、原則4（就活NG）=Task 3 コメント、原則5（VC他サイト・改変担保）=resources.ts 集約。リソースカード方式=Task 5-7。GA4計測（Phase 3）=Task 4/5。リンク管理=Task 3。鮮度監視（Phase 5）=計画2に委譲（明記済み）。Phase 0/1/baito=後続ステップに明記。網羅。
- **Placeholder scan**：TBD/TODO なし。全コードステップに実コードあり。
- **Type consistency**：`ResourceKind` は Task 1 で定義し Task 3 が re-export、`ResourceGroupData`/`ResourceLink` は Task 3、`resourceLinkAttrs`/`trackAffiliateClick`/`buildAffiliateClickParams` の名称は全タスクで一致。`ResourceGroupList({groups,page})` の props は Task 6/7 の呼び出しと一致。

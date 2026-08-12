# B18：claimトークンがGA4に送信されるのを止める Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/claim/[token]`・`/invite/[token]` へのアクセスで、GA4に送信される`page_path`・
`page_location`のいずれにも生のトークン文字列が含まれないようにする。

**Architecture:** ①パス文字列を丸める純粋関数を1つ作り、TDDでテストする。②GA4の自動
ページビュー送信（`gtag('config', ...)`が読み込み時に自動発火する分）を無効化し、
SPA内遷移用の既存トラッカーに「初回ロードも含めて」丸めたパスを手動送信させる形に一本化する。
③ローカルの開発サーバーとブラウザで実際にGA4のイベントペイロードを目視確認する。

**Tech Stack:** Next.js 15 App Router、`next/script`、GA4 `gtag.js`、Vitest。

## Global Constraints

- 対象ルートは `/claim/[token]` と `/invite/[token]` の2つのみ。他の動的ルート
  （`/organizations/[id]` 等）は対象外（設計書 §2 参照・団体ページのGA4計測を壊すため）
- `page_path` と `page_location` の**両方**を丸める。片方だけでは生トークンが残る
- トークンの丸めはパスの形（`/claim/`または`/invite/`に続く最初のセグメント）だけで判定し、
  UUID形式かどうかは検証しない（過剰に丸める方を安全側とする）
- `/claim/[token]`・`/invite/[token]`はクエリパラメータを使っていない（実装確認済み）ので、
  丸め処理はパス部分のみを対象にすればよい
- 新規ロジックは純粋関数として`lib/analytics/`に切り出し、ユニットテストを書く
  （`lib/analytics/affiliateClick.ts`と同じ配置・スタイル）
- `npm run dev`と`npm run build`を同時に走らせない。ポート3000に旧プロセスが残っていないか
  確認してから開発サーバーを起動する

---

### Task 1: `redactTokenPath` 純粋関数

**Files:**
- Create: `lib/analytics/redactTokenPath.ts`
- Test: `lib/analytics/redactTokenPath.test.ts`

**Interfaces:**
- Produces: `redactTokenPath(pathname: string): string` — Task 2 がこれを
  `page_path`・`page_location`の組み立てに使う。

- [ ] **Step 1: 失敗するテストを書く**

`lib/analytics/redactTokenPath.test.ts` を新規作成する。

```ts
import { describe, expect, it } from "vitest";
import { redactTokenPath } from "./redactTokenPath";

describe("redactTokenPath", () => {
  it("claimトークンを丸める", () => {
    expect(
      redactTokenPath("/claim/a1b2c3d4-e5f6-47a8-89b0-1234567890ab")
    ).toBe("/claim/[token]");
  });

  it("inviteトークンを丸める", () => {
    expect(
      redactTokenPath("/invite/a1b2c3d4-e5f6-47a8-89b0-1234567890ab")
    ).toBe("/invite/[token]");
  });

  it("UUID形式でない値も丸める（形式チェックはしない・過剰に丸める方を選ぶ）", () => {
    expect(redactTokenPath("/claim/not-a-real-uuid")).toBe("/claim/[token]");
  });

  it("無関係のパスはそのまま返す", () => {
    expect(
      redactTokenPath("/organizations/002e59d9-d041-4893-ac46-537a34e06c90")
    ).toBe("/organizations/002e59d9-d041-4893-ac46-537a34e06c90");
    expect(redactTokenPath("/")).toBe("/");
    expect(redactTokenPath("/guide/credits")).toBe("/guide/credits");
  });

  it("claim/invite で始まるだけの無関係なパスは丸めない", () => {
    expect(redactTokenPath("/claiming-something")).toBe(
      "/claiming-something"
    );
  });

  it("トークンが無い /claim・/invite 単体はそのまま返す", () => {
    expect(redactTokenPath("/claim")).toBe("/claim");
    expect(redactTokenPath("/invite")).toBe("/invite");
  });

  it("末尾スラッシュがあっても丸める（トークンより後ろは落ちる）", () => {
    expect(redactTokenPath("/claim/abc123/")).toBe("/claim/[token]");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認する**

Run: `npx vitest run lib/analytics/redactTokenPath.test.ts`
Expected: FAIL（`Cannot find module './redactTokenPath'` または同趣旨のエラー）

- [ ] **Step 3: 最小実装を書く**

`lib/analytics/redactTokenPath.ts` を新規作成する。

```ts
const TOKEN_ROUTE_RE = /^\/(claim|invite)\/[^/]+/;

/**
 * GA4に送るパス文字列から claim / invite のトークンを丸める。
 *
 * `/claim/[token]`・`/invite/[token]` のトークンは単回使用の鍵（保持していれば
 * ログイン不要で操作できる）。GA4のレポートを見られる者に生のトークンを渡さない
 * ため、page_path / page_location のどちらにもこの関数を経由させる
 * （components/GoogleAnalytics.tsx）。
 *
 * UUID形式かどうかは検証しない。厳密な検証にすると、不正な値や将来の形式変更を
 * 取りこぼして漏洩する側に倒れるため、ここでは過剰に丸める方を選ぶ
 * （lib/organizations/paths.ts の organizationPagePath とは逆方向の判断：
 * あちらは甘い判定だと事故が起きるので厳密に倒している）。
 */
export function redactTokenPath(pathname: string): string {
  const match = pathname.match(TOKEN_ROUTE_RE);
  if (!match) return pathname;
  return `/${match[1]}/[token]`;
}
```

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run lib/analytics/redactTokenPath.test.ts`
Expected: PASS（7件のテストすべて）

- [ ] **Step 5: コミット**

```bash
git add lib/analytics/redactTokenPath.ts lib/analytics/redactTokenPath.test.ts
git commit -m "feat(analytics): claim/inviteトークンをGA4送信前に丸める純粋関数を追加"
```

---

### Task 2: `GoogleAnalytics.tsx` の送信経路を一本化する

**Files:**
- Modify: `components/GoogleAnalytics.tsx`（全65行を以下の内容に置き換える）

**Interfaces:**
- Consumes: `redactTokenPath(pathname: string): string`（Task 1で作成）

- [ ] **Step 1: 現状のファイル内容を確認する**

Read: `components/GoogleAnalytics.tsx`（現状65行。以下の実装で全体を置き換える）

- [ ] **Step 2: ファイル全体を書き換える**

`components/GoogleAnalytics.tsx` の内容を次に置き換える。

```tsx
"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { redactTokenPath } from "@/lib/analytics/redactTokenPath";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type GtagWindow = Window & {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
};

/**
 * SPA内の画面遷移ごとにページビューを手動送信する。
 *
 * 🚨 初回ロード分もここで送る。`gtag('config', ...)` の自動page_view送信は
 * `window.location` をブラウザが直接読み取るため、Reactのコードで後から
 * 介入できない（claimトークンを含む生URLがそのまま送られる）。そのため
 * 下の GoogleAnalytics コンポーネントで `send_page_view: false` を指定して
 * 自動送信を止め、初回を含む全ページビューをこちらに一本化している。
 * 「初回はスキップ」という分岐は絶対に戻さないこと。
 */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const w = window as GtagWindow;
    if (typeof w.gtag !== "function") return;

    const redactedPath = redactTokenPath(pathname);
    const query = searchParams.toString();
    const path = redactedPath + (query ? `?${query}` : "");

    w.gtag("event", "page_view", {
      page_path: path,
      // window.location.href をそのまま送ると page_path を丸めても
      // フルURL側に生トークンが残る。origin + 丸めたpath から組み立て直す。
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
```

変更点の要約：
- `useRef`のインポートと`isFirstRun`のロジックを削除（初回スキップをやめるため）
- `gtag('config', '${GA_ID}')` に `{ send_page_view: false }` を追加
- `page_path`の組み立てに`redactTokenPath(pathname)`を経由させる
- `page_location`を`window.location.href`から`${window.location.origin}${path}`に変更

- [ ] **Step 3: 型チェックを通す**

Run: `npx tsc --noEmit`
Expected: エラー無し

- [ ] **Step 4: 既存テストが壊れていないことを確認する**

Run: `npm test`
Expected: 全テストPASS（`GoogleAnalytics.tsx`自体はテスト対象外のため、既存テスト件数から
増減しない）

- [ ] **Step 5: コミット**

```bash
git add components/GoogleAnalytics.tsx
git commit -m "fix(analytics): GA4自動page_view送信を止め、初回ロードもトークンを丸めて送る"
```

---

### Task 3: ブラウザでの実地確認

CLAUDE.mdの方針（UI/フロントエンド変更は実際にブラウザで動作確認してから完了とする）に
従い、開発サーバー上で実際のGA4イベントペイロードを確認する。

**Files:** なし（確認のみ）

**Interfaces:** なし

- [ ] **Step 1: ポート3000が空いていることを確認する**

PowerShellで確認する。

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
```

Expected: 何も出力されない（空いている）。何か出力される場合は、その`OwningProcess`を
`Stop-Process -Id <PID> -Force`で停止してから次に進む。

- [ ] **Step 2: 一時的なGA_IDを設定して開発サーバーを起動する**

ローカルの`.env.local`には`NEXT_PUBLIC_GA_ID`が設定されていない
（`GoogleAnalytics`コンポーネントは`GA_ID`が無いと何も描画しない）ため、
この確認のためだけに環境変数をプロセス起動時に一時指定する。`.env.local`は編集しない。

```powershell
$env:NEXT_PUBLIC_GA_ID = "G-TESTLOCAL"
npm run dev
```

Expected: `- Local: http://localhost:3000` が表示される。

- [ ] **Step 3: claude-in-chromeのツールをロードする**

まだロードしていない場合、次のクエリでロードする。

```
ToolSearch: "select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__javascript_tool"
```

- [ ] **Step 4: `/claim/<ダミートークン>` に直接アクセスし、初回ロードのイベントを確認する**

新規タブで `http://localhost:3000/claim/00000000-1111-2222-3333-444444444444` を開く
（`tabs_create_mcp`→`navigate`、または直接navigateでタブ作成）。

ページ読み込み後、`javascript_tool`で次を評価する。

```js
JSON.stringify(window.dataLayer)
```

Expected: `dataLayer`の中に`['event', 'page_view', {...}]`という形の要素があり、その
`page_path`と`page_location`のいずれにも`00000000-1111-2222-3333-444444444444`という
文字列が**含まれていない**こと。`page_path`は`/claim/[token]`になっていること。

⚠️ `gtag('config', ...)`由来の自動`config`イベントそのもの（`['config', 'G-TESTLOCAL']`
という形）は`page_view`ではないので、そこにパスは乗らない。確認すべきは手動送信した
`page_view`イベントの中身であり、これが初回ロードでも発火していること自体が
Task 2の変更（`send_page_view: false`＋初回スキップの削除）が効いている証拠になる。

- [ ] **Step 5: SPA内遷移でも丸められることを確認する**

同じタブ内で `javascript_tool` を使い、ページ内のリンク（例：ロゴなど`/`へのリンク）を
クリックさせるか、`history.pushState`相当のNext.jsルーティングを発火させる操作を行う
（`computer`ツールでロゴをクリックする等）。

Expected: 遷移後、`window.dataLayer`に新しい`page_view`イベントが追加されており、
`page_path`が遷移先の実際のパス（例：`/`）になっていること。

- [ ] **Step 6: 無関係なページでは丸められていないことを確認する**

`http://localhost:3000/guide/credits` のような、claim/invite以外のページに直接アクセスする。

Expected: `dataLayer`内の`page_view`イベントの`page_path`が`/guide/credits`のまま
（丸められずに）送信されていること。他ページの計測が壊れていないことの確認。

- [ ] **Step 7: 開発サーバーを停止する**

```powershell
$c = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
foreach ($x in $c) { Stop-Process -Id $x.OwningProcess -Force }
```

- [ ] **Step 8: 最終確認とコミット**

Run: `npx tsc --noEmit && npm test`
Expected: 両方ともクリーン。

この時点でコミットすべき新規変更が無ければ（Task 1・2で既にコミット済みのため）、
このタスクはコミット不要。ブラウザ確認で問題が見つかった場合のみ、修正してコミットする。

---

## 完了条件（設計書§6の再掲）

- `/claim/<token>`・`/invite/<token>`への初回アクセス・SPA内遷移のいずれでも、
  GA4に送信される`page_path`・`page_location`に生のトークンが含まれない
- 他のページのGA4計測（`page_path`・`page_location`とも）が従来どおり動作する
- `npm test`・`npx tsc --noEmit`が通る

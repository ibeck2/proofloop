# 設計：B18 claimトークンがGA4に送信されるのを止める

**作成日：2026-08-12**

対象：`docs/models/build-task-sheet.mjs` の B18（公開前ゲート・4件のうち最初の1件）。
`docs/task-board.md` タスクI2・`docs/superpowers/plans/2026-08-12-d9-d10-plan.md` §3 参照。

---

## 1. 問題

`/claim/[token]`・`/invite/[token]` はトークン文字列そのものが**単回使用の鍵**（保持していれば
ログイン不要で操作できる）。現状のGA4計測（`components/GoogleAnalytics.tsx`）は、この
トークンを含む完全URLをそのまま送信している。GA4のレポートを閲覧できる者は、
発行済みだが未使用のトークンを一覧・抽出できてしまう。

発行後に直しても、**既に記録されたトークンはGA4から消えない**（別途の削除申請が必要）。
そのため、claimトークンを1件でも発行する前に塞ぐ必要がある。

## 2. 範囲

`/claim/[token]` と `/invite/[token]` の2ルートのみ。

`/organizations/[id]` や `/mypage/selection/[id]` のような他の動的ルートは対象外とする。
これらのIDは「知っているだけで操作できる鍵」ではなく、アクセス可否は最終的にRLSが判定する
ため、GA4に載ること自体が権限昇格には繋がらない。特に `/organizations/[id]` は
CLAUDE.md §6 の最優先課題（団体ページ2,400件超のインデックス登録・個別クリックの計測）が
団体ごとのGA4計測に依存しており、丸めると計測手段そのものを壊す。

## 3. 技術的な制約

GA4の`gtag('config', GA_ID)`は、スクリプト読み込み時に**自動でページビューを送信**する。
この自動送信は`window.location`をブラウザが直接読み取って行われるため、Reactのコードで
後から介入できない。既存の`PageViewTracker`（`components/GoogleAnalytics.tsx`）は
SPA内の画面遷移だけを手動送信しており、初回ロードの自動送信はそのまま素通りしている。

⇒ `/claim/<token>`・`/invite/<token>`へメールのリンクから直接アクセスした最初の1回
（＝最も典型的なアクセス経路）が、この自動送信で漏れる。

## 4. 設計

自動送信を無効化し、初回を含む全ページビューを手動送信に一本化する。

### 4.1 `lib/analytics/redactTokenPath.ts`（新規・純粋関数）

```
redactTokenPath(pathname: string): string
```

- `/claim/<なにか>` → `/claim/[token]`
- `/invite/<なにか>` → `/invite/[token]`
- それ以外のパスはそのまま返す

UUID形式かどうかは検証しない。パスの形（`/claim/`または`/invite/`に続く最初のセグメント）
だけで判定する。厳密なUUID検証にすると、不正な値や将来の形式変更を取りこぼして
漏洩する側に倒れるため、ここでは過剰に丸める方を選ぶ
（`lib/organizations/paths.ts`の`organizationPagePath`とは目的が逆：あちらは
「甘い判定だと事故（全ページ無効化）が起きる」ので厳密に倒す。こちらは
「甘い判定だと漏洩したままになる」ので広く倒す）。

### 4.2 `components/GoogleAnalytics.tsx`（修正）

1. `gtag('config', GA_ID, { send_page_view: false })` を追加し、自動送信を止める。
2. `PageViewTracker`の「初回はスキップ」ロジックを削除し、初回を含めて毎回、手動で
   ページビューを送る。
3. 送信する`page_path`は`redactTokenPath(pathname)`を経由させる。
4. `page_location`（現状は`window.location.href`をそのまま送っている）も、
   `origin + 丸めたpath`から組み立て直す。ここを見落とすと`page_path`だけ丸めても
   フルURLの方に生トークンが残る。

`/claim/[token]`・`/invite/[token]`ともクエリパラメータは使っていない
（`router.replace`のみで`useSearchParams`の参照なし・実装コード確認済み）ため、
パス部分の置換だけで足りる。

## 5. テスト

- `redactTokenPath`は純粋関数なのでユニットテストを書く（claim/invite/無関係パス/
  末尾スラッシュ等のケース）。
- `GoogleAnalytics.tsx`自体はRTL未導入（`docs/task-board.md`に既知の残タスクとして
  記載済み）のためユニットテスト対象にしない。開発サーバーでネットワークタブ／
  `window.dataLayer`を見て、実際に丸められた値が送信されることを目視確認する。

## 6. 完了条件

- `/claim/<token>`・`/invite/<token>`への初回アクセス・SPA内遷移のいずれでも、
  GA4に送信される`page_path`・`page_location`に生のトークンが含まれない
- 他のページのGA4計測（`page_path`・`page_location`とも）が従来どおり動作する
- `npm test`・`npx tsc --noEmit`が通る

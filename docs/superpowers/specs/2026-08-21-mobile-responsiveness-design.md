# スマホ対応の網羅的な改修 — 設計

**作成：2026-08-21**

> ダークモード導入は別スペックとして後続で扱う（本設計の対象外）。

---

## 1. 背景・狙い

オーナーから2件の具体的な不具合報告があった。

1. **団体管理画面（`/club*`）**：モバイル幅で他の管理機能に遷移しようとしてハンバーガーメニュー（≡マーク）を押しても反応しない。
2. **学生団体向けLP `/for-clubs`**：「LINEでの管理限界じゃないですか？」のセクション付近で画像がはみ出ている。

この2件は氷山の一角である可能性が高く、「他にも色々なところで型崩れしているだろうから網羅的に洗い出したい」というのが今回のゴール。B2C（ガイド・診断等）とB2B団体管理画面を対象に、モバイル幅（375px基準）での崩れ・非機能箇所を洗い出し、修正する。

`/admin`（Basic認証で保護された運営内部ツール）と企業側（`/companydashboard`等）は対象外。

---

## 2. 既知バグの原因（調査済み）

### 2.1 `app/(club)/layout.tsx` のハンバーガーメニュー未実装

```tsx
<button className="text-graphite" type="button" aria-label="メニュー">
  <Menu className="w-6 h-6" aria-hidden="true" />
</button>
```

`onClick`が存在しない。`ClubSidebar`（`components/ClubSidebar.tsx`）は`hidden ... lg:flex`でモバイル幅では非表示になるが、代替のドロワーメニューが実装されていない——ボタンだけが置かれた未完成状態。

`components/AppShell.tsx`（学生向け共通ヘッダー）には、`isMenuOpen`状態＋オーバーレイ＋スライドインする`<aside>`という、同じ課題に対する既存の動くパターンがある（108〜336行目）。これを`ClubSidebar`に対しても同型で適用する。

### 2.2 `app/for-clubs/page.tsx` のMockコンポーネント群のはみ出し

「画面イメージ」として`<img>`ではなくdivで組んだモックアップ（`MockFinance`・`MockInboxKanban`・`MockTimeline`・`MockCalendarEvent`・`MockTasksInvite`）が使われている。`MockInboxKanban`では`w-[38%]`のような固定割合幅の子要素がflexコンテナ内でラップせず、狭い画面で横にはみ出す。他のMockコンポーネントも同様の固定幅パターンを使っている疑いがあるため、5つ全てを個別に375px幅で確認する。

---

## 3. 対象範囲

### B2C（メディア・ガイド系）
`/`、`/baito`、`/baito/simulator`、`/guide`、`/guide/circle`、`/guide/study-abroad`、`/guide/study-abroad/recommend`、`/guide/credits`、`/guide/money`、`/guide/living-alone`、`/gpa`、`/search`、`/organizations/[id]`、`/classinfo`、`/schedule`、`/timeline`、`/mypage`、`/mypage/messages`、`/mypage/notifications`、`/login`、`/signup`、`/for-clubs`、`/manual`

### B2B団体管理
`/clubdashboard`（＋`/clubdashboard/reviews`）、`/clubtasks`、`/clubevents`、`/clubats`、`/clubposts`、`/clubmessages`、`/clubphotos`、`/clubprofile`、`/clubsettings/members`、`/clubfinance`、`/clubschedule`（＋詳細画面）

### 対象外
`/admin`配下（Basic認証で保護された運営内部ツール）、`/companydashboard`・`/companysearch`・`/companymessage`（企業側）

---

## 4. 進め方

### Step 1：既知バグの先行修正
- ClubSidebarのモバイルドロワー実装（AppShellのパターンを流用）
- for-clubsのMockコンポーネント5つのはみ出し修正

### Step 2：網羅監査
1. **Phase 1（当たりつけ・静的検索）**：`w-\[固定値\]`・`grid-cols-\d`（`md:`等のブレークポイント無し）・横並びflexで`overflow-x`未設定、といった崩れやすいパターンをgrepで洗い出し、優先確認ページの見当をつける。
2. **Phase 2（実機確認）**：`claude-in-chrome`で375px幅ビューポートに設定し、対象ページを1つずつ開く。
   - 見た目の崩れ（はみ出し・重なり・折り返し不良）をスクリーンショットで確認
   - **操作した時に反応するか**も必ず確認する（ClubSidebarの件のように、見た目は正常でもボタン・モーダル・ドロワー・カンバンD&Dが機能していないケースがあるため）
   - ログイン必須ページ（`/mypage`系・club系）は確認用アカウントでログインした状態で確認する

### Step 3：監査結果の一覧化
`docs/superpowers/specs/2026-08-21-mobile-audit-findings.md`に、ページごとに「症状・再現手順・推定原因・重大度」を記録する。重大度は以下の3段階：
- **機能不可**：ボタン・リンク・フォーム等が操作できない
- **崩れて見苦しい**：はみ出し・重なり・読みにくさがあるが操作は可能
- **軽微**：余白や見た目の細かい違和感

スクリーンショットはスクラッチパッドに保存し、設計書には必要な箇所だけ埋め込む。

### Step 4：修正
- **一覧を確定させてから**まとめて優先度順に修正する（見つけ次第その場で直すと、同根の不具合パターンを1箇所しか直さず見落とす恐れがあるため）
- 優先度は「機能不可」→「崩れて見苦しい」→「軽微」の順
- 原因が共通コンポーネント（`Input`/`Textarea`のパディング修正のような前例）に集約できる場合は、個別ページより先にそちらを直す

### Step 5：検証
- 修正のたびに375px幅で再スクリーンショットし解消を確認
- 全修正完了後に`npm test`・`tsc --noEmit`を通す

---

## 5. 未決事項・注意点

- 監査で見つかる不具合の総量は事前に見積もれない。Step 3の一覧化が終わった時点で、修正のボリューム次第では優先度の高いものから着手し、軽微なものは後回しにする判断が必要になる可能性がある。
- ダークモード導入は本設計の対象外。次のスペックとして別途着手する。

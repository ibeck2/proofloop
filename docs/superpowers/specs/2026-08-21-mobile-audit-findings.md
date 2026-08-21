# モバイル網羅監査 結果

**作成：2026-08-21**（Phase 1）

> 設計：`docs/superpowers/specs/2026-08-21-mobile-responsiveness-design.md`
> 計画：`docs/superpowers/plans/2026-08-21-mobile-responsiveness.md`

## Phase 1：コード検索の結果（当たりつけ）

対象は `app/` `components/` 配下の `*.tsx`。`/admin` 配下と企業側ページ（`/companydashboard` `/companysearch` `/companymessage`）は本計画のスコープ外のため、ヒットしても候補には含めない（下記に別記）。

### 固定幅パターン（`w-[...]`）

`grep -rn 'w-\['` で `app/` 108件・`components/` 11件がヒット。大半は次のいずれかで、モバイルで崩れるリスクが低いため候補から除外した。
- アイコンサイズ（`w-[18px]` `w-[14px]` 等）
- `w-full max-w-[...]`（幅は流動、上限のみ固定）
- `w-[min(...px,...vw)]`（モーダル・ドロワーで既にvw基準の安全な書き方）
- Kanban/カンバンの横スクロールカラム（`w-[300px] flex-shrink-0` 等）で、親に `overflow-x-auto` があり横スクロール前提として意図的に固定幅にしているもの（`app/(club)/clubtasks/SwimlaneBoard.tsx:117`、`app/(club)/clubtasks/page.tsx:1191`、`app/(club)/clubats/page.tsx:627`。いずれも親要素で `overflow-x-auto`／`min-w-max` を確認済み）
- イベントカードの横スクロールカルーセル（`components/UpcomingEvents.tsx:78,117` の `w-[320px]`。親 `<div className="flex overflow-x-auto ... snap-x snap-mandatory">` を確認済み）

候補として残したもの：

| ファイル:行 | 該当コード | 所感 |
| --- | --- | --- |
| `app/for-clubs/page.tsx:69` | `<div className="flex w-[38%] min-w-0 flex-col gap-2 ...">`（`MockInboxKanban`内、LPの製品モックアップ装飾） | 設計仕様書が例示する「flex行内の`w-[38%]`」そのものの形だが、`min-w-0`は既に付いており、子要素側にも`truncate`がある（69〜82行目）。純粋な%指定なのでビューポート追従はする。フォントが10〜11pxと非常に小さいため、崩れるというより「モバイルで潰れて読めない」可能性がある。Phase 2でLPをスマホ幅で見た目だけ確認する価値あり（優先度は低〜中）。 |

### レスポンシブ対応の無いgrid-cols

`grid-cols-[2-9]` は69件ヒットしたが、大半は同じclassName文字列内に`sm:`/`md:`/`lg:`のいずれかのブレークポイントを持つ（`grid-cols-1 md:grid-cols-2`等）ため対象外。ブレークポイントを一切持たない固定列のみを候補として抜き出した。

| ファイル:行 | 該当コード | 所感 |
| --- | --- | --- |
| `app/baito/simulator/page.tsx:694` | `<div className="grid grid-cols-3 gap-3">`（3指標カード：自由時間／月収見込み／年収見込み） | 3列固定で`¥123,456`のような通貨表示・パーセント表示を含む。375px幅だと1カラムあたり実質80px前後まで狭まり、`text-xl font-black`の金額が窮屈になる可能性。候補として残す（優先度：中〜高）。 |
| `app/baito/simulator/page.tsx:764` | `<div className="grid grid-cols-4 gap-2">`（通学時間選択ボタン：15分/30分/60分/90分） | 4列固定。ボタン内テキストは短い（「15分」等）ため崩壊の可能性は低いが、320px幅の実機では1列あたり70px前後とかなり狭い。念のため候補（優先度：低〜中）。 |
| `app/baito/simulator/page.tsx:352` | `<div className="grid grid-cols-2 gap-x-6 gap-y-1.5">`（ドーナツチャートの凡例） | 2列固定・短いラベル+アイコンのみ。ノイズと判断し除外寄りだが記録のみ残す（優先度：低、実機確認は任意）。 |
| `app/baito/simulator/page.tsx:749` | `<div className="grid grid-cols-2 gap-2">`（サークル頻度の選択ボタン） | 2列固定・ボタンラベルは短い想定。ノイズと判断（優先度：低）。 |
| `app/(club)/clubfinance/TransactionModal.tsx:84`, `:133` | `<div className="grid grid-cols-2 gap-3">`（支出/収入トグル、領収書番号/写真の2カラムフォーム） | モーダル内（`max-w-lg`）の2列固定だが、ラベル・ボタン文言は短く、`max-w-lg`自体が最狭幅では画面幅いっぱいに縮むため実質問題なし。ノイズと判断し除外（優先度：低、記録のみ）。 |
| `app/schedule/page.tsx:320` | `<div className="grid grid-cols-7 gap-px bg-rule rounded overflow-hidden">`（月間カレンダーの曜日ヘッダー＋日付セル） | カレンダーは仕様上7列が必須なので「ブレークポイントで列数を変える」修正はそもそも成立しない。ただし7列固定はモバイル崩れの典型パターンであり、セル内のイベント表示・タップ領域が375px幅で潰れていないか実機確認が必要。Phase 2の優先確認候補（優先度：中〜高）。 |
| `app/(club)/clubtasks/CalendarView.tsx:233`, `:251` | `<div className="grid grid-cols-7 border-b border-rule bg-mist">` / `<div className="cal-week relative grid grid-cols-7">`（タスクのガントカレンダー） | 同上。タスクバー（Ganttスタイル）が重なるレイアウトのため、7列固定に加えてバー表示の折り返し・はみ出しリスクもある。Phase 2の優先確認候補（優先度：中〜高）。 |

### 横スクロール対応の無いテーブル

`<table` は`app/`で16件ヒット。スコープ内（`/admin`・企業側を除く）のものは**全件**、直近の親要素（`overflow-x-auto`を持つ`<div>`）に囲まれていることを確認した。該当ファイル：
`app/about/page.tsx:51`、`app/(club)/clubtasks/TableView.tsx:114`、`app/(club)/clubschedule/[id]/page.tsx:320,408`、`app/guide/money/page.tsx:300`、`app/gpa/page.tsx:153`、`app/guide/study-abroad/page.tsx:240`（`min-w-[700px]`併用）、`app/(club)/clubfinance/FinanceReportContent.tsx:92`（`min-w-[520px]`併用）、`app/(club)/clubfinance/FinanceOverviewContent.tsx:291`（`min-w-[720px]`併用）、`app/guide/credits/page.tsx:451,553`、`app/baito/page.tsx:437,482`、`app/guide/living-alone/page.tsx:358`、`components/legal/LegalDocumentView.tsx:57`。

このため**候補なし**。強いて記録すると、`min-w-[...]`を併用しているテーブル（study-abroad, FinanceReport, FinanceOverview）は横スクロールが前提の設計であり正しい実装なので、Phase 2では「横スクロールが実機で本当に指で操作できるか」の確認のみで十分。

### スコープ外（`/admin`・企業側）で見つかったが候補に含めないもの

- `app/admin/reviews/page.tsx:218`（`w-[18px]`アイコン）、`app/companysearch/page.tsx:158`（`w-full md:w-1/3 min-w-[280px]`）、`app/companymessage/page.tsx:66`（`w-[30%]`の2カラムレイアウト、DM一覧＋詳細）、`app/companydashboard/page.tsx:23`（`w-[4px]`装飾）はいずれも計画のGlobal Constraintsによりスコープ外。
- `app/admin/jobs/page.tsx:152`、`app/companysearch/page.tsx:81`、`app/admin/page.tsx:133`、`app/admin/claims/page.tsx:293`の`grid-cols`はいずれも`md:`/`lg:`付きで対象外、または`/admin`スコープ外。
- `app/companydashboard/page.tsx:84`の`<table>`は**`overflow-x-auto`を持たない**（親は`overflow-hidden`のみ）。企業側のためスコープ外だが、将来この範囲を対象に含める判断をした場合は最初に見るべき箇所として記録しておく。

## Phase 2：実機確認の結果

（Task 4・5で追記）

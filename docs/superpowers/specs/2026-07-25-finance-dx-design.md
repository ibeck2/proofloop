# 財務DX（学生団体会計）v1 設計

**作成日：2026-07-25**
**対象：学生団体の会計担当が「日々の記録 → 期末の決算 → 助成金/協賛の提出書類」までを一気通貫で行える財務モジュール（v1）**

関連：`CLAUDE.md` §2（4つの能力モデル：組織基盤・資産継承）、§6（協賛マッチング）、§8（学祭実行委のスマホ承認）

---

## 1. 最初に押さえるべき結論

**この機能の価値は「代替わりで消えない台帳」と「面倒な提出書類をExcelで吐く」ことにある。**

- 学生団体の会計は**現金主義・単式簿記が実態**。フクザツな複式簿記やフルな貸借対照表（BS）は過剰で、現場は使わない。v1が出す成果物は正確には**収支計算書（≒PL）＝費目別集計＋予算対比**であり、BSは意図的に対象外とする（現金/預金の期末残高で代替）。
- 助成金（財団・大学・自治体）も企業協賛も、団体に求める最終アウトプットは共通で「**何に・いくら・なぜ使ったかを費目別に集計し、領収書/写真を紐づけて提出**」。ここを自動で吐けることが外部提出の痛みに直撃する。
- 学生はCSVを扱えない前提に立ち、**出力は罫線・書式を整えた .xlsx** とする。
- 法人口座の**振込・出金手数料**は積もると数千円単位の残高ズレを生むため、取りこぼさず記録できる導線を最初から入れる。

### 事業の三層（A背骨 / B出口 / C布石）

- **A（背骨）**：会計担当の日々の記録と期末決算を楽にし、代替わりで断絶しない台帳にする（＝ビジョン「流動を蓄積に」）。**v1の投資の重心はここ**。
- **B（軽く出す）**：貯めた台帳から **整形済み .xlsx（収支報告書＋出納帳）** を出力。助成金の収支決算・協賛の実施報告にそのまま流用できる状態にする。
- **C（布石のみ）**：全取引に「**事業/イベント/協賛・助成源**」タグを持たせる。将来、協賛マッチング（`companysearch`/`companymessage`）→使途の透明記録→企業への自動レポート（Resend）へ、**データモデルを変えずに**接続できるようにしておく。v1ではタグ次元を用意するだけで、企業連携・自動送信は実装しない。

---

## 2. スコープ

### v1 に含める

- 取引記録（出納帳）：日付・収支区分・費目・金額・摘要・事業タグ・領収書写真
- 費目マスタ（デフォルト投入＋編集）
- 事業/イベント/協賛・助成源タグ
- 予算対比（費目別に予算を入れ、実績との差額を表示）
- 会計期間/年度（繰越金＝期首残高、期末残高）
- 残高表示（現在残高・今期収入計・今期支出計）
- **振込・出金手数料の記録**（本体行と紐づく手数料行を自動生成）
- 領収書写真のアップロードと取引への紐づけ（Supabase Storage・非公開）
- **.xlsx エクスポート**（罫線・書式整形。収支報告書シート＋出納帳シート）
- 会計担当権限（`can_manage_finance`）と、全メンバー閲覧（透明性）

### v1 に含めない（後続フェーズ・データモデルは布石済み）

- 複数口座・残高照合（現金/銀行/電子マネーの分離）
- 立替精算ワークフロー（立替者・申請→承認→精算ステータス）
- 領収書OCRによる自動記帳
- 協賛マッチング直結の自動レポート送信（C の本体）
- 領収書台紙PDF・xlsx以外の帳票

---

## 3. データモデル

すべて `organization_id` スコープ、RLS 有効。金額は**整数（円）**で保持する。

### 3.1 テーブル

| テーブル | 役割 | 主なカラム |
| --- | --- | --- |
| `finance_periods` | 会計期間/年度 | `id`, `organization_id`, `name`(例 "2026年度"), `starts_on` date, `ends_on` date, `opening_balance` int (繰越金/期首残高, default 0), `is_closed` bool default false, `created_at` |
| `finance_categories` | 費目マスタ | `id`, `organization_id`, `name`, `kind` ('income'/'expense'), `sort_order` int, `is_archived` bool default false, `created_at` |
| `finance_projects` | 事業/イベント/協賛・助成源タグ | `id`, `organization_id`, `name`, `kind` ('event'/'grant'/'sponsor'/'general'), `is_archived` bool default false, `created_at` |
| `finance_transactions` | 取引（出納帳の行） | `id`, `organization_id`, `period_id` FK, `occurred_on` date, `kind` ('income'/'expense'), `category_id` FK, `project_id` FK null可, `amount` int (正の値), `memo` text null可, `receipt_path` text null可, `receipt_no` text null可, `parent_transaction_id` FK(self) null可, `created_by` uuid, `created_at`, `updated_at` |
| `finance_budgets` | 予算対比 | `id`, `organization_id`, `period_id` FK, `category_id` FK, `kind` ('income'/'expense'), `planned_amount` int, `created_at`。(`period_id`, `category_id`) にユニーク制約 |

- `kind` は CHECK 制約で値を固定。
- `finance_transactions.amount` は常に正。収支の符号は `kind` で表現し、残高計算時に income は加算・expense は減算する。
- `parent_transaction_id`：手数料行が本体行を指す自己参照。本体行の編集/削除時に手数料行も追随（アプリ側で連動、DBは `ON DELETE CASCADE`）。

### 3.2 費目デフォルト（初回に自動投入・編集可）

- **収入**：部費・会費／協賛金／助成金・補助金／イベント収入／その他収入
- **支出**：備品・消耗品費／会場費／印刷・広報費／交通費／飲食・交流費／通信費／謝礼・報酬／**支払手数料**／その他支出

`支払手数料` は手数料自動記録の受け皿。`lib/finance/defaultCategories.ts` に定義し、初回アクセス時（費目が0件のとき）に投入する。

### 3.3 会計期間

- 団体の財務初回アクセス時に「2026年度」を1件自動生成（`opening_balance` = 0、`starts_on`/`ends_on` は当年度の妥当な既定）。
- v1 は単一のアクティブ期間で運用。複数期間の切替UIは `settings` に最小限だけ用意し、年度をまたぐ決算・繰越の土台とする。

### 3.4 残高計算

- 現在残高 = `period.opening_balance` + Σ(income.amount) − Σ(expense.amount)（当期の全取引）
- 出納帳の各行の「残高」は `occurred_on`（同日は `created_at`）順に累計。
- `lib/finance/balance.ts` の純関数で算出（DBビューは持たない）。

---

## 4. 手数料の扱い（重要）

法人口座の振込・出金手数料が取りこぼされると、残高が実際とズレて後の照合が破綻する。これを防ぐため：

- 取引追加/編集モーダルに**任意の「振込手数料」入力欄**を置く。
- 手数料額が入力されたら、本体の支出取引とは**別に手数料行を1行自動生成**する：
  - `kind` = 'expense'、`category` = 支払手数料、`amount` = 手数料額、`occurred_on`/`project_id` は本体行を継承、`parent_transaction_id` = 本体行の id。
- これにより：
  - **残高は手数料込みで常に正確**。
  - 費目別集計では手数料が「支払手数料」に正しく集計され、本体費目を汚さない（助成金報告でも手数料が独立費目として見える）。
  - 本体行を編集/削除すると手数料行も追随する。
- 収入取引にも手数料欄を許容する（振込入金の受取手数料等）が、既定は支出のみ表示でよい。

---

## 5. 画面構成

`(club)` グループ配下。サイドバー（`components/ClubSidebar.tsx`）に「**会計・財務**」を1項目追加（アイコンは lucide の `Wallet` 系）。各ページは `page.tsx`（server）→ client コンポーネントの既存パターンに従い、`useClubOrganization()` で `activeOrgId` を取得、`supabase` ブラウザクライアントで読み書き、`toast`（sonner）と `@/components/ui` の `Button/Input` を用いる。デザイントークンは `ink/paper/mist/rule/graphite/seal`、`font-mincho`、`font-numeric tabular-nums`。

- **`/clubfinance`（日次の主戦場）**
  - 上部：残高サマリ（現在残高／今期収入計／今期支出計）＋ 期間セレクタ ＋「＋取引を追加」
  - 出納帳テーブル（日付／区分／費目／事業／摘要／収入／支出／残高／領収書アイコン）
  - 取引の追加/編集モーダル（費目・事業・金額・摘要・**振込手数料**・**領収書写真アップロード**）
- **`/clubfinance/report`**
  - 費目別集計（収入の部／支出の部）＋ 予算対比を画面表示
  - 「**Excelで出力**」ボタン（.xlsx ダウンロード）
- **`/clubfinance/budget`**
  - 費目別に予算（`planned_amount`）を入力
- **`/clubfinance/settings`**
  - 費目マスタ／事業・イベント／会計期間の管理

---

## 6. 権限・RLS・透明性

- `organization_members` と `organization_invitations` に `can_manage_finance boolean NOT NULL DEFAULT false` を追加（024 と同型）。
- `accept_organization_invitation` RPC を `can_manage_finance` 込みで更新（列が無い環境でも既存挙動を維持する COALESCE パターンを踏襲）。
- 招待UI（`app/(club)/clubsettings/members/page.tsx`）・招待メール処理（`app/api/emails/invite/route.ts`）・型（`lib/types/organizationMember.ts`）に 1 フラグ追加。
- **RLS ポリシー**（5テーブル共通の考え方）：
  - `SELECT`：その団体のメンバーであれば可（**全メンバー閲覧＝透明性**）。
  - `INSERT`/`UPDATE`/`DELETE`：その団体のメンバー **かつ** `can_manage_finance = true`。
  - **public には一切公開しない**（`organizations` の public SELECT とは別扱い。財務は会員限定）。
  - 既存の RLS 再帰回避（020）と整合する形でメンバーシップ判定を書く。
- **領収書 Storage**：非公開バケット `finance-receipts`。パスは `{organization_id}/{transaction_id}/{filename}`。storage ポリシーもメンバー限定（読み取りはメンバー、書き込みは `can_manage_finance`）。表示は署名付きURLで行う。

---

## 7. エクスポート（.xlsx）

- ライブラリ：**`exceljs`（MIT）を新規追加**。罫線・セル塗り・数値書式（¥）・小計に対応。
- 生成は**ブラウザ側で `exceljs` を動的 import**（`await import('exceljs')`）。データは既に RLS 越しに取得済みのため、サーバ往復不要。動的 import によりメインバンドルを汚さない。
- 出力は **1 ブックに 2 シート**：
  - **① 収支報告書**：団体名・会計期間・費目別（収入の部／支出の部）・予算対比・期首/期末残高。罫線＋ヘッダ塗り＋¥書式で整形し、助成金の収支決算・協賛の実施報告にそのまま提出できる体裁にする。
  - **② 出納帳**：全明細（日付／区分／費目／事業／摘要／収入／支出／残高／領収書番号）。
- ファイル名例：`{団体名}_収支報告_{期間}.xlsx`。
- 生成用のデータ整形（費目別集計・予算対比・出納帳行）は `lib/finance/aggregate.ts` の純関数で行い、`exceljs` へのブック組み立て（`lib/finance/xlsx.ts`）は薄く保つ。

---

## 8. `lib/finance/`（純関数・テスト対象）

既存の `lib/gpa` 等と同じテスト文化（`*.test.ts`）に合わせ、ロジックを純関数へ隔離する。

- `types.ts`：行・費目・期間・予算の型
- `defaultCategories.ts`：初期費目セット
- `balance.ts`：残高・収支合計・行別累計残高 ＋ `balance.test.ts`
- `aggregate.ts`：費目別集計・予算対比・収支報告書行の生成 ＋ `aggregate.test.ts`
- `fee.ts`：本体取引から手数料行を導出するロジック ＋ `fee.test.ts`
- `xlsx.ts`：`exceljs` ブック組み立て（整形済み集計データを受け取る薄い層。単体テストは行構造の検証に留める）

UI コンポーネント（各 client ページ）はこれらの純関数を呼ぶだけにし、テスト可能な計算をコンポーネント内に埋め込まない。

---

## 9. マイグレーション・依存

- 新規 `supabase/migrations/026_finance_module.sql`：5 テーブル ＋ CHECK 制約 ＋ インデックス（`organization_id`, `period_id`）＋ RLS ポリシー。
- `can_manage_finance` 追加と RPC 更新は同マイグレーション内、または続き番号のマイグレーションで行う。
- Storage バケット `finance-receipts`（非公開）とポリシーを作成。
- **npm 依存の追加は `exceljs` の 1 点のみ**。
- スキーマ変更・Storage 設定は影響範囲が大きいため、実装計画の承認後に適用する（`CLAUDE.md` §5）。

---

## 10. 未確定・実装計画で詰める点

- 会計期間の `starts_on`/`ends_on` の既定値（4月始まり vs 任意）。学生団体は年度開始が団体ごとに異なるため、初期値は編集可能にしつつ既定を決める。
- 領収書 `receipt_no`（通し番号）の自動採番ルール（費目別 or 通期通し）。助成金提出は「費目別に番号」を求めることが多い点を踏まえる。
- `exceljs` のブラウザ動的 import 時のバンドル・型設定（Next.js 15 App Router での取り扱い）。

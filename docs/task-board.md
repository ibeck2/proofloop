# タスクボード — 次フェーズ（2026-07-23 起点）

> 進行中タスクの全体像・進め方・使うスキル・未決事項を1枚にまとめたもの。
> オーナー側の手作業だけが必要なものは `docs/owner-todo.md`、
> アカウント・外部サービスの識別子は `docs/accounts-inventory.md` を参照。
>
> **運用ルール**：着手したら「状態」を更新する。完了したら `✅` に変え、末尾に完了日を書く。

**最終更新：2026-07-26**

---

## 0. いまの全体像

| # | タスク | 状態 | 主なブロッカー |
| --- | --- | --- | --- |
| A | UIの「AI感」を抜く（デザイン刷新） | ✅ **完了**（第一周・第二周とも本番反映済み 2026-07-24） | — |
| B | AI記事＋SNS生成ループの設計・実装 | 🟡 **設計完了・実装未着手** | 実装の判断待ち。Ahrefs登録（KW供給元） |
| C | 学生団体の財務DX（レシート→収支の見える化） | ✅ **完了**（v1 本番稼働 2026-07-26） | — |
| D | Resend 独自ドメイン認証（`contact@proofloop.jp` 送信） | 🔵 未着手 | さくらのDNS操作権限（ブラウザでログインできれば可） |
| E | インデックスを増やす（SEOの起点） | 🟡 観測中 | Ahrefs未登録（CEO）。次回PDCA ≈2026-08-22 |

**次の推奨着手順：D → B(実装)**（A・C は完了）
- D＝15分で終わり、学生団体への通知メール施策の前提。ログイン済みブラウザで同席が要る
- B＝設計書（`docs/superpowers/specs/2026-07-24-content-pipeline-design.md`）はある。実装するかの判断待ち
- E＝手を動かす作業ではなく観測。sitemap初投入（2026-07-25）の効果が出るまで待つ。**インデックスが増えない限り記事を足しても効かない**ので、Bの着手判断はEの結果を見てからでもよい

### この後にやると効くこと（本番反映済みの上に積む）
- ✅ **GSCで sitemap 送信**（2026-07-25 完了）。実査したら**ドメインプロパティ `sc-domain:proofloop.jp` に sitemap が一度も送信されておらず、インデックス登録は2ページのみ**だった（＝旧記載「送信まで完了」は誤り）。`https://proofloop.jp/sitemap.xml`（2,438 URL）を送信し、`/guide/money`・`/guide/credits`・`/guide/living-alone`・`/baito` の個別インデックス登録もリクエスト済み（`/gpa`・トップは既に登録済み）。**1〜2日後にステータスが「成功」に変わり登録数が増えるかをオーナーが確認**（詳細メモリ `proofloop-status-2026-07-24` 追記2）
- Ahrefs に proofloop.jp を登録（CEO依頼・未完）。SEO効果測定の前提
- スマホ実機での目視（375px幅・`/clubtasks`のD&D。Claude環境で未確認の分）

### 直近で外したもの（対応済み）
- ~~Vercelプロジェクト2つの整理~~ → 不要な `proofloop` を削除済み（2026-07-23・オーナー）
- ~~`www` の CNAME 追加~~ → 完了（2026-07-24・CEO）。apex・www とも正常
- ~~sitemap の1000件上限~~ → 撤廃済み。承認済み1,958団体を全送信（2026-07-23）
- ~~団体データの取りこぼし疑い~~ → **誤報。取りこぼしは無い**（[[proofloop-org-data-coverage]] 参照）

---

## A. UIの「AI感」を抜く

### 第一周の結果（2026-07-23 完了・main にマージ済み）

設計は `docs/superpowers/specs/2026-07-23-ui-identity-design.md`、計画と実測は `docs/superpowers/plans/2026-07-23-ui-identity-phase1.md`。

やったこと：デザイントークンを `lib/design/tokens.ts` に一本化（色6・書体3ロール）／ヘッダーをワードマーク化しアイコンを lucide に統一／フッターを紺地に刷新しガイド導線7本を追加／トップを Server Component 化し、本番DBの実在団体でヒーローを構成（12大学 1,958団体は実数）。パステル虹色6色・Material Symbols・`loop` アイコンのロゴ・`bg-gray-900`・死にリンクを廃止。

**⚠️ 第二周に必ず引き継ぐこと**

| 項目 | 内容 |
| --- | --- |
| 残り約35ページの移行 | `/guide` 配下・`/gpa`・`/for-clubs`・`/search`・`/organizations/[id]`・管理画面系が旧トークンと Material Symbols のまま |
| 旧エイリアスの削除 | `tailwind.config.ts` の旧色名22個。全ページ移行後に削除する。**移行中は消さない**（`rounded-lg` 112箇所・`font-display` 21ページが依存） |
| Material Symbols の `<link>` 撤去 | 全ページから消えた時点で `app/layout.tsx` から削除 |
| ログイン中のUI | `AppShell` のログアウトボタン等は旧配色のまま。トップは未ログイン状態しか検証していない |
| 深紅の予算 | 静止状態で1画面2箇所まで。現在はヘッダーの「新規登録」と ForClubsCallout の左帯で**すでに上限**。ページを移行するとき勝手に足さない |
| 未検証 | 改修後のLCP／375px幅の目視／`prefers-reduced-motion` の実機確認 |

**この過程で見つかった別件の不具合**（本タスクの対象外。着手時期の判断が必要）

- ~~**`app/sitemap.ts:128` の `.limit(1000)`**~~ → ✅ 撤廃済み（2026-07-23）
- ~~`organizations.category` の文字化け2件~~ → ✅ 修正済み（2026-07-24）。2件とも `運動系（スポーツ・アウトドア）` に統一
- `/for-students` が本番で404。旧フッターは全ページでこの死にリンクを出していた（フッターからは削除済み。**ページを作るなら復活させる**）
- ~~`/search` のタイトル重複~~ → ✅ 修正済み（2026-07-24）。**実は6ページで発生していた**（/search /baito /baito/simulator /classinfo /login /for-clubs）。原因は root の `title.template = "%s | ProofLoop"` に対し子側でも接尾辞を手書きしていたこと
- ~~ルート名のスペルミス `app/clubdashborad` / `app/companydashborad`~~ → ✅ 両方とも修正済み（clubdashboard は既対応、companydashboard は 2026-07-24。旧URLは308リダイレクト）
- 公式SNSアカウントのURLが未確定のため、フッターにSNS項目を出していない

**2026-07-24 のサイト精査で新たに判明したもの**
- ✅ `/manual` が404なのに `/for-clubs` からリンクされていた → ページを新規作成して解消
- ✅ `/baito/simulator` が `/baito` の metadata を継承していた → 専用 layout を新設
- ✅ `/guide/study-abroad/recommend` が sitemap 未掲載 → 追加
- ✅ `/timeline` `/schedule` がログイン必須なのに sitemap 掲載 → 除去＋robots で Disallow
- ⚠️ **既存団体は説明文がほぼ空**（1,958件中1件のみ）。実装では解決できず、データをどう埋めるかの事業判断が要る。**部分的に前進（2026-07-25）**：`generateMetadata` 実装で全団体ページのタイトル/descriptionを一意化（薄いコンテンツ問題は緩和）。早稲田463件は事実データ付きで投入済み（説明文は方針判断待ち）。詳細はメモリ `proofloop-org-metadata` / `proofloop-waseda-import`
- ✅ **`organizations.category` が分類として機能していなかった**（運動系に音楽系が混在等）→ 2026-07-25 にルールベースで455件再分類（`lib/organizations/classifyCategory.ts`）。死んでいた4カテゴリが機能するように
- ✅ ~~`next.config.ts` の `typescript.ignoreBuildErrors`~~ → 撤廃済み（2026-07-24）。型チェックが有効。`eslint.ignoreDuringBuilds` は残置
- ⚠️ **要オーナー判断（2026-07-25）**：早稲田収集が CLAUDE.md §5「スクレイピング禁止」方針と乖離。方針文の更新可否／早稲田の説明文（活動内容の文章）を取り込むか。取り込むなら `source_url` 列追加（スキーマ変更）が要る

### 狙い
ProofLoop全体の見た目が「AIが生成した無個性なUI」に寄っている。学生団体・企業・大学生という実在の読者に対して、**信頼できる自社プロダクトの顔**を作る。

### 現状の診断（コードから確認した事実）
- `tailwind.config.ts` の `colors` に、**同じ3色に対して別名が10個以上**ぶら下がっている（`primary` / `navy` / `navy-custom` / `text-main` が全部 `#002B5C`、`text-grey` / `grey-custom` / `secondary-grey` / `neutral-grey` / `neutral-gray` / `text-sub` が全部 `#707070`）。増築の跡がそのまま残っている状態で、**どのクラスを使えばいいかが決まっていない＝一貫性が出ない根本原因**。
- `borderRadius` が **全キー `0px`** に潰されている。角丸ゼロ自体は選択としてあり得るが、`.no-rounded { border-radius: 0 !important }` が別途あることから、**意図した設計ではなく後付けの上書き**である可能性が高い。
- `fontFamily` は `display: Inter/Lexend/Noto Sans JP` と `body: Noto Sans JP` の2ロールのみ。ただし `globals.css` の `body` が `Inter, Noto Sans JP` を直接指定しており、**Tailwind側の定義と二重管理**になっている。
- ページ数42・共通コンポーネント11本＋`components/ui`。全面刷新ではなく**トークンの再定義＋高トラフィック面から順に適用**が現実的。

### 進め方
1. **`frontend-design` スキルを起動**し、ProofLoopのブリーフ（学生団体／大学生／B2Bの二層、primary `#002b5c`・accent `#8B0000` は資産として維持）に対してデザイントークン案を作る。スキルの指示どおり **色4〜6・書体2〜3ロール・レイアウト方針・シグネチャ要素** を先に確定させ、生成AIっぽい3つの定番（クリーム地＋セリフ、黒地＋アシッドグリーン、新聞レイアウト）に落ちていないか自己批評してから実装に入る。
2. トークンを `tailwind.config.ts` に**一本化**（別名エイリアスを整理し、意味のある名前だけ残す）。※既存クラス名の一括置換になるため **Plan Mode で承認を取ってから**着手する（CLAUDE.md §0）。
3. 適用順：`/`（トップ）→ `/gpa`・`/guide` 系（SEO流入の受け皿）→ `/for-clubs`（B2B LP）→ 管理画面系。
4. 各段階で**ブラウザ実機のスクリーンショットを撮って自己批評**する（`claude-in-chrome` または `playwright`）。

### 使うスキル
| タイミング | スキル |
| --- | --- |
| 方向性を決める前 | `superpowers:brainstorming` |
| トークン設計〜実装 | `frontend-design` ★中心 |
| 実機確認・スクショ | `claude-in-chrome` / `playwright` |
| 実装後の整理 | `code-simplifier` |

### 未決事項（要判断）
- 角丸ゼロを**残すか、やめるか**。ブランドの硬質さとして活かすなら残す、後付けの事故なら見直す。
- 現在の紺 `#002b5c` ＋ 深紅 `#8B0000` を**そのまま維持**でよいか（CLAUDE.md §3 は維持前提で書かれている）。

---

## B. AI記事＋SNS（X / Instagram）生成ループ

### 狙い
「キーワード解析 → 記事生成（人の最終チェック込み）＋X/Instagram投稿生成 → GA4/GSC/SNSで効果測定 → リライト」のPDCAを回す。**単発の自動投稿にはしない**（CLAUDE.md §7）。

### 現状
- 入力となるキーワード分析基盤：**Ahrefs へのプロジェクト登録がCEO待ちで未完**（`docs/owner-todo.md` 🟡）。ただし **GSCのデータはMCP経由で取得可能**なので、実データでの分析は先行して回せる。
- `docs/seo/keyword-facts.md` / `rank-tracker-keywords.md`（28語）に調査済みの資産あり。
- 生成の実行基盤（GitHub Actions × Claude API）は**未実装**。

### 進め方
1. まず**設計から**：ループの構成要素（KW選定 → アウトライン → 本文 → 校正 → 人の承認 → 公開 → 計測 → リライト判定）を定義し、どこを自動化しどこに人を挟むかを決める。
2. パイプラインの実装は GitHub Actions ＋ Claude API。**モデル選定・API仕様は `claude-api` スキルで確認**してから書く（記憶で書かない）。
3. 記事の受け皿ページ構造（`/guide` 配下に置くのか、新設の記事ディレクトリにするのか）を先に決める。**ナビゲーションには追加しない**（CLAUDE.md §5）。
4. SNS側は「診断系（`/baito/simulator`・留学診断・`/gpa`）を拡散フックにする」前提で、記事から派生させる投稿テンプレートを設計。

### 使うスキル
| タイミング | スキル |
| --- | --- |
| ループ設計の発散 | `superpowers:brainstorming` |
| 設計を文書化 | `superpowers:writing-plans` |
| API/モデル仕様の確認 | `claude-api` ★必須 |
| KW・順位データ取得 | Ahrefs MCP（`gsc-*` は登録前でも可） |
| 実装 | `superpowers:test-driven-development` |
| 計画の実行 | `superpowers:executing-plans` |

### 未決事項
- 記事の**公開判断を誰がどこで行うか**（PR承認方式か、管理画面か）。
- SNSの**投稿アカウントを実際に運用する人**と、投稿の自動/手動の線引き。

---

## C. 学生団体の財務DX（レシート → 収支の見える化）✅ 完了（2026-07-26）

### 完了状況

`/clubfinance` として **v1が本番稼働中**。設計 `docs/superpowers/specs/2026-07-25-finance-dx-design.md`／計画 `docs/superpowers/plans/2026-07-25-finance-dx.md`。

**出したもの**：出納帳（日付・収支区分・費目・金額・摘要・事業タグ・領収書写真）／費目マスタと事業タグの設定／会計期間と期首残高（繰越金）／費目別予算と予算対比／残高・収支サマリ／**振込・出金手数料の自動行生成**／**整形済み .xlsx 出力**（収支報告書＋出納帳の2シート）／会計担当権限 `can_manage_finance`（記録は担当のみ・**閲覧は全メンバー**＝透明性）。
**DB**：マイグレーション026（`finance_*` 5テーブル＋RLS＋Storage `finance-receipts` 非公開）・027（既定シードの競合防止ユニークインデックス）を**本番適用済み**。
**マニュアル**：`docs/manuals/財務DX_利用マニュアル.pdf`（HTML版も同梱）。

### 決定した内容（旧「未決事項」6点の結論）

1. **レシート読み取り** → **(a) 手入力＋写真添付**で出した。OCR自動抽出（Claude APIビジョン）は**v2送り**。需要が見えてから。
2. **管理単位** → 団体全体を基本に、全取引へ**事業/イベント/協賛・助成源タグ**を持たせた。将来の協賛マッチング連携をデータモデル変更なしで接続できる布石。
3. **大学提出フォーマット** → 実物サンプルは入手できていない。汎用の収支報告書xlsxとして整形出力する形で対応。**実物が手に入れば専用書式を追加できる**。
4. **入力と承認** → v1は**会計担当のみ入力**。立替精算ワークフロー（申請→承認→精算）は**v2送り**。
5. **お金の扱い** → 記録・集計まで。送金は行わない。
6. **画像の保存先** → Supabase Storage の非公開バケット。表示は署名付きURL。

### v2 の候補（着手時期は未定）

- 領収書OCRによる自動記帳（Claude APIビジョン・コスト発生）
- 立替精算ワークフロー
- 複数口座・残高照合（現金／銀行／電子マネーの分離）
- 協賛マッチング直結の自動レポート送信（Resend）

<details>
<summary>（記録）着手前の狙いと未決事項</summary>

### 狙い（オーナー談・2026-07-23）
学生団体は**大学へ年次の収支報告を提出する義務**がある。この作業が紙のレシート管理と手集計で重い。
- **レシートを撮影すると、日付・金額・用途が記録される**
- 入金（部費・協賛金など）も含めて**収入と支出を一括管理・見える化**する
- **年次で大学提出用の収支報告としてまとめて出力できる**

### なぜProofLoopに効くか
- CLAUDE.md §2 の能力モデル「**組織基盤（ガバナンス・内部管理）**」に直撃。
- 「事務作業時のみ利用」から脱するための**日常トリガー**になる（買い物のたびに開く＝リテンション設計 §8 と整合）。
- 会計は代替わりのたびにリセットされる領域なので、「**流動を蓄積に**」という行動指針そのもの。
- B2B（団体管理OS）側の**有料化しやすい機能**でもある。

### 未決事項（★着手前に必ず確定する）
1. **レシートの読み取りをどうするか**
   - (a) 手入力＋写真添付のみ（実装が軽い・OCRコスト0）
   - (b) Claude API のビジョンで自動抽出（精度は高いが**APIコストが発生**）
   - (c) まず(a)で出し、需要が見えたら(b)へ
2. **どの単位で管理するか**：団体全体だけか、イベント別・部門別の予算まで持つか
3. **大学提出フォーマット**：大学ごとに書式が違うはず。**実物のサンプルが1枚あると設計精度が段違いに上がる**（PDF/Excelでいただけますか）
4. **誰が入力し、誰が承認するか**：会計担当のみ入力か、メンバー全員が立替精算を申請できるのか（＝**立替精算のワークフロー**まで作るか）
5. **お金の扱いの範囲**：記録・集計まで（実際の送金はしない）でよいか
6. **画像の保存先**：Supabase Storage 前提でよいか（既存の `/clubphotos` の実装方針に合わせる）

### 進め方
1. `superpowers:brainstorming` で上記を詰める → 2. `superpowers:writing-plans` で実装計画 → 3. **Supabaseのスキーマ変更は Plan Mode で承認必須**（CLAUDE.md §5）→ 4. TDDで実装 → 5. `frontend-design` の成果（タスクA）に沿ってUIを作る。

### 使うスキル
| タイミング | スキル |
| --- | --- |
| 要件詰め | `superpowers:brainstorming` ★最初に |
| 計画書 | `superpowers:writing-plans` |
| DBスキーマ確認 | Supabase MCP（`list_tables`） |
| 実装 | `superpowers:test-driven-development` |
| UI | `frontend-design` |
| 完了前 | `superpowers:verification-before-completion` → `code-review` |

</details>

---

## D. Resend 独自ドメイン認証（`onboarding@resend.dev` → `contact@proofloop.jp`）

### 狙い
現在、承認メール・招待メール・申込メール・チャット通知の**4経路すべてが `onboarding@resend.dev`**（Resendの共有テストアドレス）から送信されている。受信側には「ProofLoop運営 <onboarding@resend.dev>」と表示され、**信頼性を損ない迷惑メール判定されやすい**。CLAUDE.md §6 の「学生団体への通知メールを営業導線にする」施策の**前提条件**。

### 影響範囲（コードで確認済み）
差し替えるのは以下4ファイルの `from:` 1行ずつ。
- `app/api/emails/approve/route.ts:130`
- `app/api/emails/invite/route.ts:298`
- `app/api/emails/apply/route.ts:132`
- `app/api/emails/chat/route.ts:142`
※ ハードコードされているので、**この機会に環境変数（`RESEND_FROM`）へ一元化**するのが望ましい。

### 手順
1. **Resend にログイン**（アカウントは `ibeckzoom@gmail.com` — `docs/accounts-inventory.md`）→ Domains → `proofloop.jp` を追加
2. Resend が表示する**DNSレコード（SPF用TXT・DKIM用CNAME/TXT・必要ならMX）を控える**
3. **さくらインターネットのゾーン編集に登録**し、「データ送信」まで押して確定
   - ⚠️ 既存の `@` Aレコード・SPF・Google認証TXT は**絶対に消さない**
   - ⚠️ **SPFのTXTは1ドメインに1本しか置けない**。既存の `v=spf1 include:_spf.google.com ~all` に Resend の include を**追記して1本にまとめる**必要がある（別々に2本置くとSPFが壊れる）
4. Resend側で Verify → 認証完了を確認
5. コード側の `from` を `ProofLoop運営 <contact@proofloop.jp>` に差し替え（環境変数化）→ 実送信テスト

### 使うスキル / ツール
| タイミング | ツール |
| --- | --- |
| Resend・さくらの管理画面操作 | `claude-in-chrome` ★（**オーナーが同席し、ログイン済みのブラウザで実行**） |
| コード差し替え | Edit（4ファイル＋環境変数） |
| 完了確認 | `superpowers:verification-before-completion` |

### 注意
- Claude はパスワードを持たないため、**ログインは必ずオーナーが行う**。Claude はログイン済みの画面から先を操作する。
- DNS変更はサイト稼働に関わるため、**登録内容を画面で読み上げて確認してから送信**する。
- 送信元アドレスを `contact@proofloop.jp` にする場合、**そのアドレスで受信できる必要はない**（送信専用でも動く）が、返信を受け取りたいなら受信設定も要る。CLAUDE.md §9 の「問い合わせ用メール（info@ / support@）」と合わせて考える。

---

## E. インデックスを増やす（SEOの起点・観測フェーズ）

### 現状（2026-07-25 ベースライン）

`docs/seo/reports/2026-07-25-pdca.md` が正。GSC 3ヶ月で **クリック6・表示63・CTR 9.5%・平均順位14.3**、**インデックス登録は2ページ**。クリックの大半は指名クエリ（`proofloop`）で、**検索での実体がまだ無い**＝「悪い」のではなく「始まっていない」状態。

同日に sitemap（2,438 URL）を初投入し、主要4ページ（`/guide/money`・`/guide/credits`・`/guide/living-alone`・`/baito`）の個別インデックス登録をリクエスト済み。

### 次回（≈2026-08-22・`seo-pdca` スキル）で見る3点

1. インデックス登録数が増えたか（サイトマップのステータスが「成功」になったか）
2. 団体ページ 2,400+ が吸収され始めたか
3. オーガニッククリックが発生したか（指名以外のクエリ）

### ブロッカー

- **Ahrefs に proofloop.jp が未登録**（ワークスペース所有者がCEO・`docs/owner-todo.md` 🟡）。順位の定点観測ができない。
- そのため GSC データは**同席ブラウザの画面から取得**する運用（Ahrefs MCP の `gsc-*` はプロジェクト未登録では使えない）。

### 注意

**インデックスが増えない限り、記事を足しても効かない。** タスクB（記事生成ループ）の着手判断は、この観測結果を見てからでもよい。

---

## 参考：スキルの使いどころ早見表

| 場面 | 使うスキル |
| --- | --- |
| 何を作るか決まっていない | `superpowers:brainstorming` |
| 作るものは決まった、手順に落とす | `superpowers:writing-plans` |
| 計画を実行する | `superpowers:executing-plans` |
| バグ・不具合を追う | `superpowers:systematic-debugging` |
| 実装する（機能・修正） | `superpowers:test-driven-development` |
| 見た目を作る・整える | `frontend-design` |
| グラフ・ダッシュボードを作る | `dataviz` |
| 実装後の整理 | `code-simplifier` / `simplify` |
| 「できました」と言う前 | `superpowers:verification-before-completion` |
| マージ前のレビュー | `code-review` / `superpowers:requesting-code-review` |
| Claude API・モデルを扱う | `claude-api` |
| 管理画面をブラウザで操作 | `claude-in-chrome` |
| 方針が変わった | `claude-md-management:revise-claude-md` |

# タスクボード — 次フェーズ（2026-07-23 起点）

> 進行中タスクの全体像・進め方・使うスキル・未決事項を1枚にまとめたもの。
> オーナー側の手作業だけが必要なものは `docs/owner-todo.md`、
> アカウント・外部サービスの識別子は `docs/accounts-inventory.md` を参照。
>
> **運用ルール**：着手したら「状態」を更新する。完了したら `✅` に変え、末尾に完了日を書く。

**最終更新：2026-08-13**

> 🧭 **8月〜1月の実行計画の正は `docs/roadmap-2026-08-to-2027-01.md` に移した。**
> 学生インターン3名の人件費（累計 ¥965,280）を1月末までに回収する、という目標から逆算した月次計画と
> KPI目標がそこにある。数値の根拠は `docs/models/ProofLoop_投資回収モデル_2026-08-07.xlsx`。
> このファイル（task-board）は**個別タスクの状態管理**に用途を絞る。

---

## 0. いまの全体像

| # | タスク | 状態 | 主なブロッカー |
| --- | --- | --- | --- |
| A | UIの「AI感」を抜く（デザイン刷新） | ✅ **完了**（2026-07-24） | — |
| B | AI記事＋SNS生成ループの設計・実装 | 🟡 設計完了・実装未着手 | **投資回収モデル上、記事は「下支えレーン」（工数15%）に格下げ。** 主軸は企業アウトリーチ |
| C | 学生団体の財務DX | ✅ **完了**（v1 本番稼働 2026-07-26） | — |
| D | Resend 独自ドメイン認証 | ✅ **完了**（2026-08-14） | — |
| E | インデックスを増やす（SEOの起点） | ✅ **達成**（インデックス 2 → 472ページ・2026-08-06 PDCA） | 次の律速はCTRと成果イベント。次回PDCA ≈2026-09-03 |
| F | **法務基盤**（規約・プライバシー・運営者情報・掲載ポリシー） | ✅ 実装・本番公開済み（2026-08-06） | 文面のオーナー確認が未了 |
| G | **`contact@proofloop.jp` の受信不可** | ✅ **完了**（2026-08-14） | 真因はGoogle Workspaceではなく、Vercel移管時のMX/SPFレコード欠落だった。詳細は下記セクションG |
| H | **企業向け提案書 v1**（実績なしで打てるもの） | 🔴 新規・8月末まで | これが無いと9月の企業打診が始まらない |
| I | **claim 動線の実装**（掲載団体が自分のページを引き取る） | ✅ **完了**（2026-08-09） | — |
| I2 | **claim 動線・公開前の残作業**（下記） | ✅ **完了**（2026-08-13。通知メール＝タスク9も2026-08-14完了） | 「トークン第1バッチを送る前に必ず終えるもの」の1〜7全項目が完了。タスク9（承認・却下・凍結の通知メール）も実装・本番適用済みのため、**トークン送付のブロッカーは解消**（実際の第1バッチ送付はオーナー判断） |
| J | **学生団体ヒアリングに基づく既存機能の改修**（下記） | 🟡 着手中（2026-08-13〜） | 企業レーン（G/D/H）とは独立に並行進行してよい（2026-08-07投資回収モデルの「団体＝ネットワーク効果レーン」位置づけと整合） |
| K | **claim前・凍結中の団体への応募・DM禁止**（マイグレーション044） | ✅ **完了**（2026-08-14） | UI・RLS両レイヤーで防御。詳細は本ファイル内の記録参照 |
| L | **HubSpot整備**（企業アウトリーチCRM・学生団体連絡管理） | ✅ **完了**（2026-08-14） | 詳細は下記セクションL。実データインポートは未着手（意図的に見送り） |
| M | **大学メール「本人確認」が機能していなかった件の修正** | ✅ **完了**（2026-08-14） | 詳細は下記セクションM |
| N | **団体の管理者まわりの通知メール・引き継ぎ挙動の点検**（下記） | 🔴 **保留・未着手**（2026-08-14 記録） | オーナーが実アカウントでの動作確認中に見つけた課題。次回着手 |
| O | **CEO MTG後タスクの構造化・プロダクト拡張ロードマップ**（下記） | 🟡 **構造化・タスクシート反映済み**（2026-08-15） | 詳細は下記セクションO。設計は`docs/superpowers/specs/2026-08-15-ceo-mtg-product-roadmap.md` |

**次の推奨着手順：H（企業向け提案書）→ claim トークン第1バッチの送付判断**（Jは独立して並行進行。Oの協賛金応募機能はUI配置決定が次のアクション）

- **G は完了**。原因はGoogle Workspaceではなく`proofloop.jp`のDNS（Vercel移管時のMX/SPF欠落）で、修正のついでにResend用DNSレコードも同じVercel画面で追加できたため、タスクDも大きく前進した
- **D**＝DNS設定・Verified確認とも完了（2026-08-14）。残るはコード側`from`差し替えのみ（Claude側で実装可能・オーナー対応不要）
- **団体ページ description 生成**＝2026-08-14に一旦保留（権利・精度の論点があるため要再検討。詳細は下記J参照）
- **H**＝9月から企業打診を始めるための武器。当初計画から2ヶ月前倒しになった部分

### ⚠️ 投資回収モデルが変えた前提（2026-08-07）

当初のロードマップは「団体から入り、10月に企業へ」だったが、逆算すると**回収率24.1%にしか届かない**ことが判明した。

1. **案件数の律速は企業側。団体ではない。** 全期間で団体の供給が需要を上回る → **企業ロングリスト着手を10月から8月末へ前倒し。企業レーンは団体レーンに依存させず並行で走らせる**
2. **効くのは協賛単価（¥300,000→¥500,000）と企業打診の量（150→430社）。** 稼働枠は当初計画で49.5%しか使っていなかった＝律速は「時間」ではなかった
3. **1月に企業打診を止めてはいけない。** 70社→40社にするだけで1月の単月黒字が112%→63%に落ちる

### ⚠️ 団体獲得モデルの組み替え（2026-08-07・DB実査）

**承認済み2,421団体のうち、アカウントの主がいるのは1件だけ。SNS/サイトで到達できるのは2,354件（97.2%）。** うち共有ハンドル（他団体と同じ連絡先で、誰に届くか保証できない団体）を除外した**通知対象は2,222件**（タスク0で確定）。
やるべきは新規開拓ではなく、既存の掲載ページを**引き取ってもらう claim 誘導**だった。

- **登録団体 122件（1月末）は達成できる。** 通知1,400件・claim率8%。コスト117hで枠の42%。
- **ただし6ヶ月の回収にはほぼ効かない。** 登録20→122団体でも成立案件は10.3件のまま（企業側が律速）、回収率は108.1%→110.4%の+2.3ptだけ。
- **⇒ 100団体は「回収」ではなく「2月以降のネットワーク効果」のKPIとして別管理する。** 新歓期の学生流入・B2C回遊・将来の課金基盤が本当の狙い。
- ⚠️ `organizations` に**メール列が無い**。通知はSNS DM／サイトフォームで**手作業**（1件2.4分）。→ 団体通知は特定電子メール法の対象外、**代わりに企業打診側が対象**になる。
- ✅ **claim 動線は実装済み**（2026-08-09・タスクI。`/claim/[token]` ＋ `/admin/claims` ＋ `/admin/disputes`）。✅ **通知メールも実装済み**（2026-08-14・タスク9。承認/却下/凍結の3種、`/api/emails/claim`）。トークン一括発行スクリプトは実装済み（`scripts/claims/issue-claim-tokens.mjs`）。

### タスクI2：claim動線・公開前の残作業（2026-08-09 最終レビューより）

レビュー本体 `.superpowers/sdd/final-review-2026-08-09.md`、対処の記録 `.superpowers/sdd/progress.md`。

**🔴 トークン第1バッチを送る前に必ず終えるもの**

1. ✅ **マイグレーション033の本番適用**（2026-08-09 完了）。claim動線の Critical 3件を解消。
   うち1件（C3）は claim と無関係に、030 の副作用で**新規登録とプロフィール保存を本番で壊していた**
   （`profiles` の upsert が `permission denied`）。適用後に実測で解消を確認済み。
2. ✅ **`revoke_claim` のUI（`/admin/claims` に「発行の取消」）→ 完了・クローズ（2026-08-13）。**
   マイグレーション038（DB側：`revoke_claim`に掲載内容の復元を統合し、承認済み一覧RPCを追加。
   コミット `9e0483b`）は本番適用済み。API側は `/api/claims/revoke` を新設しISR再検証込み
   （コミット `4bfad60`）、UI側は `/admin/claims` に承認済み一覧と「発行の取消」ボタンを追加
   （コミット `5cfbe66`）。他の3アクションと同じくRoute Handler経由で
   `revalidateOrganizationPage` を呼ぶ形にした。`npm test`（45ファイル410テスト全PASS）・
   `tsc --noEmit`（エラーなし）・`npm run build`（成功）で検証済み。
   `git push origin main`実行済み（2026-08-12・`482ce98..1927d30`）。
   オーナーが `/admin/claims` を実機確認済み（2026-08-13）。
   \
   **「却下が乗っ取り後の内容を復元しうる」件は038では未解消だった。** 全体レビュー
   （opus）で発覚：2026-08-09最終レビューitem5で既に指摘され「revoke UIと同時に直す」
   とされていたのに、038本体では見送られていた。マイグレーション039で対処し
   （`resolve_dispute`の却下分岐で、オーナーが実在するかを復元より前に確定し、
   不在なら`pre_freeze`＝乗っ取り後の内容ではなく`pre_claim`＝claim前の安全な内容を
   戻す。あわせて`revoke_claim`に復元前の`pre_revoke`スナップショットを追加し、
   誤操作を手動SQLで復旧可能にした）、本番BEGIN…ROLLBACK検証（4チェック全通過）を経て
   本番適用済み（2026-08-13）。詳細は
   `docs/superpowers/plans/2026-08-12-b19-verification-039.md`。
3. ✅ **claimトークンがGA4に送信される件 → 完了・クローズ（2026-08-12）**
   `lib/analytics/redactTokenPath.ts` を追加し、`components/GoogleAnalytics.tsx` の
   page_view送信経路を一本化・トークンを丸める形に変更（コミット `08464e8`・`209d081`）。
   最終レビューで見つかった「gtag.jsの`user_engagement`等の自動イベントには丸めた値が
   効いていなかった」件も修正済み（コミット `8bfb5cc`、`gtag('set',...)`でgtag.js自身の
   基準値を書き換える形に）。GA4管理画面「拡張計測機能」→「ブラウザの履歴イベントに基づく
   ページの変更」を実測→ONだったのでOFFに変更・保存済み。
   `git push origin main`実行後（`5db7f08..6c0dbde`）、Vercelの新デプロイ反映を確認したうえで、
   **本番の実測定ID（`G-6DW8LF5H7Q`）に対する実際の送信リクエストをネットワークレベルで
   直接検証**：`/claim/<uuid>`・`/invite/<uuid>`とも`dp`/`dl`双方が`[token]`に丸められ、
   `/guide/credits`のような無関係ページは丸められないことを確認。`window.dataLayer`でも
   `gtag('set',...)`が正しい値で呼ばれていることを確認。`user_engagement`個別の発火は
   自動化ブラウザ環境の制約で直接観測できなかったが、`set`が書き換えるのはgtag.js自身が
   以降の全イベントで参照する基準値であり、page_view固有の仕組みではないため、機構レベルで
   妥当性は確認済み。設計・計画・検証記録は
   `docs/superpowers/specs/2026-08-12-ga4-token-redaction-design.md`・
   `docs/superpowers/plans/2026-08-12-ga4-token-redaction-plan.md`・
   `docs/superpowers/plans/2026-08-12-ga4-token-redaction-verification.md`。
4. ✅ **`/signup` が claim への復帰を消費しない → 最小対応で完了・クローズ（2026-08-13）。**
   claimページの主CTAが `sessionStorage` に控えた宛先URLを、`/signup` の確認メール画面で
   「登録後にこのURLへ戻る」と表示する**最小対応（URL表示）のみ**を実装（コミット `f27dd6c`）。
   設計 §6.1 が挙げた `emailRedirectTo` によるメール内リンクの本格対応（メール確認後に
   自動でclaimページへ戻す）は**見送り**。スコープは設計書の決定どおり。
5. ✅ **先行申請による締め出しの復旧手段 → マイグレーション040で対応・クローズ（2026-08-13）。**
   `list_rejected_claims`・`reissue_claim_token` を追加（コミット `64ba397`、本番適用は
   コミット `975b86e`）。却下済みclaimの行はそのまま監査記録として残し、同じ団体・
   同じチャネル情報で新しいトークンを発行する方式（設計書の(b)案）。`/admin/claims`に
   「却下済み（再発行可能）」セクションを追加し、運営がボタン1つで再発行できる
   （コミット `df06ad6`）。
   ⚠️ **全体レビューでImportant1件・Minor9件を検出。Important＋安価なMinor4件は
   マイグレーション041で同日中に対応・本番適用済み**（再発行トークンが一時state
   にしか存在せず失われると誰にも見えず取り消せない問題／revoke後の一覧stale／
   TOCTOU／`FOR UPDATE`未使用／`/signup`のURL表示が相対パス）。**残り5件は設計判断
   を伴うため見送り**（`decided_by`/`decided_at`の転用による監査記録の薄さ／再発行が
   同じ・漏洩した可能性のあるチャネルに固定される／`channel_handle`の陳腐化／
   検証で「存在しないclaim」ケース未実施／オーナー実機確認の記録漏れ）。
   次にこの機能を触るときに再検討する。
6. ✅ **`middleware.ts`（リスクS1）→ 確認のみで完了・クローズ（2026-08-13）。**
   `export const config = { matcher: [...] }` は `["/admin", "/admin/:path*"]` のまま。
   パスベースの網羅により `/admin/disputes`・`/admin/claims`（`df06ad6` で追加した
   承認済み・却下済み一覧セクションを含む）も自動的に対象内であることを確認済み。
   コード変更は不要だった。`docs/risk-register.md` S1行に確認結果を追記済み。
7. ✅ **重いクエリの棚卸しと軽量化**（2026-08-11 完了）。結果は `docs/superpowers/plans/2026-08-10-query-performance.md`。
   - トップの `count: "exact"` 19本を廃止（取得済みの行から集計）／検索に400msデバウンス
   - **`/search` が2,421件を「全1000件」と表示していた**のを修正（PostgRESTの返却行数上限に静かに当たっていた）
   - マイグレーション **034 を本番適用**（索引7本）。閲覧数取得が49ブロック走査 → Index Only Scan 7バッファ
   - `organizations` と `claim_status` には**あえて索引を作っていない**（測った結果、効かない・使われていない）
   - ✅ **`/organizations/[id]` の ISR は完了**（2026-08-12・D10）。MISS→HIT で 0.45s → 0.005〜0.02s。
     `claim_status` の変化は3本の Route Handler からオンデマンド再検証するので古くならない
   - 🟡 残：`/search` のページング（現状は絞り込みで到達可能なため見送り）

   <details><summary>当初の課題設定（2026-08-10）</summary>

   2026-08-10 の停止は **NANO のディスクI/O枯渇**が原因だった
   （容量ではなくI/O帯域。`docs/owner-todo.md` に実測値あり）。MICRO に上げてI/O枠は広がったが**無限ではない**。
   claim通知を1,400件送れば、団体ページ・`/search`・`/organizations/[id]` に**同時流入が起きる**。
   - 点検の観点：`organizations`（2,421件）の**全件走査**、`select("*")`、N+1、`sitemap.ts` の一括取得、
     絞り込み条件に**インデックスが無い**列（`claim_status` を含む）、`count` の取り方
   - **トークン第1バッチの前に一度通す。** 送ってから詰まると、claim率を落としたうえに
     「引き取りに来たら落ちていた」という最悪の第一印象になる。

   </details>

**🟡 マージ後・随時**

- **RTL（Reactコンポーネントのテスト基盤）の導入。** 配線バグで3巡した実績があり、
  effect の解決順序と認可リダイレクトは依然テストで守れていない。**優先度は高い。**
- `universityDomains` がプロトタイプ経由のキーで `/admin/claims` を落とし得る
- 凍結中の団体への申立てが「まだ引き取られていません」と表示される（文言の食い違い）
- 異議申立ての区切り行を通報者が偽装できる／CSVパーサがフィールド内改行に非対応

**✅ claim前・凍結中の団体への応募・DM送信を禁止（2026-08-14 完了）**

団体詳細ページの「エントリーする」「メッセージを送る」が`claim_status`を一切見ておらず、
未引取（unclaimed）・凍結中（frozen）の団体でも押せていた。実質的な管理者がいないため、
学生が応募・DMを送っても永久に応答が来ない状態だった。UI・DBの両レイヤーで防いだ。
- UI：`lib/organizations/entryAvailability.ts`（純粋関数、TDDで実装）でclaim状態から
  表示可否を判定し、`OrganizationDetailClient.tsx`のCTAをclaimedのみ従来表示、
  unclaimed/frozenは案内文に差し替え。
- DB：マイグレーション044。`applications`のINSERTポリシーに対象団体の
  `claim_status='claimed'`条件を追加。`application_messages`はapplications行の
  存在が前提のため、ここを塞ぐだけでチャット開始（is_chat_only）も連鎖的に防げる。
- 本番でBEGIN…ROLLBACKによる実地検証済み（unclaimed→拒否／claimed→成功／
  frozen→拒否の3パターン全PASS）。マイグレーション044は本番適用済み。

**✅ マイグレーション025（`applications.is_chat_only`列）が本番未適用だった件を解消（2026-08-14 完了）**

前項の改修中に`applications`が本番0件だったことから深掘りし、`025_chat_only_applications.sql`
（`is_chat_only`列＋インデックス2本）だけが本番未適用（列が存在しない）と判明した
（021・022・024は適用済みを確認、025のみ漏れ）。この列は`clubats`・`clubdashboard`・
`mypage`・団体ページの「メッセージを送る」の計4箇所がクエリ条件に使っており、
列が無いとPostgRESTがエラーを返すため、いずれも本番で機能していなかった可能性が高い。
既存の025をそのまま本番適用（`DEFAULT false`・`IF NOT EXISTS`のみで後方互換、
`applications`0件のためデータ影響なし）して解消。コード変更なし。

**✅ D9・D10・付随のS12/S13は本番適用済み（2026-08-12）。実測は `docs/superpowers/plans/2026-08-12-d9-d10-verification.md`**

- ✅ **D9：応募RLSのメンバー起点移行 → マイグレーション035（本番適用済み）**
  `applications` / `application_messages` の5本を `can_view_org_applications(uuid)` 起点に移した。
  条件は `role IN ('owner','admin') OR can_manage_applications`。
  `BEGIN; … ROLLBACK;` の検証で、claim フル承認が 0件 → 1件、**限定承認は 0件のまま**、
  自作団体オーナーの既存アクセスは維持を確認。
  🔴 **検証中に別の不具合が出た。** `organization_members_role_check` が `'member'` を
  許しておらず、033 の限定承認（`role='member'` を書く）が本番で一度も成立しない状態だった。
  035 で同時に修正。claim 未発行のため実害なし。
  ℹ️ `organizations.user_id` を見るポリシーは本番に9本あった（残り4本の扱いは 035 の末尾コメント）。
  うち `reviews` の「口コミへの返信」だけは冗長ではないが、返信UIが未実装なので実害なし。
- ✅ **S13：限定承認による掲載編集・投稿の書き換えを制限 → マイグレーション036（本番適用済み）**
  「学生向けに出される情報は限定承認では書き換えられない」というオーナー方針で確定。
  `can_edit_profile`/`can_manage_posts`フラグを参照するRLSポリシーが実は1本も無かった
  （033のC1・035と同型の穴）ため、035と同じ形の判定関数で新設してゲート。
  tasks・finance（学生向けではない）は対象外のまま。閲覧は制限しない。
- ✅ **S12：全ログインユーザーが全ユーザーのメールを読めた穴を修正 → マイグレーション037（本番適用済み）**
  `profiles`の無条件公開ポリシーを1本削除。列権限は触っていない（emailは正当な関係で必要なため）。
  削除前に「限定承認団体宛の通知メールがこの無条件ポリシーに依存していた」ことを発見し、
  `get_owner_user_ids_for_applied_orgs`のrole制限もあわせて外した（通知フローは壊していない）。
- ✅ **D10：`/organizations/[id]` の ISR ＋ オンデマンド再検証**
  ⚠️ `revalidate` だけでは効かず、`generateStaticParams` と `unstable_cache` の**両方**が要った
  （supabase-js が fetch に AbortSignal を渡すため）。実測で MISS → HIT、0.45s → 0.005〜0.02s。
  単独の再検証APIは作らず、状態を変える3つのRPCを Route Handler で包み、
  成功したときだけ対象団体の1ページを再検証する。

**D9・D10 のレビューで積み残した follow-up（急がないが落とさない）**

- **最初のトークンを発行するとき、「凍結の直後に待たずに表示が変わる」を一度だけ端から端で確認する。**
  発火には本番への実際の書き込みが要るので `BEGIN; … ROLLBACK;` では代替できず、現時点で未実測。
- **`decide_claim` / `resolve_dispute` の戻り値に `organization_id` を足す。**
  いま Route Handler は再検証の対象をクライアントから受け取っている（`organization_claims` /
  `organization_disputes` に authenticated 向け SELECT ポリシーが1本も無く、サーバ側で引けないため）。
  現状は「RPCを呼ぶ前に必須の入力として検証する」ことで無言の失敗は塞いでいるが、
  RPCが返すようにすれば信頼そのものが不要になる。監査ログの観点でも有益。
- **`/api/claims/decide` と `/api/disputes/resolve` は `/admin` の Basic 認証（S1）の外にある。**
  認可は RPC 内の `is_system_admin()` が持つので穴ではないが、S1 で足した二層目がこの2本には無い。
  `middleware.ts` の matcher に足すかを検討する。
- **団体ページの反映は、タグで無効化されない変更（掲載編集・写真・イベント・口コミ承認）だと
  最大で約10分遅れる**（フルルートキャッシュ300秒＋データキャッシュ300秒が独立）。
  運営が「反映されない」と混乱しやすいので、`/admin/reviews` にも再検証を足すか運営マニュアルに書く。

詳細と月次の数値目標は `docs/roadmap-2026-08-to-2027-01.md`。

### この後にやると効くこと（本番反映済みの上に積む）
- ✅ **Ahrefs に proofloop.jp を登録**（2026-07-29 に稼働確認）。project_id `10155573`・verified。**GSC連携も生きており、`gsc-*` が MCP から引ける**＝同席ブラウザでGSC画面を読む運用は不要になった。残るは Rank Tracker のキーワード登録（0件・CEO対応）
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

### 影響範囲（コードで確認済み・未着手のまま）
差し替えるのは以下4ファイルの `from:` 1行ずつ。環境変数（`RESEND_FROM`）へ一元化する。
- `app/api/emails/approve/route.ts:130`
- `app/api/emails/invite/route.ts:298`
- `app/api/emails/apply/route.ts:132`
- `app/api/emails/chat/route.ts:142`

### 進捗（2026-08-14）

**DNS設定は完了。** `proofloop.jp` の権威DNSが**さくらではなくVercel**（タスクGの発見）だったため、Resendが要求するDNSレコード4件をVercelの`proofloop-2cea`プロジェクト → Domains → `proofloop.jp` のDNS Recordsに追加した（アカウント`ibeckzoom@gmail.com`）。

| Name | Type | Value |
| --- | --- | --- |
| `resend._domainkey` | TXT | DKIM公開鍵（Resend発行） |
| `send` | MX | `feedback-smtp.ap-northeast-1.amazonses.com`（priority 10） |
| `send` | TXT | `v=spf1 include:amazonses.com ~all` |
| `_dmarc` | TXT | `v=DMARC1; p=none;` |

いずれも`proofloop.jp`本体ではなく`send.proofloop.jp`等のサブドメイン向けのため、Google用の既存SPF（apex）とは競合しない。**「Enable Receiving」はオフのまま**にした（オンにするとapexのMXがGoogleと競合するため。受信はGoogle Workspace側で行う）。

### 完了（2026-08-14）
1. ✅ Resend側のステータスが「Verified」になったことをオーナーが確認済み。
2. ✅ コード側の`from`を`RESEND_FROM`（`lib/email/resendFrom.ts`、既定値`ProofLoop運営 <contact@proofloop.jp>`）に一元化。対象4ファイル（approve/invite/apply/chat）とも差し替え済み。`npm test`（419テスト）・`tsc --noEmit`とも通過。
   ⚠️ 実際のResend送信ログでの実送信確認はまだ行っていない（本番でのメール到達確認はオーナー確認事項として残る）。

---

## タスク9：claim（掲載引き取り）の通知メール ✅ 完了（2026-08-14）

設計は `docs/superpowers/plans/2026-08-08-org-claim.md` 2444行目。承認・却下・凍結の3種を新規 `app/api/emails/claim/route.ts` で実装。既存4ルートと同じ「DBに問い合わせない・受け取った値をそのままResendへ渡すだけ」の設計に揃えた。

| type | 宛先 | 発火元 |
| --- | --- | --- |
| approved | 申請者 | `/admin/claims` の承認ボタン（`decide()`、ベストエフォート・await せず） |
| rejected | 申請者 | 同上（却下ボタン） |
| frozen | 現オーナー | `submit_dispute` が実際に凍結した瞬間（第三者の異議申立て） |

**元設計書には「frozen」の発火元が具体的に書かれていなかった**（承認・却下の配線しか手順化されていなかった）。調査の結果、凍結は運営が`/admin/disputes`で判断する**前**に、`submit_dispute`内で自動的に起きる（032のレート制限つき自動凍結）。かつ`submit_dispute`は未ログインの訪問者でも呼べるため、匿名の申立て送信者に現オーナーのメールアドレスを読み取らせるわけにはいかない。

そこで**マイグレーション045**で`submit_dispute`自身（SECURITY DEFINER・特権で`organizations`を読み書き済み）にオーナー連絡先の解決を行わせ、戻り値のjsonbに`owner_email`/`owner_name`を含めた。これは`list_approved_claims`（038）が admin だけに`applicant_email`を返す既存パターンと同じ「特権内部関数が機微情報を持ち、露出範囲を呼び出し元が制御する」設計。`app/api/organizations/[id]/dispute/route.ts`がこれを受け取ってメール送信を中継し、**ブラウザへ返す前に`owner_email`/`owner_name`を必ず取り除く**（通報者がオーナーの連絡先を読み取れると悪用の温床になるため）。

オーナー特定の優先順位（owner→admin→最古のメンバー）は`lib/organizationMembers.ts`の`pickOrganizationContactUserId`と同じロジックをSQLで再現。

**検証**：`npx tsc --noEmit && npm test`（419テスト）通過。マイグレーション045は本番適用前に`BEGIN...ROLLBACK`で実地検証（一橋新聞部＝オーナーあり／フィールドホッケー部＝オーナーなし の2ケース、`owner_email`の解決とNULLフォールバックを確認、ROLLBACK後に副作用が残っていないことも確認）。`get_advisors(security)`で新規の警告が増えていないことを確認済み。本番適用済み（project `uhhofjcyotfyrlhaguvy`）。

⚠️ **未検証（残作業）**：実際にブラウザから承認・却下・申立てを1件ずつ操作し、Resend送信ログで3種のメールが実際に届くかの実地確認。承認済みclaimが本番0件のため、検証にはテスト用のclaimデータが必要。次回claimトークンの実運用が始まったタイミングで確認する。

---

## E. インデックスを増やす（SEOの起点・観測フェーズ）

### 現状（2026-07-25 ベースライン）

`docs/seo/reports/2026-07-25-pdca.md` が正。GSC 3ヶ月で **クリック6・表示63・CTR 9.5%・平均順位14.3**、**インデックス登録は2ページ**。クリックの大半は指名クエリ（`proofloop`）で、**検索での実体がまだ無い**＝「悪い」のではなく「始まっていない」状態。

同日に sitemap（2,438 URL）を初投入し、主要4ページ（`/guide/money`・`/guide/credits`・`/guide/living-alone`・`/baito`）の個別インデックス登録をリクエスト済み。

### 次回（≈2026-08-22・`seo-pdca` スキル）で見る3点

1. インデックス登録数が増えたか（サイトマップのステータスが「成功」になったか）
2. 団体ページ 2,400+ が吸収され始めたか
3. オーガニッククリックが発生したか（指名以外のクエリ）

### 中間観測（2026-07-29・Ahrefs MCP `gsc-*` で取得。次回PDCAの正式計測ではない）

Ahrefs 登録により GSC が MCP から引けるようになったので、ベースライン（07-25）との差分を確認した。

| 指標 | 07-25 ベースライン（3ヶ月） | 07-29 時点（過去3ヶ月） |
| --- | --- | --- |
| クリック / 表示 | 6 / 63 | **8 / 98** |
| 平均順位（月次） | 14.3（3ヶ月平均） | 6月 19.9 → **7月 10.4** |

**新しいシグナル2点**（07-25 には無かった）
1. **団体ページが検索に出始めた。** `/organizations/{相撲部}`(21位)・`/organizations/{東京科学大学}`(25位)・`/organizations/{北海道 ラグビー}`(14位) で表示が発生。**sitemap 初投入（07-25）で2,400+の団体ページが吸収され始めた証拠**で、次回PDCAの観測点②が前進している。
2. **`/gpa` が8キーワードで表示を獲得。** `京大 gpa 計算`(7.7位)・`gpa 換算`(6位)・`東大 gpa 計算`(10位)・`北海道大学 gpa 平均`(15位)。**クリックは0だが順位は既に射程内**＝title/descriptionのCTR改善が効く位置にいる。

⚠️ 参考値：**DR（Domain Rating）= 0.0**（被リンクゼロ）。章3.3の被リンク施策が未着手であることと整合。

### ブロッカー

- ~~Ahrefs に proofloop.jp が未登録~~ → ✅ **解消**（2026-07-29 稼働確認・project_id `10155573`）。GSC連携も生きており `gsc-performance-history` / `gsc-keywords` / `gsc-pages` が使える。
- ~~Rank Tracker の追跡キーワードが 0 件~~ → ✅ **解消**（2026-08-15・`keyword_count: 35`を実測確認）。CEO MTGで登録完了。順位の定点観測を開始できる状態に。
- Ahrefs ワークスペースの所有者が CEO のため、**オーナー自身は管理画面を直接操作できない**（データ取得はClaude経由で可能）。Rank Tracker設定・Site Audit・アラート等の設定系がすべてCEO依頼になる点は運用上のボトルネック。

### 注意

**インデックスが増えない限り、記事を足しても効かない。** タスクB（記事生成ループ）の着手判断は、この観測結果を見てからでもよい。

---

## G. `contact@proofloop.jp` の受信不可 ✅ 完了（2026-08-14）

### 根本原因
`proofloop.jp` の**権威DNSがさくらインターネットではなくVercel**（`ns1`/`ns2.vercel-dns.com`）になっており、ネームサーバー移管の際にメール関連のDNSレコード（MX・SPF）が一切移植されていなかった。

2026-08-07の実査で「MX/SPFは正しく`smtp.google.com`を向いている」と確認していたが、これは**さくら時代の設定がGoogle Public DNS等にキャッシュされていた残像**だった。Vercelの権威サーバー（`ns1`/`ns2.vercel-dns.com`）に直接問い合わせると、MX・TXTともに0件（NODATA）だったことが今回判明。「数十時間後に届く」という症状は、キャッシュが生きている間は配信でき、切れると権威サーバーへの再問い合わせでMXが見つからず失敗する、という不均一な状態で説明がつく。

### 対応
Vercelの`proofloop-2cea`プロジェクト（アカウント`ibeckzoom@gmail.com`） → Domains → `proofloop.jp` のDNS Recordsに以下を追加。

| Type | Value | Priority | TTL |
| --- | --- | --- | --- |
| MX | `smtp.google.com` | 1 | 3600 |
| TXT | `v=spf1 include:_spf.google.com ~all` | — | 3600 |

ns1・ns2の両権威サーバー、Google Public DNS、Quad9で即座に正しい反映を確認。オーナーがテストメール送受信で最終確認済み。

### 教訓（他ドメインでも起こりうる）
ドメイン移行時の確認は「レジストラ側の設定」ではなく「実際の権威ネームサーバー」に対して行うこと。`nslookup -type=NS <domain>` でネームサーバーを確認し、そこに直接クエリを投げないと、パブリックDNSのキャッシュに騙されて「正常」と誤判定しうる。CLAUDE.md「落とし穴」・`docs/accounts-inventory.md`・memory `proofloop-dns-sakura` も訂正済み。

---

## L. HubSpot整備（企業アウトリーチCRM・学生団体連絡管理） ✅ 完了（2026-08-14）

### 狙い
9月開始予定の企業打診430社の進捗管理と、学生団体との連絡管理（claim通知等）を一元化する。無料プランでの制約（取引パイプラインは1つまで）を踏まえ、企業＝取引パイプラインで進捗管理、学生団体＝会社レコードのプロパティ管理（協賛の概念がないため）、という役割分担にした。

### やったこと
1. **取引パイプラインを企業アウトリーチ用に刷新**：リスト化→初回接触→返信あり→商談→提案送付→成約→見送り。※「成約」ステージ（内部ID`closedwon`）だけはHubSpot側の制約で3回試行しても日本語化が保存されず、表示は英語`Closed Won`のまま（色・確度・位置で判別可能なので実務上は支障なし）
2. **「会社」オブジェクトに7カスタムプロパティを追加**：`対象種別`（企業／学生団体で区別）・`大学`・`カテゴリ（団体）`・`到達手段`（X/Instagram/公式サイト/LINE）・`claim通知状況`（未送付/送付済み/返信あり/登録済み）・`業界（協賛アウトリーチ）`・`打診予定月`
3. **Gmail連携を接続**（`contact@proofloop.jp`アカウント）。送信メールの自動記録・開封追跡が有効に

### 見送ったもの
- **実データのインポート**（企業ロングリストはまだ業界仮説段階、団体リストは`docs/models/団体_声かけ優先順位.csv`2,222件）は意図的に保留。型の整備のみ
- **X/Instagram/Facebook/LinkedIn/TikTok連携**：無料プランでは投稿スケジュール・ソーシャル受信トレイともに使えない（上位のMarketing Hub Professional以上が必要）と確認。Instagram単体は評価1.5/5と低評価でもあり、導入しない
- **HubSpot connector for Claude**：ユーザー側でclaude.aiの設定から有効化済み（Anthropic有料プラン前提）

---

## 団体ページ description 生成 🟡 保留（2026-08-14）

0番テーブルで「現状最もクリックが動く一手」としていたタスク。着手前にユーザーと確認したところ、対象範囲（meta description／ページ本体の理念・活動内容欄／両方）と生成方針（事実データのみの自然文化／団体名・カテゴリからのAI拡張推測）の両方に**著作権・事実正確性の論点**があり、一旦保留とする判断になった。

- **meta description（検索結果の要約文）はこの保留と無関係にすでに対応済み**：`lib/organizations/pageMetadata.ts`の`buildOrgDescription`が2026-07-25時点で事実データから自動生成している（`org.description`が空でもフォールバック文で対応）
- 保留対象は**団体詳細ページ本体の「理念・活動内容」欄**（`organizations.description`列、1,958件中1件のみ埋まっている）の充実化。次回着手時は生成方針（事実データのみの自然文化を推奨）をユーザーと先に確定させること

---

## J. 学生団体ヒアリングに基づく既存機能の改修

### 元資料
メンバーが学生団体5団体にヒアリング＋デスクトップリサーチした調査（Google Docs）。URLとサマリはメモリ `proofloop-org-hearing-2026-08` / `proofloop-org-hearing-findings-2026-08` を参照。8月訴求できる機能候補5つ（会計・合宿所検索・日程調整・タスク進捗・活動ログ）を抽出済み。

### 完了
- ✅ **「採用管理（ATS）」→「入会応募者管理」に呼称変更**（2026-08-13）。ヒアリングで「採用＝企業に採用される話と誤解される」との声。`ClubSidebar` / `/clubats` / `/clubmessages` / `/for-clubs` / `/manual` / `/clubsettings/members` / 応募通知メール の8ファイルを修正。
- ✅ **`/clubtasks` に担当者（assignee）UIを配線**（2026-08-13）。`assignee_id`列はDB・型に存在したが、フォーム・カード表示のどちらにも繋がっておらず常にnullだった死んだフィールドだった。ヒアリングの「誰が何をやっているか把握できない」に直接対応。
- ✅ **`organization_members.title`（団体内の役職・自由記述）を追加**（マイグレーション042、本番適用済み）。京大謎解きサークルの「ディレクター/マネージャー」等、役職単位でタスクが回っている実態への対応。既存の`role`（owner/admin＝権限ロール）とは別概念。`/clubsettings/members`で編集（`<datalist>`でその団体内の既存ラベルをサジェストし表記ゆれを抑制）、`/clubtasks`の担当者表示に反映。ついでに`/clubsettings/members`の編集モーダルで`role`（Admin/Owner）に誤って「役職」ラベルが付いていた既存バグを「権限」に修正。
- ✅ **`/clubtasks`で新規タスクが一度も保存できていなかった重大バグを修正**（2026-08-13）。本番`tasks`テーブルを確認したところ**0件**——原因はDBの`tasks_priority_check`制約（`low`/`medium`/`high`の英語のみ許可）と、UIが常時送っていた日本語の優先度値（`高`/`中`/`低`、既定`中`）の不一致で、**新規作成は常にCHECK制約違反で失敗していた**（担当者機能とは無関係の既存バグ。本セッションで新規に発生したものではない）。`status`と同じ「DB=英語canonical値／UI=日本語ラベル」パターンに統一して解消。あわせて「新規タスク追加」ボタンの＋が二重表示（アイコン＋テキスト両方に＋）だったのも修正。
  - ⚠️ **要フォロー（未着手）**：`tasks`テーブルのRLSに`"Club admins can manage their org tasks"`という、`organizations.user_id`（代替わり前の単独オーナー方式）を見る古いポリシーが残っている。`organization_members`ベースの新ポリシーと並存しており、許可を追加する方向（permissive）なので直ちに実害は無いが、035で行った同種の棚卸し（`organizations.user_id`ポリシー9本の点検）の対象から`tasks`が漏れていた可能性がある。次回、要棚卸し。
- ✅ **`/clubtasks`の4機能拡張**（2026-08-13、マイグレーション043・本番適用済み）。設計は`.claude/plans`のPlan Mode計画に基づく。
  1. **追加者/担当者の分離**：`tasks.created_by`を新設。挿入時のみログインユーザーIDを記録（更新時は上書きしない）。編集モーダルに「作成者：〇〇さん」を読み取り専用表示。担当者（`assignee_id`）は既存どおり別途編集可能。
  2. **タスク種別（`tasks.category`）**：自由記述＋`<datalist>`でその団体の既存カテゴリをサジェスト（`organization_members.title`と同じパターン）。カード上にバッジ表示、ボード上部の種別フィルタでグルーピング表示（カンバン・ガント両ビュー共通）。
  3. **カンバンレーン拡張**：`tasks_status_check`を`todo/in_progress/in_review/on_hold/done`の5種に拡張。レビュー待ちは`reviewer_id`（新設）と紐づけ、カードにレビュー者名を表示。
  4. **ガントチャート表示**：`app/(club)/clubtasks/GanttView.tsx`を新設。`created_at`〜`due_date`のバー表示（CSS Grid不使用、絶対配置で日数分割）。期限未設定のタスクは対象外（件数のみ案内）。「カンバン/ガントチャート」の表示切り替えをページ上部に追加。
  - 副次効果：`loadTasks`の select に`created_at`が漏れていたため`sortTasksInLane`の副次ソート（同期限内の作成日時順）が常に無効だった点も合わせて解消。

### 未着手（会計・タスクのギャップ分析より）
- 🟡 **会計の立替精算ワークフロー**（申請中/承認済みの2状態・部員からの請求）。スキーマ変更を要する。ヒアリングにより「多段階承認にすると会計担当が導入を渋る」「不定期・まとまった額の請求パターンが実態に近い」という設計上の制約が判明済み。
- ✅ **タスクの班・部門グルーピング**：上記2「タスク種別」で解消。自由記述のためカテゴリ名に「デザイン班」「渉外局」等をそのまま使える。
- ⬜ **合宿所・活動場所検索ツール**（新規機能・未実装）。ヒアリングで最も支持が強く、定量試算でも推定導入団体数トップ（約114団体）。
- ⬜ **日程調整ツール**（新規機能・未実装）。推定2位（約102団体）。
- 🟡 **要フォロー**：`tasks`テーブルのRLSに残る旧ポリシー`"Club admins can manage their org tasks"`（`organizations.user_id`ベース）の棚卸しは今回のスコープ外のまま（許可を追加する方向で直ちに実害は無い）。

---

## M. 大学メール「本人確認」が機能していなかった件の修正 ✅ 完了（2026-08-14）

### 発見の経緯
D・タスク9の本番動作確認中、オーナーが実アカウント（`.ac.jp`メール）で新規登録を試みたところ、確認リンクが届かないと報告。調査したところ、原因は今回のResend変更とは無関係で、**Supabase Authの「Confirm email」が最初から無効（自動確認）だった**ことと判明。

DB実測：既存の全ユーザー（2026-03-23の運営アカウントまで遡って）が `created_at` と `email_confirmed_at` がミリ秒単位で一致し、`confirmation_sent_at` が全件 `null`。つまり**確認メールは一度も送信されておらず、サインアップと同時に自動確認・自動ログインされていた**。

これは単なる「メール未達」ではなく、`/signup` `/login` が大学メール（`.ac.jp`等）を要求している設計意図（本人確認）が実際には機能しておらず、**任意の第三者が他人の大学メールアドレスを名乗って登録・ログインできる状態**だった。claimの「大学ドメイン整合」シグナル等、大学メールを信頼の根拠にしている他機能にも影響する。

### 対応
1. **Supabase独自ドメインSMTPの設定**（Resend経由）。Resendに専用APIキー `proofloop-supabase-smtp`（Sending access・`proofloop.jp`のみにスコープ）を新規発行し、Supabase Authentication → Emails → SMTP Settingsに設定（host: `smtp.resend.com` / port: `465` / username: `resend` / sender: `contact@proofloop.jp`）。デフォルトの内蔵メーラーは本番非推奨・レート制限ありのため、有効化前に必須の前提。
2. **Authentication → Sign In / Providers → 「Confirm email」を有効化**。
3. Site URL（`https://proofloop.jp`）・Redirect URLs（`https://proofloop.jp/**`）は既に正しく設定済みだったため変更不要。`lib/supabase.ts`のクライアントはデフォルトのimplicit flow・`detectSessionInUrl`のため、`AppShell`（全ページ共通の`app/layout.tsx`でラップ）が既に`supabase.auth.getSession`/`onAuthStateChange`を呼んでおり、確認リンククリック後の自動セッション確立に**追加のコード変更は不要**と判断（`app/auth/callback`等の新規ルートは作っていない）。
4. オーナーの依頼により、テスト用に作成された実アカウント（`wakabayashi-manabu723@g.ecc.u-tokyo.ac.jp`）をSupabase管理画面から削除し、実際の確認メール到達フローを再テストできる状態にした。

### 未検証（次回オーナーがテストする際に確認）
- 確認メールが実際に届くか、件名・送信元表示（`ProofLoop運営 <contact@proofloop.jp>`）が正しいか
- 確認リンクをクリックした際、`https://proofloop.jp/`へ正しくリダイレクトされ、自動的にログイン状態になるか（`/mypage`等で確認）
- 既存ユーザー（自動確認済み）への影響はなし（既存セッション・ログインには影響しない設定変更のため）

---

## N. 団体の管理者まわりの通知メール・引き継ぎ挙動の点検 🔴 保留・未着手（2026-08-14 記録）

### 発見の経緯
オーナーが実アカウントで動作確認中、`/mypage`から団体を検索して「ProofLoop運営事務局」宛に申請を送信 → `/admin/requests`で却下 → メールが届かないと報告。調査したところ、この申請は今回メール実装した`organization_claims`（claim）でも`applications`（応募）でもなく、**別の古い仕組み`organization_admin_requests`**（`/admin/requests`＝「運営・団体管理者申請」）経由だった（DB実測：`organization_claims`・`applications`とも全体で0件のまま）。

`app/admin/requests/page.tsx`の`handleReject`を確認したところ：
```ts
const { error } = await supabase
  .from("organization_admin_requests")
  .update({ status: "rejected" })
  .eq("id", requestId);
```
**却下時にメール送信の呼び出しが一切無い。** `handleApprove`だけが`/api/emails/approve`を呼ぶ設計で、却下の通知メールは元から未実装（今回のセッションで壊したものではなく、既存の仕様漏れ）。

### 次回やること（オーナー指示・2026-08-14）
1. **`organization_admin_requests`の却下時にも通知メールを送る**（`handleApprove`と同じパターンで追加。却下用の文面は既に`/api/emails/claim`の`rejected`テンプレートがあるので流用を検討）。
2. **claim系（`/claim/[token]`）の承認・却下・凍結メールを実地検証する**。タスク9で実装・本番適用済みだが、`organization_claims`が本番0件のため一度も実際に送信確認できていない。実際に`/claim/[token]`から引き取り申請 → `/admin/claims`で承認/却下、団体ページから異議申立て、の3パターンをオーナー自身のアカウントで一通り試す。
3. **団体の代表者（オーナー）交代の挙動を点検する**。現状の実装（`decide_claim`／`revoke_claim`／`resolve_dispute`等）で正しく動くか、代表者交代時に通知が必要か整理する。
4. **団体に複数の管理者（owner/admin）がいる場合の挙動を点検する**。誰が通知を受け取るべきか（`lib/organizationMembers.ts`の`pickOrganizationContactUserId`はowner→admin→最古のメンバーの優先順位で1人だけ選ぶ設計だが、これでよいか）。
5. **非代表者メンバーを招待する導線（`/clubsettings/members`→`/api/emails/invite`）の挙動を点検する**。招待が正しく機能しているか、招待メールが確実に届くか。

上記1〜5はいずれも未着手。次回このタスクに戻ったら、まず`organization_admin_requests`・`organization_claims`・`organization_invitations`まわりのコードとRLS/RPCを読み直すところから始める。

---

## O. CEO MTG後タスクの構造化・プロダクト拡張ロードマップ 🟡 構造化・タスクシート反映済み（2026-08-15）

### 経緯
オーナーがCEO MTG後、追加・修正タスクを`docs/ProofLoop CEOMTG後タスク修正・追加.xlsx`にまとめて配置。内容を構造化・成熟度判定し、既存ロードマップとの整合を取った。**詳細な判定根拠と各項目の分析は`docs/superpowers/specs/2026-08-15-ceo-mtg-product-roadmap.md`に集約**（このセクションはサマリのみ）。

### 方針転換（2026-08-15・オーナー確定）
既存ロードマップの④プロダクトグループが掲げていた「新機能は原則作らない（投資回収優先）」の方針は**撤回した**。学生の獲得・継続利用に効く機能は積極的に作る方針に転換（「最初に見せられる機能が良いほど獲得に効く」）。「協賛金応募・獲得機能」は③企業レーンの受け皿を団体側に作るものであり、投資回収モデルの一部として組み込むべき可能性がある——という論点は残る。

### 成熟度判定（サマリ）
- **固まってる／方向性固まってる**：協賛金応募・獲得機能（★最優先）、日程調整機能、合宿場所・活動場所検索機能、電気通信事業法の届出（リスク台帳L11）
- **半分固まってる**：会計機能改修（処理状況分類は具体的、部費回収紐づけは未定）、逆指名型新歓機能（新歓期からみて緊急性は低い）
- **幅出し段階（検討中扱い）**：タスク管理機能改修、MTG機能（本文に「要検討」と明記）、企業向けダッシュボード、admin向けダッシュボード

### 進捗の反映（新Excelの「進捗」欄より・実測確認済み）
- ✅ **Ahrefs Rank Trackerキーワード登録が完了**。`management-projects`で`keyword_count: 35`を実測確認（2026-08-15）。`docs/owner-todo.md`のチェック済み。
- ✅ **職業紹介事業の許可を確認**：許可番号`13-ユ-314800`・令和4年12月1日・**株式会社iBECK名義**。リスク台帳L5・`docs/owner-todo.md`とも解消済みに更新。残作業は`/about`への番号掲載のみ。

### タスクシートへの反映
`docs/models/ProofLoop_タスクシート_2026-08-15.xlsx`の「ガント」シートを改修。**専用グループは作らず**、④プロダクト（D12〜D25）・⑥運営・計測・法務（F10＝電気通信事業法の届出）に既存の粒度で行を追加した。新設した**「追加日」列（J列）**に今回追加・修正した行だけ`2026-08-15`を記録し、CEO案件だと目立たせる特別扱いはしていない。タイムラインは「正式ローンチ前・足許・今すぐ」の意図で期間1〜4（8月中〜9月頭）に集約（例外：企業向けダッシュボードはC7=企業打診開始に依存するため期間5〜6のまま）。あわせてE1（Rank Tracker）・F4（職業紹介許可）を完了に、A4（RESEND_FROM）を進行中に更新し、D6の完了条件から「新機能は原則作らない」を削除。行の高さ（25.95）・列幅・条件付き書式・状態列ドロップダウンはすべて既存フォーマットに揃えた。更新前のファイルは`ProofLoop_タスクシート_backup_before_ceo_mtg.xlsx`としてバックアップ済み（スクラッチパッド）。

### 新規論点：導入直後のオンボーディング動線（未着手・次回設計）
CEO MTGで出た話（Excel未記載）。「最初の5分で使い方がわからないと離脱する」という課題認識。まだ何も決まっていない。現状分析・選択肢の叩き台（初回ガイド付きセットアップ／承認メールへのリンク追加／プロダクトツアー／既存のハンズオン導線との関係）はspec文書§2に記載。次回、対象（代表者かメンバーか）と方式を決めるところから。

### 「追加で考えたい事」（決定ではなくメモ）
非エンジニアの学生メンバーに与えるタスク（ヒアリング・競合調査・声かけ戦略・営業資料作成）が候補として挙がっている。決定事項ではないためGantt化していない。

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

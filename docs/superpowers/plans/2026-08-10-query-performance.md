# 重いクエリの棚卸しと軽量化（2026-08-10）

タスク：`docs/task-board.md` タスクI2 の7番目。
実装コミット：`e3ebdd9`。

## なぜやったか

2026-08-10 に本番 Supabase が停止した。原因は **NANO インスタンスのディスクI/O枯渇**
（容量ではなくI/O帯域。COMPUTE 100% / DISK IO 100% を実測。DBサイズは16MB）。
MICRO に上げてI/O枠は広がったが無限ではない。

これから claim 通知を **1,400件** 送る。反応した団体が `/organizations/[id]`・`/search`・
`/clubdashboard` に同時に流入する。**送ってから詰まると、claim率を落としたうえに
「引き取りに来たら落ちていた」という最悪の第一印象になる。** よって送信前のゲートとして棚卸しした。

計測はすべて本番DB（project_id `uhhofjcyotfyrlhaguvy`）に対する参照のみ。
`EXPLAIN (ANALYZE, BUFFERS)` / `pg_stat_statements` / `pg_indexes` / PostgREST への実リクエスト。
**書き込み・DDL・`apply_migration` は一切行っていない。**

---

## 0. まず全体像（実測）

| 事実 | 値 | 出所 |
| --- | --- | --- |
| `organizations` 承認済み | 2,421行 | `count(*)` |
| `organizations` ヒープ | 680kB＝**85ブロック**、全件 shared hit | `EXPLAIN (ANALYZE, BUFFERS)` |
| `organizations` の索引 | **主キーと `user_id` の2本だけ** | `pg_indexes` |
| `organizations` の累積全件走査 | seq_scan 94回 / seq_tup_read 206,540行 | `pg_stat_user_tables`（統計リセット後） |
| `organization_page_views` | 2,634行・552kB・**索引ゼロ**（主キーのみ）・idx_scan 0 | `pg_indexes` / `pg_stat_user_tables` |
| `anon` の statement_timeout | 3s（`authenticated` は 8s） | `pg_roles.rolconfig` |
| 読み取り系 RLS ポリシー | 流入経路の SELECT は `true` か定数比較のみ。**行ごとのサブクエリ無し** | `pg_policies` |

**この規模での結論はひとつ**：`organizations` は 85 ブロックが丸ごと共有バッファに載っており、
**全件走査そのものは 1.0ms しかかからない**。I/Oを焼いていたのは走査ではなく、
**同じ全件走査を何十本も撃つ回数**と、**1リクエストあたりの直列化バイト数**だった。
索引を足す話より先に、そこを潰した。

---

## 1. 棚卸しの結果

`app/` `lib/` `components/` 全体で Supabase 呼び出し **175箇所 / 40ファイル**。
流入時に効く重さで並べる。

### 🔴 1-A. トップページの件数：全件走査×19本（最重量・修正済み）

| 項目 | 内容 |
| --- | --- |
| 場所 | `lib/home/homeData.ts` → `app/page.tsx`（Server Component / ISR `revalidate = 3600`） |
| 何を | `count: "exact", head: true` を 大学14 ＋ 分野4 ＋ 合計1 ＝ **19本** |
| 実測 | `pg_stat_statements`：calls 28 / **blks 4,760** ＝ **1本あたり170ブロック** |
| なぜ170か | `is_approved` にも `university` にも索引が無く全件走査（85ブロック）。しかも **PostgREST の `count=exact` は同じ走査を2度行う**（85×2） |
| 単発 EXPLAIN | `count(*) WHERE is_approved AND university='東京大学'` → Seq Scan / Buffers **85** / Rows Removed by Filter **2,256** / 0.77ms |
| 流入時の影響 | ISR 1時間なので利用者数には比例しない。ただし**再生成のたびに19往復**し、その1描画だけで約4,700ブロックを読んでいた。トップ描画のDB仕事の **94%** がこれ |

**そして、この19本は全部いらなかった。** 同じ関数がすぐ下で図（`organizationField`）と
ヒーローのために掲載団体を**どのみち全件引いている**。同じ行から数えれば済む。

### 🔴 1-B. `/search`：Client Component が1文字ごとに全件を引く（修正済み＋要判断あり）

| 項目 | 内容 |
| --- | --- |
| 場所 | `app/search/page.tsx`（**Client Component**＝利用者数ぶん増える） |
| 何を | `select(11列).eq("is_approved", true).order("name")`、**`limit` なし** |
| DB側実測 | Seq Scan 2,421行 → Sort（quicksort **425kB**）／Buffers **85**／Execution **10.4ms** |
| 実リクエスト実測 | PostgREST 経由：**HTTP 206** / `Content-Range: 0-999/2421` / **328,988 bytes**（非圧縮）/ **0.68s**。gzip 有効時は 57.5kB / 0.17s |
| 増幅 | `fetchOrgs` の `useCallback` が `keyword` に依存し、`useEffect` が `[fetchOrgs]` に依存していた。**1文字打つたびに1リクエスト。**「テニス」で3〜4回、約1.3MBの直列化 |
| 流入時の影響 | 1,400団体が自団体名を検索する経路。**利用者数×文字数**で効く。ここが停止時のI/Oを焼いた最有力候補 |

**⚠️ 併せて判明した仕様上の欠陥（perf ではなく正しさの問題）**：
`Content-Range: 0-999/2421` が示すとおり、**PostgREST の1,000行上限に静かに当たっている**。
つまり現状の `/search` は無条件検索で **2,421件中1,000件しか出しておらず**、
画面の「全 N 件の団体」は `orgs.length`＝**1000 と表示されている**。
`/` に「2,421団体」と書いてある動線の先で 1,000 件しか出ない。**これは今も起きている。**
→ 修正は表示仕様の変更を伴うため §3 の提案に回した。**オーナー判断が要る。**

### 🟡 1-C. `/organizations/[id]`：キャッシュされず毎回4本（提案に留めた）

| 項目 | 内容 |
| --- | --- |
| 場所 | `app/organizations/[id]/page.tsx`（Server Component、`revalidate` 指定なし＝**リクエストごとに実行**） |
| 何を | `organizations`（主キー引き）＋ `events` ＋ `organization_photos` ＋ `reviews` を `Promise.all` で4本 |
| 実測 | `pg_stat_statements` calls 109：organizations 599blks（**5.5/回**・0.54ms）、events 328（3.0/回）、photos 304（2.8/回）、reviews 334（3.1/回）。**合計 約14ブロック/PV** |
| 良い点 | `generateMetadata` と本体の二重取得は `react.cache` で既に潰してある（同ファイル 44行目のコメントどおり）。**N+1 は無い** |
| 悪い点 | ①ISR が効かず1PVごとに4往復 ②`events`/`organization_photos`/`reviews` は `organization_id` に索引が無く全件走査（今は各32kB＝4ブロックなので実害は小さい） ③`photos`・`reviews` に `limit` が無い |
| 流入時の影響 | claim通知の**主たる着地点**。DB負荷そのものは軽いが、往復回数が利用者数に比例する |

### 🟡 1-D. `/clubdashboard`：索引ゼロのログ表を全件走査（索引を提案）

| 項目 | 内容 |
| --- | --- |
| 場所 | `app/(club)/clubdashboard/ClubDashboardContent.tsx`（Client） |
| 何を | `organization_page_views` に2本（うち1本は `count:"exact"`＝走査2回）＋ `applications` 2本 ＋ `application_messages` 1本 |
| 実測 | `count(*) WHERE organization_id=? AND created_at >= now()-30d` → Seq Scan / Buffers **49** / **Rows Removed by Filter 2,631** / 該当3行 |
| 流入時の影響 | claim を完了した団体が最初に開く画面。**このテーブルは団体ページの閲覧ごとに1行増える**ので、放置すると最も速く悪化する |
| 補足 | `applications.select("id")` で全応募IDを引いてから `.in()` で未読数を数える形。件数が小さいうちは可 |

### 🟢 1-E. 「重いのでは」と疑って、実測の結果**問題なかった**もの

- **`app/sitemap.ts`**：1,000行×3ページ＝2,421件。`export const dynamic` が無く Next 15 では**ビルド時に静的生成**されるため、実行時の流入経路に乗らない。`.range()` でページングしており PostgREST の1,000行上限も正しく回避済み。**対処不要。**
- **RLS**：`organizations` / `events` / `organization_photos` / `organization_posts` の SELECT ポリシーは `true` か定数比較のみ。行ごとにサブクエリを回すポリシーは読み取り経路に無い（`pg_policies` で確認）。**流入時のRLSの罠は無い。**
- **`components/AppShell.tsx`**（全ページ）：`profiles` の取得は `if (!session?.user?.id) return` で守られている。**未ログインの流入では1本も撃たない。**
- **`OrganizationDetailClient`**：`applications` 系はすべて `session` ガード内。未ログイン閲覧者は撃たない。
- **`lib/organizationMembers.ts` の `attempts` ループ**：列欠落時のフォールバックで、正常時は1本目で成立。
- **`select("*")` 20箇所**：`/clubfinance`（5ファイル）・`/admin/jobs`・`/baito` のみ。前者は団体ごと・ログイン必須で小さい。`/baito` は `job_listings`（数十行）。**流入経路の `organizations` に `select("*")` は1件も無い。**
- **`claim_status` の索引**：**不要と確認。** 棚卸しの結果、この列は**走査の絞り込み条件として一度も使われていない**。アプリ側は `/organizations/[id]` が列を読むだけ、029〜032 の RPC はすべて `WHERE id = ...` の主キー引き、RLS の `claim_status <> 'frozen'` は UPDATE 側かつ不等号で索引が効かない。

### ⚪ 1-F. 上限が無いが、いま流入経路ではないもの（記録のみ）

- `app/timeline/page.tsx`：`organization_posts` ＋ 埋め込み `organizations(...)`、`limit` 無し。ログイン必須・`robots.ts` 除外。埋め込みなので N+1 ではない。
- `app/schedule/page.tsx`：`events` を**日付の絞り込みも上限も無しに全件**。ログイン必須。イベントが増えると効いてくる。
- `app/(club)/clubfinance/FinanceReportContent.tsx:39,41`：会計期間ごとに `finance_transactions` と `finance_budgets` を引く **N+1**。団体ごと・期間数は数個。
- `app/admin/reviews/page.tsx:63`：`organizations` を `.in(orgIds)` で引いてマージ。N+1 を避けた**正しい書き方**。

---

## 2. 実装した軽量化（コミット `e3ebdd9`）

### 2-1. トップの件数を、取得済みの行から数える（19本 → 0本）

- **何を**：`lib/home/organizationCounts.ts` を新設し、`countByUniversity` / `countByCategory` を
  純粋関数として切り出した（CLAUDE.md §5）。`homeData.ts` は掲載団体を1回引いたその行から数える。
- **なぜ**：件数のためのクエリは**1本残らず冗長**だった。図とヒーローのために全件を引いているのだから、
  同じ行を数えれば済む。170ブロックの全件走査を19回撃つ理由が無い。
- **効果（実測）**：トップ1描画あたり **約4,760ブロック → 0**。往復は **22回 → 3回**（1,000行×3ページ）。
  DB仕事は実質 `organizations` 3読みだけになった。
- **正しさの担保**：本番の実数と突き合わせ済み。総数 **2,421**（大学別の合計＝2,421 と一致）、
  件数>0 の大学 **13件**（「その他」は0件のため旧実装でも非表示）、分野は実在8種のうち表示対象4種。
  空白付きの `university` 値は0件（`btrim` 比較で確認）＝ `.eq` と同じ突き合わせで差が出ない。
- **静かな嘘への保険**：件数を行から作るようになったため、取りこぼしがそのまま数字の過少表示になる。
  ページングが `MAX_ROWS` に達して打ち切られた場合は**例外を投げる**ようにした
  （旧実装は count が別クエリだったのでこの取りこぼしが数に出なかった）。`MAX_ROWS` は 5,000 → 20,000。
- **テスト**：`lib/home/organizationCounts.test.ts` に10件。
  文字化けカテゴリ（DBに実在）と前後空白を**旧 `.eq` と同じく数えない**ことも固定した。

### 2-2. `/search` のキーワード入力をデバウンス（1文字1本 → 打ち終わって1本）

- **何を**：`appliedKeyword` を導入し、入力停止から **400ms** 後に問い合わせへ反映。
  「検索する」ボタンは待たせず即時（`searchNow`）。
- **なぜ**：この検索は1回で 329kB を直列化する。それを1文字ごとに撃っていた。
- **効果（実測）**：「テニス」入力で **3〜4リクエスト・約1.3MB → 1リクエスト・329kB**。約 **1/4**。
- **表示は変えていない**：結果は従来どおり入力に追従する（400ms遅れる）。

### 検証

- `npm test` … **38ファイル / 352テスト 通過**（新規10件を含む）
- `npx tsc --noEmit` … クリーン

---

## 3. 提案に留めたもの（未実装・オーナー判断）

### 3-1. 🔴 `/search` の件数上限 ＋ 表示件数（**正しさの問題を含む**）

**事実**：現状 `/search` は `limit` を付けていないため PostgREST の1,000行上限に当たり
（`HTTP 206` / `Content-Range: 0-999/2421`）、**2,421件中1,000件しか表示していない**。
画面の「全 N 件」は `orgs.length` なので **1000 と表示される**。
トップに「2,421団体」と書いた動線の先で1,000件しか出ないのは、claim で来た団体が
「うちが載っていない」と受け取る形になりうる。

**提案（いずれもオーナー判断）**

| 案 | 内容 | 費用対効果 |
| --- | --- | --- |
| A（推奨・最小） | `.limit(60)` ＋ 別途 `count: "planned"` で総数を出し、「全2,421件中60件を表示」に変更。「もっと見る」で追加取得 | 329kB → **約8kB（1/40）**。実装0.5日。**表示文言と挙動が変わるので要承認** |
| B（暫定） | `.limit(1000)` を明示するだけ（挙動は現状と同じ、上限が可視化される） | 転送量は変わらない。**沈黙のバグを沈黙でなくすだけ**。10分 |
| C | 全文検索（`pg_trgm` GIN ＋ `websearch_to_tsquery`）へ移行 | `ILIKE '%…%'` の全件走査を消せるが、2,421行では現状 1.0ms で**割に合わない**。1万件規模になってから |

> 補足：`.or()` に渡すキーワードのエスケープが `'` のみで、`,` `%` `_` `(` `)` を素通しする
> （`app/search/page.tsx:66-71`）。`,` を含む検索語は `or()` の区切りとして解釈され結果が壊れる。
> 検索の当たり方が変わるため未修正。**純粋関数に切り出してテストを書く形で別途直すべき。**

### 3-2. 🟡 `034_query_performance.sql` の索引（**書いただけ・未適用**）

ファイル：`supabase/migrations/034_query_performance.sql`。対象表はいずれも1MB未満で、
`CONCURRENTLY` 無しでも作成は一瞬（Supabase のマイグレーションはトランザクションで走るため
`CONCURRENTLY` は使えない）。

| # | 索引 | 根拠（実測） | 費用対効果 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | `organization_page_views (organization_id, created_at DESC)` | 索引ゼロ。49ブロック走査で該当3行、2,631行を捨てている | **最良**。閲覧ごとに行が増える唯一の表 | **送信前に推奨** |
| 2 | `organization_members (user_id)` | 既存の一意索引は `(organization_id, user_id)` で、**先頭列でない `user_id` 単独では効かない**。実際の問い合わせは user_id 起点が主（`ClubOrganizationContext`・`fetchMyOrganizationMemberships`・RLS の `get_user_organization_ids(auth.uid())`） | 高。claim で引き取った団体の数だけ行が増える | **送信前に推奨** |
| 3 | `events (organization_id, event_date)` | 団体ページが毎PV撃つ。現状32kB=4ブロックで実害小 | 中（将来効く） | 後でよい |
| 4 | `organization_photos (organization_id, created_at DESC)` | 同上 | 中（将来効く） | 後でよい |
| 5 | `reviews (organization_id, status)` | 同上 | 中（将来効く） | 後でよい |
| 6 | `applications (organization_id, created_at DESC)` | 既存 unique は `(user_id, organization_id)` で団体側から引けない | 中 | 後でよい |
| 7 | `application_messages (application_id, created_at)` | 主キーのみ。未読数の `.in()` に効く | 中 | 後でよい |
| — | `organizations (is_approved)` / `(university)` / `(category)` | **足さない。** 85ブロックが全件 shared hit で走査1.0ms。この規模ではプランナが選ばず維持コストだけ増える。1万件規模で再検討 | — | 不要 |
| — | `organizations (claim_status)` | **不要。** 走査の絞り込み条件として一度も使われていない（§1-E） | — | 不要 |

### 3-3. 🟡 `/organizations/[id]` の ISR（**最大のレバーだが仕様変更**）

`export const revalidate = 300` を足せば、claim通知の主たる着地点のDB往復が
**PVごと4本 → 5分に4本**になる。1,400件送る局面では**単独で最も効く**。

**しかし実装しなかった**：このページは `claim_status` を表示に使っている
（`OrganizationDetailClient` の `claimStatus`）。キャッシュすると、団体が引き取った直後に
「まだ引き取られていません」の表示が最大5分残る。**claim動線の体験そのものが変わるので
オーナー判断が要る。**

| 案 | 費用対効果 |
| --- | --- |
| A | `revalidate = 300` を全面適用（上記の副作用を受け入れる） |
| B | 静的な部分（団体情報・写真・口コミ）だけキャッシュし、`claim_status` は Client 側で都度取得 | 副作用なし。実装は重い（1日弱） |
| C | `revalidate = 60` に短縮して妥協 | 効果1/60でも十分大きい。副作用は最大1分 |

### 3-4. ⚪ 上限の無いクエリ（`/timeline`・`/schedule`・団体ページの写真/口コミ）

いずれも `.limit()` が無い。今はデータが少なく害が無く、上限を付けると
**表示される件数が変わる**ため未実装。`/schedule` は過去のイベントまで無条件に全件引いており、
イベントが増えたときに最初に痛むのはここ。**claim後の運用が始まる前に上限か日付条件を入れるべき。**

---

## 4. トークン第1バッチの前に必須か／後でよいか

| 項目 | 判定 | 理由 |
| --- | --- | --- |
| トップの count 19本の除去（実装済み） | **済** | 送信前に入っている |
| `/search` のデバウンス（実装済み） | **済** | 送信前に入っている |
| **`/search` の件数上限（3-1 案A or B）** | **🔴 送信前に必須** | perf ではなく**正しさ**。「2,421団体」の先で1,000件しか出ない状態で1,400団体を呼ぶと、掲載されているのに見つからない団体が出る。最低でも案B（上限の明示）は入れる |
| **索引 #1 `organization_page_views`** | **🔴 送信前に推奨** | 索引ゼロ。claim後に最も速く悪化する表。適用は数ms |
| **索引 #2 `organization_members (user_id)`** | **🔴 送信前に推奨** | 引き取った団体のダッシュボードと RLS がここを毎回引く |
| 索引 #3〜#7 | 🟡 後でよい | 対象表が各32kB。実害が出るのは団体が中身を入れ始めてから |
| `/organizations/[id]` の ISR（3-3） | 🟡 **判断だけ送信前に** | 最大のレバー。案Cなら送信前に入れられる。判断を保留するなら、送信は**バッチを分割**して負荷を見ながら進める |
| `/timeline`・`/schedule` の上限（3-4） | ⚪ 後でよい | 流入経路ではない（ログイン必須） |
| 全文検索への移行（3-1 案C） | ⚪ 後でよい | 2,421行では割に合わない |
| `.or()` のエスケープ修正 | ⚪ 後でよい | 挙動が変わる。純粋関数＋テストで別途 |

**送信前にやるなら最小構成はこの3つ**：`/search` の件数上限（案B なら10分）、索引 #1、索引 #2。
索引2本は `034` から該当行だけ抜き出せば数ミリ秒で終わる。

---

## 5. 計測に使ったクエリ（再現用）

```sql
-- 索引の棚卸し
select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by 1,2;

-- 全件走査の実績
select s.relname, s.seq_scan, s.seq_tup_read, s.idx_scan,
       pg_size_pretty(pg_total_relation_size(c.oid))
from pg_stat_user_tables s join pg_class c on c.oid = s.relid
order by s.seq_tup_read desc;

-- 実際に重いクエリ（PostgREST 経由のものが見える）
select calls, round(total_exec_time::numeric,1) total_ms,
       shared_blks_hit+shared_blks_read blks, left(regexp_replace(query,'\s+',' ','g'),150)
from pg_stat_statements where query ilike '%organization%' order by total_exec_time desc;

-- /search の DB 側
EXPLAIN (ANALYZE, BUFFERS) SELECT id,name,university,category,description,logo_url,
  member_count,activity_frequency,is_intercollege,target_grades,selection_process
FROM organizations WHERE is_approved ORDER BY name;

-- 読み取り RLS に行ごとのサブクエリが無いことの確認
select tablename, policyname, cmd, roles::text, qual from pg_policies
where schemaname='public' and cmd='SELECT';
```

PostgREST の1,000行上限は実リクエストで確認した（`Content-Range: 0-999/2421`、
非圧縮 328,988 bytes / 0.68s、gzip 57,545 bytes / 0.17s）。

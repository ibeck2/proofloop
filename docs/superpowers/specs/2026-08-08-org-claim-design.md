# 掲載団体の claim 動線 — 設計

> 掲載済みの学生団体が、自分のページを引き取って管理者になるための仕組み。
> ロードマップ上のタスク B1/B2（`docs/roadmap-2026-08-to-2027-01.md`）に対応する。
>
> **状態：設計確定（2026-08-08 承認済み）。実装計画はこの後 `superpowers:writing-plans` で作る。**

**日付：2026-08-08** ／ 使用スキル：`superpowers:brainstorming`

---

## 1. 背景と目的

本番DBには承認済みの学生団体が 2,421 件あるが、**アカウントの主がいるのは 1 件だけ**である。掲載ページは存在するのに、団体自身がそれを管理する手段がない。

`app/(club)/clubdashboard/OrganizationProfileForm.tsx:472-488` を確認したところ、団体を持たないユーザーの唯一の経路は `organizations` への**新規 INSERT** だった。既存の掲載レコードに紐づく導線が存在しない。

このまま掲載通知（SNS DM）を送ると、引き取りに来た団体が重複レコードを作り、元の掲載は主のいないまま残る。インデックス済み 472 ページに duplicate が混ざり SEO を毀損する。**claim 動線は掲載通知の前提条件**であり、これが無いうちは通知を1件も送れない。

### この設計が満たすべき要件

1. 掲載団体が自分のページを引き取れる
2. **偽物による乗っ取りを防ぐ**
3. **乗っ取りを検知し、巻き戻せる**（オーナー判断により 2 と同格の要件）

---

## 2. 調査で判明した事実

設計判断の根拠。すべて本番DBの実査（2026-08-08）による。

### 2.1 権限は `organization_members` だけで決まる

`organizations` の UPDATE ポリシー `organizations_update_by_members` は `get_user_organization_ids(auth.uid())` を見ており、**`organizations.user_id` は権限判定にまったく使われていない**（実質的に死んだ列）。

⇒ **claim とは「`organization_members` に `role='owner'` の行を1本入れること」に等しい。**

### 2.2 連絡先データは認証チャネルとして使える品質にない

| 指標 | 件数 |
| --- | --- |
| 承認済み団体 | 2,421 |
| **X が他団体と重複** | **339（14%）** |
| Instagram が重複 | 375 |
| 公式サイトが重複 | 396 |
| **専有チャネルを1つも持たない** | **199** |
| 団体名が `団体名` のままのレコード | 8（すべて上記199に含まれる） |

重複の実例：

- `suikyu_toh` … 東北大学の **27 団体**に紐づく（陸上競技部・柔道部・鉄道研究会・数学サークル・農学部ゼミナール等）
- `keio_circle` … 慶應の 16 団体
- `titanzz_esports` … 9 団体、うち 8 件は団体名が `団体名`
- `kyoto_fish_life` … 京大 8 団体
- `otc` … 東京科学大学 6 団体

⇒ **トークンを SNS DM に送るだけでは、`suikyu_toh` の運用者ひとりに 27 団体ぶんのオーナー権限を差し出すことになる。** トークンは「そのチャネルに連絡した」ことしか証明せず、オーナー権限の根拠にはできない。

⇒ **どんな承認フローを載せても、連絡先データの質という上限は超えられない。** 逆に、この重複の有無は自動判定できるため、承認者に渡す第一級のシグナルになる。

### 2.3 既存の招待トークンは未認証で全行読める

`organization_invitations` の SELECT ポリシー `"Anyone can view invite by token"` が `qual: true`。anon キーで実測したところエラーなく読めた（現在 0 件のため実害は出ていない）。

⇒ 同じ形で claim トークンを作ると、**2,222 件ぶんのトークンが誰でも列挙でき、任意の団体を乗っ取れる。** この設計では同じ穴を作らず、既存の穴も同時に塞ぐ。

### 2.4 応募データはまだ存在しない

`applications` は 0 件。いま claim されても他人の個人情報は流出しない。ただしこれは時間とともに変わる。

⇒ 段階的権限で守るべきは「機能の重要度」ではなく、**①巻き戻しを困難にする操作 ②他人の個人情報**の2つ。

### 2.5 権限フラグは既に揃っている

`organization_members` に `can_edit_profile` / `can_manage_posts` / `can_manage_members` / `can_manage_applications` / `can_manage_finance` が存在する。

⇒ 段階的権限は**新しい仕組みを作らずに表現できる。**

---

## 3. 決定事項

| # | 論点 | 決定 | 理由 |
| --- | --- | --- | --- |
| 1 | 承認の基準 | **危険信号のスクリーニング** | 「本物である証明」は現データでは原理的に作れない。運営には「怪しくないか」だけを見てもらう |
| 2 | 権限の昇格 | **シグナルの色で決める** | 状態が2つで済み、承認判定に使うシグナルを使い回せる |
| 3 | 異議申立ての既定動作 | **即凍結＋掲載を巻き戻す** | 検知・巻き戻しを事前防止と同格に置く方針と整合する |
| 4 | 構造 | **`organization_claims` を新設し SELECT 全面禁止** | 既存の脆弱パターンを引き継がない。招待と claim は主体も承認者も権限も違う別概念 |
| 5 | 共有ハンドルの団体 | **通知対象から外す** | 承認画面で弾くより上流で落とす。通知対象は 2,222 件となり、計画（1,400 件）に影響しない |

### 段階的権限の中身

| フラグ | limited | full | 根拠 |
| --- | --- | --- | --- |
| `can_edit_profile` | ✅ | ✅ | 団体自身のデータ。履歴で戻せる |
| `can_manage_posts` | ✅ | ✅ | 同上 |
| `can_manage_finance` | ✅ | ✅ | **claim 後に本人たちが入れるデータ。ゲートすると「実運用団体」KPI を塞ぐ** |
| `can_manage_members` | ❌ | ✅ | **偽オーナーが仲間を招くと巻き戻しが困難になる** |
| `can_manage_applications` | ❌ | ✅ | 他人の個人情報。現在 0 件だが将来効く |

---

## 4. データモデル

### 4.1 `organization_claims`（新規）

1回の発行が1行。同じ団体への再発行を許す（DMを見逃した団体へ後続バッチで再送するため）が、`approved` は同時に1つだけ。

| 列 | 型 | 意味 |
| --- | --- | --- |
| `id` | uuid pk | |
| `organization_id` | uuid not null | `organizations(id)` on delete cascade |
| `token` | uuid not null unique | claim URL に載せる値。既定 `gen_random_uuid()` |
| `channel` | text not null | `x` / `instagram` / `website` / `line` |
| `channel_handle` | text | 送信先の実値（**発行時点のスナップショット**） |
| `channel_is_unique` | boolean not null | **発行時点で他団体と重複していなかったか** |
| `issued_at` | timestamptz not null | |
| `expires_at` | timestamptz not null | |
| `revoked_at` | timestamptz | 運営による発行取消 |
| `status` | text not null | `issued` / `applied` / `approved` / `rejected` / `revoked` / `expired` |
| `applicant_user_id` | uuid | `auth.users(id)` |
| `applicant_role` | text | 申請者が名乗った役職 |
| `applicant_note` | text | 根拠の自由記述 |
| `applied_at` | timestamptz | |
| `signals` | jsonb | **判定時のシグナル一式を固めて保存** |
| `signal_verdict` | text | `green` / `red`。**赤が1つも無ければ `green`（灰は赤として扱わない）** |
| `decided_by` | uuid | |
| `decided_at` | timestamptz | |
| `decision_note` | text | |
| `granted_level` | text | `full` / `limited` |

`channel_handle`・`channel_is_unique`・`signals` を**スナップショットとして持つ**のが要点。データは後から変わるため、持たないと「なぜこの判定になったか」を後で再現できない。

**制約**：`organization_id` に対し `status='approved'` は1件までを部分ユニークインデックスで担保する。

**どのチャネルに発行するか**：団体が複数の専有チャネルを持つ場合、**X → Instagram → 公式サイト → LINE** の優先順で1つを選び、その1つに対してトークンを発行する。複数チャネルへ同時に別トークンを送ると、発行数が増えるだけで到達率は上がらず、監査も複雑になる。反応が無かった団体には後続バッチで**別チャネルへ再発行**する（`organization_claims` が1発行1行なのはこのため）。

### 4.2 `organization_snapshots`（新規）

| 列 | 型 | 意味 |
| --- | --- | --- |
| `id` | uuid pk | |
| `organization_id` | uuid not null | |
| `snapshot` | jsonb not null | `organizations` の全列 |
| `reason` | text not null | `pre_claim` / `pre_freeze` |
| `created_by` | uuid | |
| `created_at` | timestamptz not null | |

**凍結を双方向にできる形にする。** 承認時に `pre_claim` を取り、凍結時は現在の状態を `pre_freeze` として取ってから `pre_claim` に戻す。申立てが退けられたら `pre_freeze` に復帰する。片方向だと、偽の申立てで正当な団体の編集内容が消える。

**v1 では逐次の変更履歴を取らない。** 更新のたびに全列を積むのはコストが見合わない。凍結時の戻し先は claim 前、つまり「攻撃者が触っていないと分かっている最後の状態」とする。
⚠️ 後から追加はできるが、**取らなかった期間のデータは戻らない**（承認済みのトレードオフ）。

### 4.3 `organization_disputes`（新規）

| 列 | 型 | 意味 |
| --- | --- | --- |
| `id` | uuid pk | |
| `organization_id` | uuid not null | |
| `claim_id` | uuid | `organization_claims(id)` |
| `reporter_name` | text not null | |
| `reporter_contact` | text **not null** | **匿名申立てを許すと妨害コストがゼロになる** |
| `reporter_user_id` | uuid | ログインしていれば |
| `body` | text not null | |
| `status` | text not null | `open` / `upheld` / `dismissed` |
| `created_at` | timestamptz not null | |
| `resolved_by` / `resolved_at` / `resolution_note` | | |

**制約**：`organization_id` に対し `status='open'` は1件までを部分ユニークインデックスで担保する。アプリ側のチェックだけでは同時送信をすり抜ける（マイグレーション027 で費目の重複を防いだのと同じ手）。

### 4.4 `organizations` への追加列

`claim_status` text not null default `unclaimed`（`unclaimed` / `claimed` / `frozen`）。

導出可能だが、**凍結が「書き込みを止める」ことである以上、RLS の UPDATE ポリシーから参照できる場所に無いと実装できない。** 既存の `organizations_update_by_members` に `AND claim_status <> 'frozen'` を足す。

---

## 5. 判定シグナル

運営が「本物か」を判断するのではなく、**「危険信号がないか」を見る**ための材料。

| # | シグナル | 緑 | 赤 | 重み |
| --- | --- | --- | --- | --- |
| 1 | **チャネルの専有性** | そのハンドルはこの団体だけ | 他N団体と共有（**団体名を全部列挙**） | **最重要** |
| 2 | 大学ドメイン整合 | 申請者の大学メールが団体の大学と対応 | 明確に別大学 | 中 |
| 3 | 競合申請 | 他に申請なし | 同じ団体に他の `applied`/`approved` あり | 高 |
| 4 | 申請者の素性 | profile が埋まっている・アカウントに履歴がある | 作成直後の空アカウント | 低 |
| 5 | レコードの健全性 | 正常 | 団体名がプレースホルダ | 高 |

シグナル1 が設計の背骨。「このハンドルは東北大学の 27 団体で共有されています」と承認画面に出れば、運営は判断材料ゼロではなくなる。

### 大学ドメイン整合の扱い

13 大学ぶんのドメイン対応表を作るが、**「判定不能」を赤にしない。** サブドメインの揺れ（`g.ecc.u-tokyo.ac.jp` / `s.thers.ac.jp` / `eis.hokudai.ac.jp` 等）による取りこぼしで正当な団体を弾くと、そのまま claim 率が落ちる。不明は**灰**＝「判断材料にならない」として扱う。

`is_intercollege = true` の団体は大学が一意でないため最初から灰。

### 判定の合流点

- **全て緑または灰** → 運営が確認して承認 → **フル権限**
- **赤が1つでもある** → 自動では承認されず運営に回る → 追加確認のうえ **フル / 限定 / 却下**

「無審査で自動付与」は採らない。全緑でも人の目を1回通す（122 団体で合計 10 時間程度の想定）。

### 「追加確認」の手順（運営の手順書）

赤が出たときに運営が取れる手は3つ。コードではなく手順書として持つ。

1. **別チャネルへの再送** — 共有ハンドルが原因なら、専有チャネル（公式サイトの問い合わせフォーム等）へ送り直す
2. **公式アカウントからの応答を求める** — ※ハンドル自体が誤っていれば無意味なので、**シグナル1 が緑のときだけ有効**
3. **却下して保留にする** — **未 claim のままでも団体は何も失わない。** 判断材料が揃わないなら承認しないのが正しい既定

---

## 6. 画面フロー

### 6.1 `/claim/[token]` — 引き取りページ

トークンは RPC でのみ照合し、返すのは**団体名と状態だけ**。

| 状態 | 表示 |
| --- | --- |
| 無効・期限切れ・取消済み | 「このリンクは無効です」。**理由を区別しない**（総当たりに情報を与えない） |
| 既に claim 済み | 「既に関係者が管理しています」＋ 既存管理者への招待依頼と異議申立てへの導線 |
| 未ログイン | ログイン／新規登録へ。**トークンを保持して戻す**（既存の招待は「再度リンクを開いてください」と丸投げしており離脱要因。ここは改善する） |
| 有効・ログイン済み | 申請フォーム |

申請フォームで取るのは**役職**・**根拠の自由記述**・**関係者であることの確認**のみ。多くを聞いても偽物は書けてしまうため、摩擦を増やす意味がない。

送信すると `applied` になり、**その場ではオーナーにならない。**

### 6.2 `/admin/claims` — 承認画面

一覧にシグナルの色を並べる。詳細では赤の理由を具体的に出す（共有ハンドルなら**共有先の団体名を全部列挙**）。

アクションは4つ：**承認（フル）／承認（限定）／却下／発行の取消**。

### 6.3 団体ページの異議申立て導線

claim 済みの団体ページに「**掲載内容に心当たりがない場合はこちら**」を常設する。`/listing-policy` は掲載停止の窓口であり、乗っ取りの申告先としては見つけにくいため、claim 済みページに直接置く。

フォームは氏名と連絡先を必須とする。

**申立てを受け付けるのは `claim_status='claimed'` の団体のみ。** 未 claim の団体には凍結すべきオーナーも巻き戻すべき変更も無いため、そちらは既存の `/listing-policy`（掲載停止・訂正の窓口）が受け持つ。

送信すると1トランザクションで：

1. `organizations.claim_status` を `frozen` に（RLS が書き込みを止める）
2. 現在の状態を `pre_freeze` として保存
3. 掲載内容を `pre_claim` に戻す
4. **運営とオーナー双方に通知**（Resend）

**オーナーへの通知を必ず出す。** 凍結された側に理由が伝わらないと、正当な団体だった場合に反論の機会がなく対応も遅れる。

⚠️ **フォーム送信だけで誰でも団体を凍結できる。** 歯止めは「連絡先必須」「同一団体に `open` な申立ては1件まで」「運営へ即通知」の3つ。凍結は**書き込み停止と掲載の巻き戻しであって、ページの非公開化ではない**（承認済みのトレードオフ）。

### 6.4 `/admin/disputes` — 申立て対応

`open` の一覧から、**認容**（オーナー剥奪・claim を `revoked`・掲載は `pre_claim` のまま）か**却下**（凍結解除・`pre_freeze` へ復帰）を選ぶ。

---

## 7. セキュリティ境界

### 7.1 RPC がすべての出入口

`organization_claims` には **SELECT ポリシーを1本も張らない。** 直接は1行も読めず、以下の `SECURITY DEFINER` 関数だけが触る（既存の `is_org_member` 等と同じく `search_path` を固定）。

| RPC | 呼べる主体 | 責務 |
| --- | --- | --- |
| `get_claim_preview(token)` | 誰でも | 団体名と状態のみ返す。無効・期限切れ・取消を区別しない |
| `apply_for_claim(token, role, note)` | ログイン済み | `applied` へ遷移。シグナルを計算して `signals` に固める |
| `decide_claim(claim_id, verdict, level, note)` | admin のみ | `pre_claim` スナップショット → `organization_members` に owner 行 → `claim_status='claimed'` |
| `submit_dispute(...)` | 誰でも | 凍結一式を**1トランザクションで**（途中で落ちると中途半端に凍った団体が残る） |
| `resolve_dispute(...)` | admin のみ | 認容（剥奪）／却下（`pre_freeze` へ復帰） |
| `revoke_claim(claim_id, reason)` | admin のみ | 申立てが無くても運営判断で剥奪できる経路 |

admin 判定は既存のマイグレーション021/023 と同じ `profiles.role = 'admin'` に揃える。新しい権限概念は増やさない。

### 7.2 既存招待の穴を塞ぐ

`organization_invitations` の `"Anyone can view invite by token"`（`qual: true`）を **DROP** する。

既存機能が壊れないことは確認済み：

- `app/(club)/clubsettings/members/page.tsx:177` の一覧は `id, email, role, created_at` を取得しており、`organization_invitations_select_org_admins` で通る
- `app/api/emails/invite/route.ts:236` の `insert().select("token")` は、招待者自身が団体管理者なので同じポリシーで通る（`lib/supabaseRoute.ts` の Bearer クライアント＝anon キー＋ユーザーのトークンで RLS が効く）
- 受諾ページは RPC `get_invitation_preview`（`SECURITY DEFINER`）経由なので影響なし

### 7.3 監査は専用テーブルを作らない

`organization_claims`（誰がいつ何を根拠に決めたか＋`signals` の凍結）、`organization_disputes`（申立てと処理）、`organization_snapshots`（掲載内容の前後）の3つで「誰が・いつ・何を見て・何をしたか」が復元できる。別途 `audit_log` を作ると二重管理になるため作らない。

---

## 8. テスト方針

CLAUDE.md §5 に従い、**判定ロジックを DB から引き剥がして純粋関数にする。** `lib/claims/` に置き、`lib/finance/` `lib/gpa/` と同じ形にする。

| 関数 | テストする内容 |
| --- | --- |
| `evaluateSignals(claim, org, applicant, sharedHandles)` | 5つのシグナル判定。共有ハンドルで赤、専有で緑、インカレは大学照合を灰 |
| `resolveVerdict(signals)` | 赤が1つでもあれば運営送り、全緑/灰なら承認可 |
| `resolvePermissions(level)` | `full` / `limited` が返す5フラグの組み合わせ |
| `matchUniversityDomain(email, university)` | 13大学のドメイン対応。**取りこぼしが赤ではなく灰になること** |

RLS と RPC は Supabase MCP で実際に検証する。最低限：

1. **anon が `organization_claims` を1行も読めない**こと
2. **`frozen` の団体に owner が書き込めない**こと
3. **凍結 → 却下 → 復帰**で掲載内容が元に戻ること

---

## 9. スコープ

### この設計に含むもの

- `organization_claims` / `organization_snapshots` / `organization_disputes` の新設
- `organizations.claim_status` の追加と UPDATE ポリシーの改訂
- 上記6つの RPC
- `/claim/[token]`・`/admin/claims`・`/admin/disputes`・団体ページの申立て導線
- `lib/claims/` の純粋関数とテスト
- 既存 `organization_invitations` の SELECT ポリシー修正

### 前提となる別タスク（タスク0・実装の第一歩）

**連絡先データのクレンジング。** 共有ハンドルを検出し、専有チャネルを持つ 2,222 件を通知対象として確定する。`docs/models/build-org-outreach-list.mjs` が生成する優先順位リストにこのフィルタを追加する必要がある（現在は 2,354 件を対象にしており、共有ハンドルの 339 件を含んでしまっている）。

### この設計に含まないもの

- 逐次の変更履歴（v1 では `pre_claim` / `pre_freeze` の2点のみ）
- 掲載通知の文面と送信オペレーション（タスク B6/B9）
- セルフサーブ・オンボーディング導線（タスク B8）
- `organizations.user_id` の廃止（権限判定に使われていない死んだ列だが、除去は別途）

---

## 10. 未決事項

1. **13大学のドメイン対応表の実値。** 各大学のサブドメインは調査が必要。取りこぼしても灰になるだけで壊れないため、実装時に分かる範囲から始めて運用で足す。
2. **トークンの有効期限。** バッチ送信から返信までのリードタイムを踏まえて決める。初回は長め（90日程度）にし、第1バッチの実測を見て調整する。
3. **`/admin` のサーバーサイド認証ゲート（リスク S1）が未実装。** `/admin/claims` はクライアント側判定のみの既存パターンに乗ることになる。データは RLS と RPC の admin 判定で守られるため情報漏えいには至らないが、**タスク D3（`middleware.ts`）を claim 動線の公開前に片付けるのが望ましい。**

---

## 11. ロードマップへの影響

- 通知対象が **2,354 → 2,222 件**に減る。ただし6ヶ月で送る計画は 1,400 件なので**数値計画に影響しない**。
- タスク B5（優先順位リスト）は**再生成が必要**。共有ハンドルの 339 件を除外する。
- タスク B3（claim トークンの一括発行）は、**専有チャネルを持つ団体に対してのみ**発行する。

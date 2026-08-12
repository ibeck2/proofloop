# D9・D10 の実測記録（2026-08-12）

計画は `2026-08-12-d9-d10-plan.md`。ここには**実際に測った値だけ**を残す。

**適用状況（2026-08-12）**：035・036・037 いずれも本番適用済み。
036・037 は D9 のコードレビュー中に見つかった別件（S13・S12）で、オーナー承認を得て
同日中に設計・検証・適用まで完了した。詳細は下の「D9のあとに見つかった2件」を参照。

---

## D9：応募RLSのメンバー起点移行（マイグレーション035）

### 移行前の本番実測

| 確認項目 | 実測 |
| --- | --- |
| `organizations.user_id` が入った団体 | 1件 |
| うちメンバー行が無い（移行で権限を失う）団体 | **0件** |
| `organization_members` の総行数 | 1件 |
| `applications` / `application_messages` の行数 | **0件 / 0件** |

`organizations.user_id` を参照するポリシーは**本番に9本**あった（計画の「5本」は応募動線に限った数）。
残る4本の扱いは 035 の末尾コメントに記録。要点だけ：

- `events` / `profiles` / `tasks` の3本は**冗長**（メンバー起点の別ポリシーが同じ範囲を許可済み）
- `reviews` の「口コミへの返信」は冗長ではなく、claim オーナーは返信できない。
  ただし**返信UIが未実装**なので現時点で壊れているものは無い。機能を作るときに直す。

### 検証（`BEGIN; … ROLLBACK;`・本番書き込みなし）

`SET LOCAL ROLE authenticated` ＋ `request.jwt.claims` で `auth.uid()` を差し替え、
同一トランザクション内で「適用前 → 035適用 → 適用後」を測った。

| 立場 | role / flag | 応募が見える | DMが見える | 応募を更新 | claim団体へDM送信 |
| --- | --- | --- | --- | --- | --- |
| **適用前** ||||||
| 自作オーナー | owner / false | 1 | 1 | 1 | 拒否 |
| claim フル | owner / true | **0** | **0** | **0** | 拒否 |
| claim 限定 | member / false | 0 | 0 | 0 | 拒否 |
| 第三者 | （所属なし） | 0 | 0 | 0 | 拒否 |
| 学生本人 | — | 2 | 2 | 0 | 拒否 |
| **適用後** ||||||
| 自作オーナー | owner / false | 1 | 1 | 1 | 拒否 |
| claim フル | owner / true | **1** | **1** | **1** | **送信できた** |
| claim 限定 | member / false | **0** | **0** | **0** | **拒否** |
| 第三者 | （所属なし） | 0 | 0 | 0 | 拒否 |
| 学生本人 | — | 2 | 3 | 0 | 拒否 |

- claim フルが 0 → 1 に変わり、**バグの再現と解消の両方**が同一トランザクションで取れた。
- **claim 限定は適用後も 0 のまま**＝`applications` / `application_messages` への到達は
  DBレベルで塞がっている。
  ⚠️ ただし**これは「限定は他人の個人情報に触れられない」を意味しない。**
  応募者の個人情報は `profiles` にあり、`Public profiles are viewable by everyone` が
  `authenticated` に `qual: true` で開いている（＝全ログインユーザーが全員のメールを読める。
  リスク台帳 S12・claim とは別件）。限定で実際に付く権限の一覧は設計書 §10.5.6。
- 自作オーナーの既存アクセスは 1 のまま維持（`role IN ('owner','admin')` の側で通っている）。
- 学生本人のDMが 2 → 3 に増えているのは、claim フルが直前に送信に成功した1件。

### 🔴 検証中に見つかった別の不具合（035 に同梱）

`organization_members_role_check` が `CHECK (role = ANY (ARRAY['owner','admin']))` のままで、
**`'member'` を許していなかった**（001〜034 のどこでも緩めていない）。

033 は「限定承認では `role='member'` を書く」ことを C1 の対処にしている。
つまり `decide_claim` を `p_level='limited'` で呼ぶとメンバー行の INSERT が
`23514 check_violation` で落ちる。関数の EXCEPTION 節は `unique_violation` しか
捕まえないので、運営には 500 が返る。

⇒ **限定承認は本番で一度も成立しない状態だった。** claim を1件も承認していないため実害なし。
035 で `'member'` を許す。`organization_invitations` 側の同名制約は緩めない
（招待で 'member' を配れるようにする必要が無いため）。

TS 側（`lib/organizationMembers.ts:149` とそのテスト）は `role='member'` を前提に
書かれており、DBだけが追随していなかった。

---

## D10：`/organizations/[id]` の ISR ＋ オンデマンド再検証

### ISR がなぜ一度で効かなかったか（Next 15.5.12 / `next start` で実測）

| 状態 | ビルド分類 | 応答 |
| --- | --- | --- |
| `export const revalidate = 300` だけ | `ƒ Dynamic` | `Cache-Control: no-store`・`x-nextjs-cache` なし |
| ＋ `generateStaticParams`（空配列） | `● SSG` | まだ `no-store`・`x-nextjs-cache` なし |
| ＋ `unstable_cache`（データキャッシュ） | `● SSG` | **`x-nextjs-cache: MISS → HIT`** |

原因は supabase-js が fetch に `AbortSignal` を渡すこと。Next の fetch キャッシュに
乗らないため、未キャッシュのデータ取得を含むルートが静的化から外れていた。
そこで結果そのものを `unstable_cache`（タグ `organization:<id>`）に載せた。

⚠️ 計測中、`pkill` で旧 `next start` を落としきれず新サーバーが `EADDRINUSE` で
起動に失敗し、**旧ビルドを測っていた**期間があった。3000番は PowerShell の
`Get-NetTCPConnection` → `Stop-Process` で落とすこと（CLAUDE.md の落とし穴と同じ）。

### 応答時間（同一団体ページへの連続6回・`next start`・ローカル）

| 回 | 時間 | キャッシュ |
| --- | --- | --- |
| 1 | 0.453 s | MISS |
| 2 | 0.005 s | HIT |
| 3 | 0.023 s | HIT |
| 4 | 0.005 s | HIT |
| 5 | 0.024 s | HIT |
| 6 | 0.020 s | HIT |

導入前（同じページ・同じ環境）は全リクエストが 0.04〜0.40 s で、Supabase の
APIログにも**リクエストのたびに4本のクエリ**（organizations / events /
organization_photos / reviews）が記録されていた。導入後は HIT のリクエストで
レンダリング自体が走らない。

存在しないIDの 404 も同様にキャッシュされる（MISS → HIT）。

### 再検証の入口を無防備にしない設計

**単独の `/api/revalidate` は作っていない。** 再検証は状態を変える呼び出しと
不可分にしてある。クライアントから RPC を直接呼ぶのをやめ、3本の Route Handler を通す。

| ルート | RPC | 再検証する条件 | 誰が通れるか |
| --- | --- | --- | --- |
| `POST /api/organizations/[id]/dispute` | `submit_dispute` | `ok` かつ実際に凍結した（`didFreeze`） | 未ログインでも可（RPCが anon に EXECUTE を許している）。ただし自動凍結は 032 のレート制限（1時間5件）で上限つき |
| `POST /api/claims/decide` | `decide_claim` | `ok` かつ `decision === 'approved'` | `is_system_admin()`（RPC内） |
| `POST /api/disputes/resolve` | `resolve_dispute` | `ok` | `is_system_admin()`（RPC内） |

対象パスとタグの決定は `lib/organizations/paths.ts` の純粋関数に切り出し、
テストで固定した（`[id]` のような route 形式を渡して2,400ページを一斉に
無効化してしまう事故を型と正規表現で防ぐ）。

### まだ実測できていないこと

**「凍結の直後に、待たずに表示が変わる」の端から端までの確認。**
発火には本番DBへの実際の書き込み（申立ての登録・承認）が要るため、
`BEGIN; … ROLLBACK;` では代替できない。現時点で確認できているのは
①再検証が呼ばれる条件の分岐、②パス／タグの値、③ISR が効いていること の3つ。
035 を本番適用し、最初のトークンを発行するとき（B18〜B21 のあと）に、
実際の申立てで一度確かめる。

---

## D9のあとに見つかった2件：S13（036）・S12（037）

D9のコードレビュー（`.superpowers/sdd/review-d9-d10-2026-08-12.md`）で、
「限定承認は他人の個人情報に触れられない」という記述が実態と違うという指摘（I1）を受けて
本番を実測したところ、独立した2つの穴が見つかった。オーナーに詳細を説明し、
両方とも「今すぐ着手」の承認を得て同日中に対応した。

### S13：`can_edit_profile`・`can_manage_posts`フラグが実は何も制限していなかった

本番実測：`pg_policies`のqual/with_checkに`can_edit_profile`・`can_manage_posts`を
参照する行は**0件**。実際に`organizations`のUPDATEと`organization_posts`の書き込みを
許可していたのは`get_user_organization_ids`（roleもフラグも見ない、そのメンバーかどうかだけ）
だった。033のC1・035の応募RLSとまったく同じ形の「フラグは存在するが誰も見ていない」穴。

オーナー判断：「学生向けに出される情報（掲載内容・投稿）は限定承認では書き換えられないようにする」
という基準で確定。tasks・financeは学生向けではないため対象外。

マイグレーション036で対応。`can_edit_org_profile`・`can_manage_org_posts`という035と同型の
判定関数を新設し、`organizations_update_by_members`と`organization_posts`の書き込み系3本を
差し替え、`decide_claim`の限定承認では`can_edit_profile`/`can_manage_posts`もfalseにした。

**検証（`BEGIN; … ROLLBACK;`）**：

| 立場 | 掲載内容を編集 | 投稿を新規作成 | 既存投稿を編集 | 既存投稿を閲覧 |
| --- | --- | --- | --- | --- |
| 自作オーナー | 1件（できた） | できた | — | — |
| claimフル | 1件（できた） | できた | 1件（できた） | 1件（見えた） |
| claim限定 | 0件（拒否） | 拒否された | 0件（拒否） | 1件（見えた＝設計どおり閲覧は制限しない） |
| 第三者 | 0件（拒否） | 拒否された | 0件（拒否） | 1件（見えた＝公開投稿は誰でも見られる。既存の仕様） |

### S12：全ログインユーザーが全ユーザーの`profiles`（emailを含む）を読めていた

本番実測：`profiles`のSELECTポリシー6本のうち`Public profiles are viewable by everyone`が
`roles={authenticated}` / `qual: true`。RLSはOR評価のため、この1本だけで他の関係ベースの
5本の絞り込みが意味を失っていた。claimとは無関係の既存問題。

**削除前に発見した依存**：`get_owner_user_ids_for_applied_orgs`（応募者が団体の連絡先を見るための
関数）が`role='owner'`のメンバーしか返さない。しかし実際の団体連絡先は`fetchOrganizationOwnerUserId`
（owner→admin→最古のメンバーの順）で選ばれ、限定承認（role='member'）が選ばれるケースを
想定している。応募完了時の通知メール（`OrganizationDetailClient.tsx`）と応募DMの通知メール
（`ChatRoom.tsx`）はどちらもこの経路を使っており、無条件ポリシーを消すだけだと**限定承認の
団体宛の通知メールが今後静かに失敗するようになる**ところだった（claim0件のため未表面化）。

マイグレーション037で、列権限には触れず（emailは本人・団体メンバー↔応募者の関係で正当に
必要なため）、無条件ポリシーの削除と、`get_owner_user_ids_for_applied_orgs`のrole制限撤廃
（`Clubs can view applicant profiles`と対称な形に）をセットで行った。

**検証（`BEGIN; … ROLLBACK;`）**：

| シナリオ | 修正前 | 修正後 |
| --- | --- | --- |
| 応募者からowner担当者の連絡先が見えるか | 見えた(1) | 見えた(1)・変化なし |
| 応募者からmember/限定担当者の連絡先が見えるか | 見えた(1) | 見えた(1)・変化なし（通知フロー維持） |
| 本人が自分のプロフィールを見られるか | — | 見えた(1) |
| 同僚が同僚のプロフィールを見られるか | — | 見えた(1) |
| **無関係の第三者から誰かのプロフィールが見えるか** | **見えた(1)** | **見えなくなった(0)** |

### 適用順序と結果

035 → 036 → 037 の順で本番に適用（`mcp__claude_ai_Supabase__apply_migration`）。
適用後に`pg_policies`・`pg_proc`を再実測し、想定どおりの定義に変わっていることを確認。
`npm test`（43ファイル・390テスト）・`npx tsc --noEmit`とも適用後にクリーン
（アプリ側コードは036・037では変更していないため、そもそも影響を受けない）。

### スコープ外として記録したもの（今回は対応しない）

`Clubs can view applicant profiles`は`get_user_organization_ids`（role・フラグ不問）が条件のため、
団体の**どのメンバーでも**その団体への応募者全員のプロフィールを見られる
（035が塞いだのは`applications`/`application_messages`テーブルへの到達であり、`profiles`側の
閲覧範囲は別問題）。実害は「団体内の誰が見られるか」に留まり、S12（全ログインユーザーへの
無条件公開）とは重大度が異なるため、今回のスコープには含めていない。

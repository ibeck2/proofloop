# タスク通知（レビュー移行・担当者アサイン）とオプトアウト基盤 設計

> 2026-08-17 ブレインストーミングで確定。次は `superpowers:writing-plans` で実装計画に落とす。

## 1. 背景・目的

`/clubtasks`（タスク管理）で、タスクが「レビュー待ち」に移行した時にレビュー者へ、担当者がアサインされた時に担当者へ、それぞれメールで知らせたい。ヒアリングでの「誰が何をやっているか把握できない」という声に対応する一手。

設計途中で「通知の都度、送るか確認するUIにすべきか」を検討したが、Trello・Jira・ClickUp・Linear等の主要タスク管理サービスを調査した結果、**送信の都度Yes/No確認を挟む設計は業界標準ではなかった**（confirmation fatigueを招く）。代わりに「デフォルトで自動送信＋受信者が事前に個人設定でオプトアウトする」方式が共通していたため、ProofLoopもこれに倣う。

あわせて、今後も通知（学生/企業からのDM、ProofLoopからのお知らせ等）が増えていくことを見据え、**汎用のオプトアウト基盤**をこのタイミングで作る。

## 2. スコープ

### 今回作るもの
- 汎用オプトアウト基盤（`notification_preferences`テーブル＋通知タイプレジストリ＋`/mypage/notifications`）
- 通知タイプ2種の実装：**タスクのレビュー移行通知**・**タスクの担当者アサイン通知**

### 今回作らないもの（将来の拡張ポイントとして残すのみ）
- チャット（DM）着信・claim系・団体管理者申請の可否など、**見逃すと実害がある通知**のオプトアウト化（意図的に対象外。常時送信のまま）
- アプリ内通知（未読バッジ・通知一覧画面）。配信チャネルはメールのみ
- 「ProofLoopからのお知らせ」等、今回具体化していない将来の通知タイプの実装

## 3. データモデル

### 3.1 `notification_preferences`（新規テーブル）

| 列 | 型 | 内容 |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→profiles | 本人 |
| `notification_type` | text | 例：`task_review_assigned` / `task_assignee_changed` |
| `organization_id` | uuid FK→organizations, nullable | 団体単位の通知はここに団体ID。将来のプラットフォーム全体通知（お知らせ系）はnull |
| `enabled` | boolean NOT NULL | オプトアウトした時だけ`false`の行を作る |
| `created_at` / `updated_at` | timestamptz | |

**重要な設計原則：行が存在しない＝有効（デフォルトON）。** 「何もしなければ通知が届く」を実現するため、レコードの有無で判定する（オプトインテーブルではなくオプトアウトテーブル）。一意制約はPostgresの標準UNIQUE制約だと`organization_id`がNULLの行同士が重複を許してしまうため、部分ユニークインデックスを2本に分ける：`UNIQUE (user_id, notification_type, organization_id) WHERE organization_id IS NOT NULL`と`UNIQUE (user_id, notification_type) WHERE organization_id IS NULL`。

RLS：`user_id = auth.uid()`の本人のみSELECT/INSERT/UPDATE/DELETE可。他人の設定は不可視。

### 3.2 通知タイプレジストリ（コード内定義）

`lib/notifications/registry.ts`（新規）に、通知タイプごとの静的なメタデータをTSで定義する。DBテーブルにはしない（動的追加のニーズが無く、YAGNIに反するため）。

```ts
type NotificationTypeMeta = {
  id: string; // "task_review_assigned" 等
  label: string; // UI表示名
  isOptional: boolean; // trueならオプトアウト可能。falseは常時送信で/mypage/notificationsに出さない
  isOrgScoped: boolean; // trueなら通知は団体単位（organization_idを伴う）
};
```

今回登録するのは`task_review_assigned`・`task_assignee_changed`の2件（いずれも`isOptional: true` / `isOrgScoped: true`）。既存のチャット・claim系などは今回レジストリに登録しない（登録＝オプトアウト機構に乗せる、という意味を持つため、まだ判断していないものを混ぜない）。

## 4. 発火ルール

比較対象は「保存/移動**前**の該当列」と「**後**の該当列」。

### 4.1 レビュー移行通知（`task_review_assigned`）
次をすべて満たす時に送信対象とする：
- 新`status`が`in_review`
- 新`reviewer_id`が設定されている
- 「以前は`in_review`でなかった」または「以前と`reviewer_id`が違う」（担当替えも含む）
- 新`reviewer_id`が操作した本人（`auth.uid()`）と異なる（自分宛てには送らない）

この1本のルールで、①ドラッグでレーン移動、②編集モーダルでの保存、③新規タスクをいきなり「レビュー待ち」＋レビュー者指定で作成、の3パターンをカバーする。発火箇所は`handleDragEnd`・`handleSave`の両方。

### 4.2 担当者アサイン通知（`task_assignee_changed`）
次をすべて満たす時に送信対象とする：
- 新`assignee_id`が設定されている
- 「以前と`assignee_id`が違う」
- 新`assignee_id`が操作した本人と異なる

ステータス条件は無し（どのレーンでもアサインは起こりうる）。かんばんのドラッグ操作では`assignee_id`は変化しないため、発火箇所は`handleSave`のみ。

### 4.3 オプトアウトの適用
上記の判定で「送信対象」となった場合でも、実際に送る前に`notification_preferences`で対象ユーザーの該当`notification_type`（＋`organization_id`）の設定を確認する。行が無い、または`enabled=true`なら送信。`enabled=false`の行があればスキップ（UIにエラー等は出さない。黙って送らないだけ）。

## 5. API設計

`/api/emails/task-notification/route.ts`（新規・1本）に`type: "review" | "assignee"`を持たせて共通化する。文面の骨格が同じ（「〇〇さんが『△△』というタスクの[レビュー待ちにしました／担当者にあなたを設定しました]」）ため、既存の承認/招待/応募/チャット/claim（文面が大きく異なるため専用ルートのまま）とは異なり、この2つだけ1ルートにまとめる。

既存パターンを踏襲：
- `RESEND_FROM`を使用
- DBに問い合わせない。受け取った値（`email`・`recipientName`・`taskTitle`・`organizationName`・`actorName`・`type`）をそのままResendへ渡すだけ
- `RESEND_API_KEY`未設定時は開発環境向けにスキップ扱いでHTTP 200を返す（既存4ルートと同じ）

呼び出し側（フロント）は`fetch(...)`を**awaitせず**fire-and-forgetで投げる（claim承認と同じベストエフォート。失敗してもタスク保存自体は成功のまま）。オプトアウト判定はフロント側で行い、オフなら`fetch`自体を呼ばない。

## 6. UI設計

### 6.1 `/mypage/notifications`（新規ページ）
本人がオプトアウト可能な通知タイプ（現時点でレジストリの`isOptional: true`の2件）をトグルで縦に並べる。団体単位の通知（`isOrgScoped: true`）は、本人が所属する団体ごとに行を分けて表示する（複数団体に所属している場合、団体Aではレビュー通知を受け取り団体Bでは受け取らない、という設定ができる）。

現時点で2件しかないためシンプルな一覧UIで足りる。件数が増えた時のグルーピング（通知タイプ別／団体別）は実装時の判断とする。

### 6.2 `/clubtasks`の変更点
- `loadMembers`の`profiles`selectに`email`を追加（既存の「Organization members can view coworker profiles」RLSで読める。RLS変更不要）
- `MemberOption`型に`email`を追加、`memberEmailById`マップを新設
- `handleDragEnd`・`handleSave`の成功後に、4節の発火ルール判定→オプトアウト確認→`fetch("/api/emails/task-notification", ...)`（awaitしない）

**確認ダイアログ・トーストは作らない。** 自動送信＋事前のオプトアウト設定のみ。

## 7. テスト方針

- 発火判定（4.1・4.2）を純粋関数として`lib/tasks/`に切り出し、TDDでカバー（新規作成／ステータス遷移／担当替え／自分宛て抑制の組み合わせ）
- オプトアウト解決（行の有無→`enabled`判定）を`lib/notifications/`に純粋関数化してテスト
- UIコンポーネントに判定ロジックを埋め込まない（CLAUDE.md §5の既存方針どおり）

## 8. 今後の運用ルール（CLAUDE.mdに追記済み）

新しい通知（メール等）を設計する際は、その通知をオプトアウト可能にするかどうかを必ずユーザーに確認する。見逃すと実害がある通知は原則オプトアウト対象外、実害が小さい通知はオプトアウト可能候補として扱う。仕組みは本設計の`notification_preferences`と`/mypage/notifications`に集約する。

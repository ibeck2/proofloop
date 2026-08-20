# `/clubschedule` 日程調整機能 設計（2026-08-20）

> 元の要件出所：学生団体ヒアリング調査（メモリ `proofloop-org-hearing-findings-2026-08`）で
> 「8月に訴求できる機能候補5つ」の推定導入団体数2位（約102団体）。CEO MTG後タスク構造化
> （`docs/superpowers/specs/2026-08-15-ceo-mtg-product-roadmap.md`）でも成熟度「固まってる」
> と判定済み。task-board.md タスクJの未着手項目。

## 1. 背景・ペインポイント

学生団体が現状使っているLINE/Discordには以下の不満がある（ヒアリングより）。

- **LINE**：日時固定の投票機能しかなく、複数候補への柔軟な回答ができない。
- **Discord**：既読がつかないため、幹事は「見たけど無視されているのか」「そもそも見られていないのか」を区別できない。

要件：メンバーの空き時間を一覧化し、数十人規模でも運用でき、未回答者が一目でわかること。

## 2. 差別化方針

候補日時への○/△/×投票という基本メカニクス自体は「調整さん」等の既存無料ツールと同型であり、
それ単体では差別化にならない。ProofLoopが優位に立てるのは、**団体の名簿
（`organization_members`）と認証済みログインを既に持っている**という一点から生まれる機能に限られる。

- **既読／未読の可視化（v1コア）**：調整さんは匿名の名前入力方式のため「回答した人」しか判別できず、
  「見たが答えていない人」を区別できない。ProofLoopは認証済みユーザーなので、ページを開いた時点の
  view記録から「未読／既読・未回答／回答済み」の3区分を出せる。これはDiscordの「既読がつかない」
  への直接回答であり、匿名前提のツールには原理的に実装できない。
- **未回答者への自動リマインドメール（v1コア）**：既存の通知メール基盤（`notification_preferences`
  ＋Resend）を再利用し、未回答者にだけ送る。調整さんはURLをLINE/Discordで都度手動再共有するしかない。
- （将来拡張）確定→`/clubevents`への自動変換、`tasks.assignee_id`・`organization_members.title`
  との文脈紐付け。v1スコープ外。

## 3. スコープ

### v1に含む
- 候補日時（日付＋開始時刻）を複数登録できる日程調整（poll）の作成・一覧・詳細
- 各候補への○/△/×回答（全メンバー可）
- 未読／既読・未回答／回答済みの3区分表示
- 幹事による「この候補に決定」マーク（確定フラグのみ、イベント自動生成はしない）
- 作成時の全メンバーへの通知メール、未回答者への手動リマインドメール（いずれもオプトアウト可能）

### v1に含まない（将来拡張として記録）
- 確定候補の`/clubevents`イベントへの自動変換
- `tasks`・`organization_members.title`との文脈紐付け
- カレンダーグリッド型（When2meet型）の空き時間自由入力
- 自動（cron）リマインド：現状のリポジトリに定期実行基盤が無いため新規インフラを伴う。v1は幹事の手動送信のみ。
- 団体外部（非メンバー・応募者）からの回答：v1は`organization_members`のみを対象にする

## 4. データモデル

マイグレーション番号は066以降を仮に想定（実装直前に最新を再確認する）。

### `schedule_polls`
| 列 | 型 | 備考 |
| --- | --- | --- |
| id | uuid PK | |
| organization_id | uuid NOT NULL REFERENCES organizations | |
| created_by | uuid REFERENCES profiles ON DELETE SET NULL | |
| title | text NOT NULL | |
| description | text | 任意 |
| created_at | timestamptz NOT NULL DEFAULT now() | |

### `schedule_poll_candidates`
| 列 | 型 | 備考 |
| --- | --- | --- |
| id | uuid PK | |
| poll_id | uuid NOT NULL REFERENCES schedule_polls ON DELETE CASCADE | |
| organization_id | uuid NOT NULL REFERENCES organizations | `task_comments`と同じくBEFORE INSERTトリガーで`poll_id`から自動導出、クライアント送信値は無視 |
| starts_at | timestamptz NOT NULL | 日付＋開始時刻。終了時刻は持たない |
| is_decided | boolean NOT NULL DEFAULT false | |
| created_at | timestamptz NOT NULL DEFAULT now() | |

`CREATE UNIQUE INDEX ... ON schedule_poll_candidates(poll_id) WHERE is_decided` で
「1 pollにつき決定候補は最大1件」をDB側から保証する。`schedule_polls`に`decided_candidate_id`列を
持たせる循環参照より単純なため、この形にする。

### `schedule_poll_responses`
| 列 | 型 | 備考 |
| --- | --- | --- |
| id | uuid PK | |
| candidate_id | uuid NOT NULL REFERENCES schedule_poll_candidates ON DELETE CASCADE | |
| organization_id | uuid NOT NULL REFERENCES organizations | トリガーで自動導出 |
| user_id | uuid NOT NULL REFERENCES profiles ON DELETE CASCADE | |
| response | text NOT NULL CHECK (response IN ('yes','maybe','no')) | DB=英語canonical値、UI=○/△/×。`tasks.status`と同じ変換パターン |
| updated_at | timestamptz NOT NULL DEFAULT now() | |

`UNIQUE (candidate_id, user_id)`。**書き込みはPostgRESTのupsertを使わず、
SECURITY DEFINER RPC `submit_schedule_poll_response(p_candidate_id uuid, p_response text)`に一本化する。**
理由：CLAUDE.mdに記録済みの既知の落とし穴（PostgRESTのupsertは`ON CONFLICT DO UPDATE`で
payload全列を対象にするため、主キー列にもUPDATE権限が必要になる。`profiles`で過去に本番事故が
起きたパターン）を、そもそも該当する書き込み経路を作らないことで回避する。RPC内部で
`auth.uid()`が対象candidateの所属団体のメンバーであることを確認したうえで
`INSERT ... ON CONFLICT (candidate_id, user_id) DO UPDATE SET response = ..., updated_at = now()`を行う。

### `schedule_poll_views`
| 列 | 型 | 備考 |
| --- | --- | --- |
| id | uuid PK | |
| poll_id | uuid NOT NULL REFERENCES schedule_polls ON DELETE CASCADE | |
| organization_id | uuid NOT NULL REFERENCES organizations | トリガーで自動導出 |
| user_id | uuid NOT NULL REFERENCES profiles ON DELETE CASCADE | |
| viewed_at | timestamptz NOT NULL DEFAULT now() | 初回閲覧時刻のみ記録 |

`UNIQUE (poll_id, user_id)`。詳細ページ表示時に`INSERT ... ON CONFLICT (poll_id, user_id) DO NOTHING`
（PostgRESTの通常INSERTで実行可。UPDATE権限は不要なため既知の落とし穴に当たらない）。

## 5. RLS方針

いずれも`get_user_organization_ids(auth.uid())`（020で定義済み・団体スコープの標準パターン）で
団体メンバーに限定する。`schedule_polls`・`schedule_poll_candidates`はSELECT/INSERT、
`schedule_poll_responses`・`schedule_poll_views`はSELECT/INSERTのみ（書き込みはRPC経由に一本化する
ため、テーブルへの直接UPDATEポリシーは作らない）。

- SELECT：4テーブルとも`organization_id IN (SELECT get_user_organization_ids(auth.uid()))`
- INSERT（polls・candidates）：全メンバー可、同条件
- 「決定」操作：`decide_schedule_poll_candidate(p_candidate_id uuid)`というSECURITY DEFINER RPCとして実装し、
  **呼び出し元が該当pollの`created_by`本人、または`get_user_admin_organization_ids(auth.uid())`
  （020で定義済み）に該当団体が含まれることを内部で確認**してから`is_decided`を更新する。
  全メンバーが作成できる一方、確定は作成者かowner/adminに限定することで、無関係な人が誤って
  確定させるリスクを避ける。

## 6. 画面構成

- `ClubSidebar`に「日程調整」項目を新規追加（`Kanban`等と同じ並びのアイコン、`CalendarClock`想定）
- `/clubschedule`：一覧（進行中／確定済みで簡易フィルタ）、新規作成フォーム（候補日時を複数追加できるUI）
- `/clubschedule/[id]`：
  - 候補ごとの○/△/×集計
  - メンバー×候補の回答マトリクス
  - 未読／既読・未回答／回答済みの3区分リスト
  - 「未回答者にリマインドを送る」ボタン（既読・未回答＋未読の両方が対象）
  - 幹事（作成者/owner/admin）向け「この候補に決定」ボタン

## 7. 通知の配線

`lib/notifications/registry.ts`の`NOTIFICATION_REGISTRY`に2種追加（`lib/types/notificationPreference.ts`の
`NotificationType`union型にも追加）。

- `schedule_poll_created`：poll作成時、団体の全メンバーへ自動送信
- `schedule_poll_reminder`：詳細画面のボタン押下時、未回答者へのみ送信

両方とも`isOptional: true, isOrgScoped: true`とし、既存の`/mypage/notifications`にそのまま出現する
（新規UIは不要）。送信経路は新規`/api/emails/schedule-notification/route.ts`を
`/api/emails/task-notification/route.ts`と同型で作成し、送信前にクライアント側で
`supabase.rpc("is_notification_enabled", {...})`を呼ぶパターンをそのまま踏襲する
（`app/(club)/clubtasks/page.tsx`の既存実装を参照）。

## 8. テスト方針

`lib/`配下に純粋関数を切り出しテストする（CLAUDE.md §5の既存方針）。対象候補：

- 回答値（`yes`/`maybe`/`no`）⇔ UI表示（○/△/×）の変換関数
- 未読／既読・未回答／回答済みの3区分判定ロジック（メンバー一覧・view記録・response記録から算出）
- 未回答者リスト算出（リマインド送信対象の抽出）

DB側（RLS・RPC）は`migration-safety`スキルに従い、本番`BEGIN...ROLLBACK`検証を実装計画に含める。

## 9. 未決事項・次のステップ

- マイグレーション番号は実装直前に最新を再確認して確定する
- `ClubSidebar`のアイコン選定は実装時に決定
- writing-plansスキルで実装計画に落とし込む

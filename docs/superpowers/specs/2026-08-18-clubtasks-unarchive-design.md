# /clubtasks 年度アーカイブの取り消し 設計

> 2026-08-18 ブレインストーミングで確定。次は `superpowers:writing-plans` で実装計画に落とす。

## 1. 背景・目的

年度アーカイブ機能（`docs/task-board.md`セクションW）のライブQA後、オーナーから「間違えてアーカイブした場合にデータを救出できない」との指摘があった。現状、`archive_organization_tasks` RPCで一括アーカイブしたタスクを元に戻す手段が無く、誤操作時の復旧経路が存在しない。本設計は、この一括アーカイブを取り消す機能を追加する。

## 2. スコープ

- **ラベル単位の一括取り消しのみ**（個別タスク単位の復元は対象外。ブレインストーミングでオーナーが選択）。現在のアーカイブが「団体内の未アーカイブタスクを一括でアーカイブする」一括操作であるのと対称に、取り消しも「指定したアーカイブラベルの全タスクを一括で現役に戻す」一括操作とする。
- 対象は`archive_organization_tasks`が書き込んだ`archived_at`・`archive_label`の2列のみ。子レコード（チェックリスト・添付・コメント）はタスクが現役に戻れば、既存のRLS（`archived_at IS NULL`を動的に見る）により自動的に通常通り編集可能に戻る。**子テーブル側の変更は不要。**

## 3. データモデル・権限モデル

新規テーブル・新規列は無し。新規RPCのみ追加する。

### RPC: `unarchive_organization_label(p_organization_id uuid, p_archive_label text) RETURNS integer`

`archive_organization_tasks`（マイグレーション057）と対称の設計：

- `SECURITY DEFINER`。呼び出し元が対象団体の`organization_members.role IN ('owner','admin')`であることを内部で検査し、満たさなければ例外を投げる。
- 指定した`archive_label`に一致し、かつ`archived_at IS NOT NULL`（＝現在アーカイブ済み）の全タスクについて、`archived_at`・`archive_label`をともに`NULL`に戻す（`organization_id`一致も条件に含める。他団体のラベルを誤って解除できないようにする）。
- 戻り値は実際に更新した行数（0件の場合＝既に取り消し済み・該当ラベルが存在しない、を呼び出し元がUIで区別できるようにする）。
- `REVOKE ALL ... FROM PUBLIC`／`REVOKE EXECUTE ... FROM anon`／`GRANT EXECUTE ... TO authenticated`は既存RPCと同じ方針。
- **列レベル権限への影響は無い**：`archived_at`・`archive_label`へのUPDATEは既に`authenticated`から剥がされ`archive_organization_tasks`のみが書ける状態（マイグレーション057/058）。本RPCも同じくSECURITY DEFINERでこの制限をバイパスして書き込む。既存の列GRANT・RLSポリシー（060/062）は変更不要（`archived_at IS NULL`を要求する既存ポリシーは、この操作の結果として`archived_at`がNULLに戻った**後**の状態にのみ影響し、RPC自体の実行はSECURITY DEFINERとして影響を受けない）。

## 4. UI

- アーカイブ履歴閲覧中（`archiveView.type === "label"`）に表示される「参照専用」バナーに、**owner/adminにのみ見える**「このアーカイブを取り消す」ボタンを追加する。
- ボタン押下で確認モーダルを表示する。文言例：「「{label}」を取り消し、{N}件のタスクを現在のタスクへ戻します。子タスクのチェックリスト・添付ファイル・コメントも通常通り編集できる状態に戻ります。」**Nは新規クエリ不要**：アーカイブ履歴を閲覧中、`loadTasks`は既に`archiveView`（選択中のラベル）でサーバー側絞り込み済みのため、`tasks`state（＝そのラベルの全件）の`.length`をそのまま使う。
- 実行後：
  - `unarchive_organization_label` RPCを呼び、返り値の件数をtoastで表示（0件の場合はエラートースト「対象のタスクが見つかりませんでした」）。
  - 「表示」フィルタを自動的に「現在のタスク」（`{ type: "current" }`）へ戻す（取り消したラベルはもう存在しないため、その場に留まると空の一覧になってしまう）。
  - `loadTasks`・`loadArchiveLabels`・`loadChecklistCounts`を再取得する（取り消し後のラベル一覧・現役タスク一覧・チェックリスト件数を最新化する）。

## 5. 権限UIガード

「年度アーカイブ」ボタンと同じ`activeRole === "owner" || activeRole === "admin"`判定を再利用する。一般メンバーには「取り消す」ボタン自体を表示しない（実際の権限担保はRPC内部のrole検査が担う点も既存のアーカイブ実行ボタンと同じ）。

## 6. テスト方針

- RPCの正しさはこれまでの archive 系マイグレーション（057・060・062）と同じくBEGIN…ROLLBACKで本番検証する：owner/adminは取り消せる、非owner/adminは拒否される、取り消し後に該当タスクへの通常の`.update()`（子テーブル含む）が再び成功することを確認する。
- UI側のロジック（ボタンの表示条件、確認モーダル、取り消し後に「表示」を"current"に戻す処理）はコンポーネント統合部分のため、既存の`page.tsx`パターンに倣い専用の純粋関数への切り出しは不要と判断する（既存の`handleArchive`も純粋関数化されていない、宣言的な副作用処理のため）。

## 7. スコープ外（将来検討）

- 個別タスク単位の復元。ブレインストーミングで見送り。
- 取り消し操作自体の履歴記録（誰がいつ取り消したか）。既存のアーカイブ実行自体もこの種の監査ログを持たないため、対称性のため今回は見送る。

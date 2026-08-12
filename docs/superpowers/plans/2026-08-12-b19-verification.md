# B19 の実測記録（2026-08-12）：マイグレーション038の本番BEGIN…ROLLBACK検証

計画は `docs/superpowers/specs/2026-08-12-b19-claim-revocation-design.md`。
検証対象は `supabase/migrations/038_claim_revocation.sql`（未適用・Task 1で作成）。
本ファイルは検証の**実行結果のみ**を残す。適用（Task 3）はまだ行っていない。

---

## 経緯：1回目の実行はハーネスのバグで失敗した

初回の検証スクリプトでは、フィクスチャ用の一時テーブル `_b19t` を作成した後、
`SET LOCAL ROLE authenticated` に切り替えてRPCを呼ぶ箇所（G1）で
`42501: permission denied for table _b19t` が発生し、アサーションに到達する前に
トランザクションが中断した。原因は一時テーブルの作成者ロール（MCP接続ロール）が
`authenticated` へのSELECT権限を付与していなかったこと。

これは **Task 1のマイグレーション本体の不備ではなく、検証ハーネス（ブリーフのSQL）側のバグ**
だったため、自己判断で修正せずBLOCKEDとして報告した（`.superpowers/sdd/task-2-report.md` 参照）。

修正：`CREATE TEMP TABLE _b19t (...)` の直後に `GRANT SELECT ON _b19t TO authenticated;` を追加。
この1行を加えたブリーフで再実行した（本番データ・マイグレーション本体は無変更）。

---

## 実行方法

`mcp__claude_ai_Supabase__execute_sql`（`project_id: "uhhofjcyotfyrlhaguvy"`）に、
以下を1本のSQLバッチとして送信した。

1. `BEGIN;`
2. Task 1のマイグレーション本体（`revoke_claim` / `resolve_dispute` の `CREATE OR REPLACE FUNCTION`、
   `list_approved_claims` の新規作成とGRANT）をそのまま貼り付け
3. 使い捨てフィクスチャ（本番の実ユーザー3名のIDを借用：admin 1件・非admin 2件、
   承認済みclaimは本番に0件のため新規に3件作成）
4. `SET LOCAL ROLE authenticated` ＋ `request.jwt.claims` で `auth.uid()` を差し替えながら
   6つのアサーション（G1・G2・B・D・F・G3）を `DO $$ ... RAISE EXCEPTION ... END $$;` で実行
5. `ROLLBACK;`

前提（2026-08-12時点の本番実測）：admin権限を持つprofilesが1件、auth.usersが3件
（うち非admin2件）、承認済みclaimは0件。

## 実行結果

```
ALL CHECKS PASSED (org1 restored, org2 frozen-skip, org3 via resolve_dispute, listing visibility)
```

最後の`SELECT`がこの文字列を返し、直後の`ROLLBACK;`まで到達した。途中で
`RAISE EXCEPTION`は一度も発火しておらず、6つのアサーションすべてを通過している。

| アサーション | 検証内容 | 結果 |
| --- | --- | --- |
| G1 | `list_approved_claims()` がadminに承認済みclaim（claim1）を返す。`organization_claim_status='claimed'`・`granted_level='full'` | 通過 |
| G2 | 非admin（applicant本人）からは `list_approved_claims()` が0件 | 通過 |
| B | `revoke_claim`（org1・claimed）：`removed_members=2`（申請者＋共犯者）、org1の名称・claim_statusが `claim前の名称1` / `unclaimed` に復元、claim1が `revoked`、メンバー行が0件に | 通過 |
| D | `revoke_claim`（org2・frozen）：メンバー行は消えるがorg2の掲載列（名称・claim_status）は無変更のまま維持（凍結解除の判断はresolve_dispute側に残る設計どおり） | 通過 |
| F | `resolve_dispute(..., 'uphold', ...)`（org3・未凍結の申立て）：`revoke_claim`への統合経由でorg3が `claim前の名称3` / `unclaimed` に復元、claim3が `revoked`、dispute3が `upheld` | 通過 |
| G3 | revoke後、claim1/claim2/claim3のいずれも `list_approved_claims()` の結果に現れない | 通過 |

本番データへの書き込みはゼロ（`BEGIN`〜`ROLLBACK`のトランザクション全体がロールバックされ、
使い捨てフィクスチャ・関数の`CREATE OR REPLACE`とも本番には残らない）。

## 結論

`038_claim_revocation.sql` の3つの変更点はいずれも設計どおりに動作することを確認した。

- `revoke_claim` への掲載内容の復元統合（claimed→復元 / frozen→スキップ）
- `resolve_dispute` のuphold分岐からの重複コード削除（`revoke_claim`経由でも復元が効く）
- `list_approved_claims`（承認済みclaim一覧RPC）の可視性（admin限定・revoke後は非表示）

Task 3（本番へのマイグレーション適用）に進む前に、この結果をユーザーに提示し、
明示的な適用の承認を得る必要がある（CLAUDE.mdの方針）。

---

## 本番適用済み（2026-08-12）

ユーザーの明示的な承認を得たうえで、`supabase/migrations/038_claim_revocation.sql`（Task 1が
committした内容そのまま・無改変）を `mcp__claude_ai_Supabase__apply_migration`
（`project_id: uhhofjcyotfyrlhaguvy`、`name: 038_claim_revocation`）で本番に適用した。

適用後の確認：

- `SELECT proname FROM pg_proc WHERE proname = 'list_approved_claims';` → 1行返る（`list_approved_claims`）
- `SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 3;` →
  最新行が `20260812123706 / 038_claim_revocation`

いずれもブリーフの期待どおり。本番で `revoke_claim` / `resolve_dispute` が更新され、
`list_approved_claims` が呼び出し可能になった。

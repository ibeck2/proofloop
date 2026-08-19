---
name: migration-safety
description: SupabaseのマイグレーションやRLSポリシー・GRANT/REVOKEを書く・変更する・本番適用する前に必ず使う。ProofLoopは同じ形のPostgres権限事故を複数回踏んでいる（REVOKE ALL FROM PUBLICのno-op、列指定REVOKEがテーブル単位GRANTに負ける、upsertがPK列のUPDATE権限を要求する等）。「マイグレーションを書いて」「RLSポリシーを直して」「この関数の権限を絞って」「本番に適用する前に確認して」といった依頼のときに必ず参照する。
---

# Supabaseマイグレーション・RLSの安全な変更

## なぜこのスキルがあるか

`CLAUDE.md` の「落とし穴」節に記録されている通り、ProofLoopはPostgresの権限モデル（GRANT/REVOKE/RLS）で**同じ形の事故を複数回本番で踏んでいる**。原因は毎回「知らなかった」ではなく「Postgresの権限の効き方が直感と違う」こと。このスキルはその既知のアンチパターンを、次に踏む前にチェックリストとして思い出すためのもの。

**唯一の正は `CLAUDE.md` 本体。** ここは要点の早見表であり、詳細な経緯・マイグレーション番号は必ずCLAUDE.mdで確認する。新しい落とし穴を見つけたら、このスキルではなく `claude-md-management:revise-claude-md` でCLAUDE.mdを更新する。

## 書く前に確認する5つのこと

### 1. `REVOKE ALL ... FROM PUBLIC` は効かない
`public` スキーマのデフォルト権限で `anon` / `authenticated` に直接EXECUTE/SELECT等が付いているため、`PUBLIC` 経由の取り消しは無効（no-op）になる。`SECURITY DEFINER` 関数を新設するときは、**`REVOKE EXECUTE ... FROM anon, authenticated` を明示するか、関数内部で必ず認可を確認する。**

### 2. 列を絞りたいなら「テーブル単位REVOKE→許可列だけGRANT」の順で書く
`REVOKE UPDATE (col1, col2) ON TABLE ...` は、そのテーブルに既にテーブルレベルの `GRANT UPDATE` が残っていると**無効**。Postgresの列ACLとテーブルACLは独立しており、テーブルレベル権限が残っている限りそのまま全列に及ぶ。

正しい手順：
```sql
REVOKE UPDATE ON TABLE public.your_table FROM authenticated;
GRANT UPDATE (col1, col2, ...) ON public.your_table TO authenticated;
```
INSERTも同様。**この形を適用したテーブルに新しい列を足すときは、許可列リストへの追加を忘れると、その列は一切書き込めなくなる**（`profiles.role` の030・`organizations.user_id` の029・`clubtasks`の057〜059と同じ罠）。

### 3. PostgRESTのupsertは、主キーにもUPDATE権限が要る
`upsert` は `ON CONFLICT (pk) DO UPDATE SET <payloadの全列>` を生成し、Postgresは**SET対象列のUPDATE権限を、実際に競合したかに関わらず**検査する。payloadに主キーが入る限り、**主キー列にもUPDATE権限がないとupsert全体が `permission denied` で落ちる**（030で`profiles.id`のUPDATE権限を外し、`signup`/`/mypage`の保存が数日壊れていた実例あり）。

### 4. RLSポリシーは「フラグ列があるから効いている」とは限らない
`can_manage_*` のような権限フラグ列が存在していても、**実際にそのポリシーが参照しているとは限らない**。変更前に必ず `pg_policies` を実測し、対象列を本当に見ているポリシーが存在するかを確認する。

```sql
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'your_table';
```

### 5. 本番でBEGIN…ROLLBACK検証するときのロール切り替えの罠
`SET LOCAL ROLE authenticated` に切り替えた後は、自作の一時テーブル（`CREATE TEMP TABLE`）もRLS未設定テーブル（RPC経由のみで読む設計のテーブル）も直接読めないことがある。
- 一時テーブル：作成直後に `GRANT SELECT ON <temp table> TO authenticated;` を足す
- RPC専用テーブル：`RESET ROLE` で強いロールに戻してから読む

**アサーションが失敗しても、先に「検証ハーネス側が見えていないだけ」を疑う。** 本番データやマイグレーション本体を疑うのはその後。

## 適用済みマイグレーションを書き換えない

**一度本番に適用したマイグレーションファイルは、後から編集しない。** 直したい内容があれば、新しい番号のマイグレーションを追加する。理由：
- 適用履歴と実際のファイル内容がずれ、次に読む人（未来のClaude含む）が誤った前提で判断する
- ロールバック・再適用の再現性が壊れる

このリポジトリには `supabase/migrations/*.sql` を編集しようとするとPreToolUseフックが警告を出す設定がある（`.claude/hooks/migration-edit-guard.mjs`）。警告が出たら「本当に未適用の下書きか」を確認してから進める。

## 本番適用前の最終チェックリスト

- [ ] `pg_policies` を実測し、変更対象のポリシーが実在することを確認したか
- [ ] `REVOKE`単体ではなく「テーブル単位REVOKE→列GRANT」の順で書いたか（列を絞る場合）
- [ ] upsertを使うテーブルなら、主キー列のUPDATE権限を確認したか
- [ ] `SECURITY DEFINER`関数なら、`anon`/`authenticated`からの実行権限を明示的に扱ったか
- [ ] `BEGIN; ... ROLLBACK;` で本番に対して検証したか（ロール切り替えの罠に注意）
- [ ] `docs/task-board.md` に検証記録を残したか
- [ ] CLAUDE.md §0の方針どおり、複数ファイルにまたがる変更・スキーマ変更は事前にPlan Modeで計画提示・承認を得たか

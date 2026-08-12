# タスクI2項目5 の実測記録（2026-08-13）：マイグレーション040の本番BEGIN…ROLLBACK検証

計画は `docs/superpowers/specs/2026-08-13-i2-remaining-items-design.md`。
検証対象は `supabase/migrations/040_claim_reissue.sql`（未適用。Task 1でコミット `64ba397`）。
本ファイルは検証の**実行結果のみ**を残す。適用（本番への`apply_migration`）はまだ行っていない。

---

## 040の要旨

先行申請による締め出しへの復旧（再発行）。`apply_for_claim`（029）は
`c.status NOT IN ('issued','applied')` のとき `invalid` を返すため、第三者が先に申請して
却下（reject）された場合、以後は正当な団体も含め誰もそのトークンで再申請できなくなる。
`organization_claims` にはINSERT/UPDATEポリシーが無くRPC経由のみが出入口（028参照）なので、
運営が却下済みclaimに対して新しいトークンを発行できるRPCを追加する。却下済みclaimの行自体は
監査記録として一切変更しない。

1. **`list_rejected_claims()`**：却下済みclaimの一覧（admin専用）。`list_pending_claims`（031）・
   `list_approved_claims`（038）と同じ権限モデル。`organization_claim_status` も返し、却下後に
   別の申請が承認されて既に解決済み（`unclaimed`でない）なら、フロント側で再発行ボタンを
   無効化できるようにする。
2. **`reissue_claim_token(p_claim_id uuid, p_reason text)`**：admin専用。対象claimが
   `status='rejected'`でなければ`invalid`を返す。却下済みなら、同じ団体・同じチャネル情報
   （channel/channel_handle/channel_is_unique）で新しい行を`status='issued'`として挿入し、
   新トークンを返す。元の却下claimの行は一切変更しない。

---

## 実行方法

`mcp__claude_ai_Supabase__execute_sql`（`project_id: "uhhofjcyotfyrlhaguvy"`）に、
以下を1本のSQLバッチとして送信した。

1. `BEGIN;`
2. 040のマイグレーション本体（`list_rejected_claims` / `reissue_claim_token` の
   `CREATE OR REPLACE FUNCTION`と`GRANT`/`REVOKE`）をそのまま貼り付け
3. 使い捨てフィクスチャ（本番の実admin profileのIDを借用。フィクスチャA＝却下済み・団体は
   未解決`unclaimed`、フィクスチャB＝却下済みだが団体は既に別claimで解決済み`claimed`、
   加えて却下済みでない`issued`のclaimを1件）
4. `SET LOCAL ROLE authenticated` ＋ `request.jwt.claims` で `auth.uid()` を差し替えながら
   5つのアサーション（Q・R・S・T・U）を `DO $$ ... RAISE EXCEPTION ... END $$;` で実行
5. `ROLLBACK;`

過去のセッション（039検証）で見つかった検証ハーネス側の落とし穴（`SET LOCAL ROLE authenticated`
のまま自作の一時テーブルやRLSポリシー無しテーブルを直接読むと0行になる）への対策を最初から
織り込んだ：一時テーブル`_b19t3`には作成直後に`GRANT SELECT ... TO authenticated`を付与し、
`organization_claims`への直接SELECT（S）は`RESET ROLE`で強いロールに戻してから行っている。
この対策のおかげで、今回は1回の実行でノーエラーで通過した（039のようなハーネス側の再修正は不要）。

## 実行結果

```
ALL 040 CHECKS PASSED (Q/R: listing, S: reissue creates correct row + preserves original, T: invalid target, U: forbidden)
```

最後の`SELECT`がこの文字列を返し、直後の`ROLLBACK;`まで到達した。途中で
`RAISE EXCEPTION`は一度も発火しておらず、5つのアサーションすべてを通過している。

| アサーション | 検証内容 | 何を証明するか | 結果 |
| --- | --- | --- | --- |
| Q | admin権限で`list_rejected_claims()`を呼ぶ。フィクスチャA（`organization_claim_status='unclaimed'`・`decision_note='テスト却下理由A'`）とフィクスチャB（`organization_claim_status='claimed'`）がそれぞれ正しい内容で返り、却下済みでない（`status='issued'`）claimCは一覧に混入しない | 却下済み一覧が正しい行だけを返し、`organizations.claim_status`を正しくJOINして`organization_claim_status`に反映できていること（フロント側で再発行ボタンの活性/非活性を出し分けるための情報が正確）。あわせて`WHERE c.status = 'rejected'`の絞り込みが効いていること | 通過 |
| R | JWTを非adminのランダムUUIDに差し替えて`list_rejected_claims()`を呼ぶ | `public.is_system_admin()`ゲートが効いており、非adminには1件も返らないこと（031・038と同じ権限モデルが040でも踏襲されていること） | 通過 |
| S | admin権限で`reissue_claim_token(claimA, 'B19検証(S)')`を呼ぶ。返り値`ok=true`・`token`が非NULL。その新トークンで`organization_claims`を検索すると、フィクスチャAと同じ`organization_id`・`channel='x'`・`channel_handle='@reissuetestA'`・`channel_is_unique=true`・`status='issued'`の新しい行が1件存在する。さらに元のclaimA行（`id`で検索）が`status='rejected'`・`decision_note='テスト却下理由A'`のまま無変更であることも確認 | **040の核心**：却下済みclaimに対して同じチャネル情報を引き継いだ新しい`issued`行が正しく作られること、かつ元の却下行を一切書き換えない（監査記録の保全）という設計どおりの挙動であること | 通過 |
| T | admin権限で、却下済みでない（`status='issued'`）claimC に対して`reissue_claim_token`を呼ぶ | 対象が`status<>'rejected'`のときは`{ok:false, error:'invalid'}`を返し、誤って`issued`行を再発行してしまわないこと | 通過 |
| U | 非admin（ランダムUUID）で、却下済みのclaimAに対して`reissue_claim_token`を呼ぶ | `public.is_system_admin()`ゲートがこのRPCでも効いており、`{ok:false, error:'forbidden'}`を返して非adminからの再発行を拒否すること | 通過 |

### ROLLBACKが確実に効いたことの確認

検証後、別クエリで以下を実行し、フィクスチャ・関数とも本番に一切残っていないことを確認した。

```sql
SELECT
  (SELECT count(*) FROM public.organizations WHERE name IN ('再発行検証団体A','再発行検証団体B')) AS leaked_orgs,
  (SELECT count(*) FROM public.organization_claims WHERE decision_note IN ('テスト却下理由A','テスト却下理由B','B19検証(S)')) AS leaked_claims,
  (SELECT count(*) FROM pg_proc WHERE proname IN ('list_rejected_claims','reissue_claim_token')) AS functions_present_in_db;
```

結果：`leaked_orgs=0`・`leaked_claims=0`・`functions_present_in_db=0`。フィクスチャの団体・claimは
1件も残っておらず、`CREATE OR REPLACE FUNCTION`による2関数の作成も含めてロールバックされている
（本番にはまだ`list_rejected_claims`も`reissue_claim_token`も存在しない）。

## 結論

`040_claim_reissue.sql` の2つの新規関数はいずれも設計どおりに動作することを確認した。

- `list_rejected_claims`：admin専用で却下済みclaimを一覧し、団体側の`claim_status`
  （`organization_claim_status`）を正しく反映する（Q）。非adminは0件（R）。
- `reissue_claim_token`：却下済みclaimに対してのみ、同じチャネル情報を引き継いだ新しい
  `issued`行を作成し、元の却下行は一切変更しない（S）。対象が却下済みでなければ`invalid`（T）、
  非adminなら`forbidden`（U）を返す。

本番へのマイグレーション適用（`apply_migration`）は、この結果をユーザーに提示し、
明示的な適用の承認を得たうえで別ステップ（Task 3）として行う（CLAUDE.mdの方針）。

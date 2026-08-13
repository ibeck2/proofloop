# タスクI2残り3項目 全体レビュー対応の実測記録（2026-08-13）：マイグレーション041の本番BEGIN…ROLLBACK検証

計画は `docs/superpowers/plans/2026-08-13-i2-remaining-items.md`（全体レビュー・opusによる指摘）。
検証対象は `supabase/migrations/041_claim_reissue_hardening.sql`（未適用。commit `4b82d1a`）。
本ファイルは検証の**実行結果のみ**を残す。適用（本番への`apply_migration`）はまだ行っていない。

---

## 041の要旨

040（`list_rejected_claims` / `reissue_claim_token`）を本番適用後に行った全体レビューで、
Important1件・Minor2件が見つかった。

1. **【Important】発行済みトークンが可視化されていない**：`reissue_claim_token` が発行した新トークンは
   admin画面の一時state（`reissuedUrls`）にしか存在しない。コピー前にリロード・画面遷移すると
   完全に失われる。`list_pending_claims`/`list_approved_claims`/`list_rejected_claims` のどれも
   `status='issued'` のclaimを一覧しないため、失われた・二重発行されたトークンが誰にも見えず、
   取り消す手段も無いまま90日間生き続ける。→ `list_rejected_claims` に
   「その団体に未使用（issued/applied）のclaimが何件あるか」（`live_sibling_count`）を足し、
   画面で警告できるようにする。
2. **【Minor】TOCTOU**：`reissue_claim_token` が `organizations.claim_status` を見ておらず、
   UI側の「resolved」ガードだけに頼っていた。ページ読み込み後・クリック前に別のclaimが承認されると、
   既に解決済みの団体に無駄なトークンが発行される。→ RPC内部でも確認し、`'unclaimed'` でなければ
   `'already_claimed'` を返す。
3. **【Minor】ロック規約の不統一**：他のclaim系RPC（`apply_for_claim`・`decide_claim`・`revoke_claim`）は
   読んだ行を `FOR UPDATE` でロックしているが、`reissue_claim_token` だけ素の `SELECT` だった。
   → claim行・organizations行の両方を `FOR UPDATE` でロックし、規約を揃える。

---

## 実行方法

`mcp__claude_ai_Supabase__execute_sql`（`project_id: "uhhofjcyotfyrlhaguvy"`）に、
以下を1本のSQLバッチとして送信した。

1. `BEGIN;`
2. 041のマイグレーション本体（`list_rejected_claims`の`DROP FUNCTION IF EXISTS`＋
   `CREATE OR REPLACE FUNCTION`／`reissue_claim_token`の`CREATE OR REPLACE FUNCTION`と
   `GRANT`/`REVOKE`）をそのまま貼り付け
3. 使い捨てフィクスチャ（本番の実admin profileのIDを借用）
   - フィクスチャA＝却下済み・団体は未解決`unclaimed`。加えて同じ団体に
     有効な未使用兄弟claim1件（issued・期限内）と期限切れの兄弟claim1件（applied・期限切れ）
   - フィクスチャB＝却下済みだが団体は既に別claimで解決済み`claimed`
4. `SET LOCAL ROLE authenticated` ＋ `request.jwt.claims` で `auth.uid()` を差し替えながら
   3つのアサーション（V・W・X）を `DO $$ ... RAISE EXCEPTION ... END $$;` で実行
5. `ROLLBACK;`

過去のセッション（039・040検証）で見つかった検証ハーネス側の落とし穴（`SET LOCAL ROLE authenticated`
のまま自作の一時テーブルを直接読むと0行になる）への対策を最初から織り込んだ：一時テーブル
`_b19t4`には作成直後に`GRANT SELECT ... TO authenticated`を付与している。この対策のおかげで、
今回も1回の実行でノーエラーで通過した（ハーネス側の再修正は不要）。

## 実行結果

```
ALL 041 CHECKS PASSED (V: live_sibling_count excludes expired, W: reissue still works, X: TOCTOU guard blocks + no stray row)
```

最後の`SELECT`がこの文字列を返し、直後の`ROLLBACK;`まで到達した。途中で
`RAISE EXCEPTION`は一度も発火しておらず、3つのアサーションすべてを通過している。

| アサーション | 検証内容 | 何を証明するか | 結果 |
| --- | --- | --- | --- |
| V | フィクスチャAに対して`list_rejected_claims()`を呼ぶ。claimAの`live_sibling_count`が`1`であること | 有効な未使用兄弟（`status='issued'`・期限内）は`live_sibling_count`に数え、期限切れの兄弟（`status='applied'`・`expires_at`が過去）は数えないこと。「その団体に今も宙に浮いているトークンがあるか」という指標として、`status IN ('issued','applied') AND expires_at > now()`の絞り込みが両方とも正しく効いていることの確認。これがImportant指摘（発行済みトークンの不可視化）に対する画面警告の土台になる | 通過 |
| W | フィクスチャAのclaimAに対して`reissue_claim_token(claimA, 'B19検証(W)')`を呼ぶ。`ok=true`・`token`が非NULLで返ること | **回帰確認**：claim行・organizations行の両方に`FOR UPDATE`を追加した後も、正常系（却下済み・団体は未解決）での再発行が040と変わらず動作すること。ロック追加がデッドロックや意図しない挙動変化を引き起こしていないこと | 通過 |
| X | フィクスチャBのclaimBに対して`reissue_claim_token(claimB, null)`を呼ぶ。`ok=false`・`error='already_claimed'`が返ること。かつorgb向けに`status='issued'`の行が1件も作られていないこと | **TOCTOUガードの核心**：対象claim自体は`status='rejected'`で一見再発行できそうでも、団体（`organizations.claim_status`）が既に`'claimed'`＝別claimで解決済みなら、RPC内部のチェックで拒否されること。かつ拒否された場合に新しい`issued`行を一切作らない（無駄なトークンが漏れて残らない）こと。UI側のガードをすり抜けた場合でもDB側が最終防衛線として機能することの確認 | 通過 |

### ROLLBACKが確実に効いたことの確認

検証後、別クエリで以下を実行し、フィクスチャ・関数変更とも本番に一切残っていないことを確認した。

```sql
SELECT
  (SELECT count(*) FROM public.organizations WHERE name IN ('041検証団体A','041検証団体B')) AS leaked_orgs,
  (SELECT count(*) FROM public.organization_claims WHERE decision_note IN ('テスト却下A','テスト却下B','B19検証(W)')) AS leaked_claims,
  (SELECT count(*) FROM information_schema.routines WHERE routine_name = 'list_rejected_claims' AND routine_schema='public') AS list_rejected_claims_routines,
  (SELECT array_agg(parameter_name || ':' || udt_name ORDER BY ordinal_position)
     FROM information_schema.parameters
     WHERE specific_schema = 'public'
       AND specific_name = (SELECT specific_name FROM information_schema.routines
                             WHERE routine_name='list_rejected_claims' AND routine_schema='public')
  ) AS list_rejected_claims_current_return_shape;
```

結果：`leaked_orgs=0`・`leaked_claims=0`・`list_rejected_claims_routines=1`（＝関数自体は040由来のものが
そのまま存在）・戻り値の型は9列（`id`・`organization_id`・`organization_name`・`organization_university`・
`organization_claim_status`・`channel`・`channel_handle`・`decision_note`・`decided_at`）で、
`live_sibling_count`を含まない。つまり040時点の状態のままであり、トランザクション内で行った
`DROP FUNCTION` → 10列版への`CREATE OR REPLACE FUNCTION`もロールバックされていることが確認できた。
フィクスチャの団体・claimも1件も残っていない。

## 結論

`041_claim_reissue_hardening.sql` が塞ぐ3点（Important1件・Minor2件）はいずれも設計どおりに
動作することを確認した。

- **Important（発行済みトークンの不可視化）**：`list_rejected_claims`に追加した`live_sibling_count`が、
  有効な未使用兄弟claimだけを正しく数える（期限切れは除外）（V）。
- **Minor（TOCTOU）**：`reissue_claim_token`が`organizations.claim_status`を確認し、団体が既に
  解決済みなら`already_claimed`を返して再発行を拒否し、無駄な行も作らない（X）。
- **Minor（ロック規約）**：claim行・organizations行への`FOR UPDATE`追加後も、正常系の再発行は
  従来どおり動作する（W・回帰確認）。

本番へのマイグレーション適用（`apply_migration`）は、この結果をユーザーに提示し、
明示的な適用の承認を得たうえで別ステップとして行う（CLAUDE.mdの方針）。

# B19 — 運営が単独でclaimを剥奪できるUI — 設計

> 第三者の異議申立て（`submit_dispute`）が無くても、運営が乗っ取りに気づいた時点で
> 自力で「発行の取消」を実行できるようにする。`docs/task-board.md` タスクI2・B19。
>
> **状態：設計確定（2026-08-12 承認済み）。実装計画はこの後 `superpowers:writing-plans` で作る。**

**日付：2026-08-12** ／ 使用スキル：`superpowers:brainstorming`

---

## 1. 背景と目的

claim動線の設計（`docs/superpowers/specs/2026-08-08-org-claim-design.md`）が満たすべき要件3「乗っ取りを検知し、巻き戻せる」は、これまで**第三者からの異議申立て**（`submit_dispute` → `/admin/disputes` → `resolve_dispute`）経由でしか実現できなかった。

運営が監査ログや通報以外の経路（例：他の申請の審査中に既存承認済みclaimの不審な兆候に気づく）で乗っ取りを検知した場合、第三者の申立てを待たないと剥奪できない。設計書 §6.2 は承認画面に4アクション（承認フル／承認限定／却下／**発行の取消**）を想定していたが、実装されているのは最初の3つのみ（`app/admin/claims/page.tsx`）。

B19はこの4つ目を実装する。

---

## 2. 調査で判明した事実（2026-08-12 実測・前セッションの引き継ぎより）

### 2.1 `revoke_claim` RPCは既に存在するが、呼び出し元がアプリに無い

`public.revoke_claim(p_claim_id uuid, p_reason text)` は033で実装済み。申請者・claim後に追加されたメンバー・未受諾招待の削除と、`organization_claims.status='revoked'`への更新を行う。呼び出しているのは `resolve_dispute` の認容分岐のみで、`/admin/claims` からの直接呼び出しは無い。

### 🚨 2.2 `revoke_claim` は掲載内容を巻き戻さない（実装ギャップ）

`revoke_claim` は `organization_members` / `organization_invitations` の掃除しかしておらず、`organizations` の掲載列（`restore_organization_columns`）には一切触れない。「掲載内容を戻す」ロジックは呼び出し元の `resolve_dispute` 側（032）にだけ存在し、`froze_organization` が偽のときだけ手動で `restore_organization_columns` を呼んでいる。

⇒ このまま `/admin/claims` に「発行の取消」ボタンを足して `revoke_claim` を直接呼ぶだけだと、**メンバー・招待は消えるが、乗っ取り犯が書き換えた掲載内容はそのまま公開され続ける。**

### 2.3 承認済みclaimを一覧表示する経路が存在しない

`list_pending_claims()` は `WHERE c.status = 'applied'` のみ返す。「発行の取消」の対象になる承認済み（`approved`）claimは、`/admin/claims` はおろかアプリのどこからも一覧できない。

### 2.4 このセッションで確立した権限・RLSパターン（踏襲する）

- 判定関数は `SECURITY DEFINER` ＋ `SET search_path = public` ＋ `auth.uid()` を関数内部で参照
- Supabaseでは `REVOKE ALL ... FROM PUBLIC` が効かない。`REVOKE EXECUTE ... FROM anon` を明示する
- RLSを触る前に必ず `pg_policies` を実測する
- 本番検証は `BEGIN; … ROLLBACK;` で、複数の立場を同一トランザクション内で比較する

---

## 3. 方針

### 3.1 `revoke_claim` に復元処理を統合する（案a）

`resolve_dispute` のuphold分岐は「`revoke_claim`を呼ぶ→`froze_organization`が偽なら別途`restore_organization_columns`を呼ぶ」という形になっている。これをB19側でも別出しで再実装する（案b）と、復元漏れというバグパターンが2箇所に分散したままになる。

代わりに **`revoke_claim` 自体に復元処理を組み込み、`resolve_dispute` 側の重複コードを削除する**：

- `revoke_claim` の冒頭で `organizations.claim_status` を `FOR UPDATE` で読む（`decide_claim`/`resolve_dispute` と同じロック順序）
- 読んだ時点で `'claimed'` のときだけ、直近の `pre_claim` スナップショットを取得して `restore_organization_columns` を呼び、`claim_status` を `unclaimed` に更新する
- `'frozen'` のときは何もしない（`submit_dispute` が凍結時に既に `pre_claim` まで戻し切っている前提を維持。`claim_status` も触らない＝凍結解除の判断は引き続き `resolve_dispute` が持つ）
- `resolve_dispute` のuphold分岐から `IF NOT d.froze_organization THEN restore_organization_columns(...) END IF;` ブロックを削除する。`resolve_dispute` が `revoke_claim` を呼ぶ時点で、凍結していない申立てなら `organizations.claim_status` はまだ `'claimed'` のままなので、新しい `revoke_claim` が同じ条件で自動的に復元する。

これにより「剥奪すれば掲載内容も戻る」という不変条件が `revoke_claim` という1箇所に閉じ、呼び出し元（B19の管理画面・将来追加されるかもしれない別の経路）が復元を意識する必要が無くなる。

### 3.2 承認済みclaim一覧は `/admin/claims` に「承認済み」セクションとして追加する

新規ページ（`/admin/claims/approved`）や検索フォームのみの案も検討したが、`/admin/disputes` と同じ「一覧＋アクションボタン」パターンを1画面で踏襲でき、運営の動線が増えない。新規RPC `list_approved_claims()` を作る。

---

## 4. 設計

### 4.1 DB層

**`revoke_claim` の改修**（3.1の具体化。シグネチャは変更なし）：

```
CREATE OR REPLACE FUNCTION public.revoke_claim(p_claim_id uuid, p_reason text)
RETURNS jsonb ... AS $$
DECLARE
  ...
  org_status text;
  snap jsonb;
BEGIN
  IF NOT public.is_system_admin() THEN ... END IF;
  SELECT * INTO c FROM organization_claims WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN ... END IF;

  IF c.status = 'approved' AND c.applicant_user_id IS NOT NULL THEN
    -- (既存) 申請者本人・claim後追加メンバー・未受諾招待の削除は変更なし

    SELECT o.claim_status INTO org_status
      FROM organizations o WHERE o.id = c.organization_id FOR UPDATE;

    IF org_status = 'claimed' THEN
      SELECT s.snapshot INTO snap FROM organization_snapshots s
        WHERE s.organization_id = c.organization_id AND s.reason = 'pre_claim'
        ORDER BY s.created_at DESC LIMIT 1;
      PERFORM restore_organization_columns(c.organization_id, snap);

      UPDATE organizations SET claim_status='unclaimed' WHERE id = c.organization_id;
    END IF;
    -- org_status = 'frozen' のときは何もしない（既存コメントの意図どおり）
  END IF;

  -- (既存) organization_claims.status='revoked' への更新はそのまま
  ...
END;
$$;
```

`resolve_dispute` のuphold分岐からは、上記で不要になった手動 `restore_organization_columns` 呼び出しを削除する。

**新規RPC `list_approved_claims()`**：

```
CREATE FUNCTION public.list_approved_claims()
RETURNS TABLE (
  id uuid, organization_id uuid, organization_name text, organization_university text,
  organization_claim_status text,   -- 'claimed' | 'frozen'（frozenなら取消ボタンを無効化）
  applicant_user_id uuid, applicant_name text, applicant_email text,
  granted_level text, decided_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT c.id, c.organization_id, o.name, o.university, o.claim_status,
         c.applicant_user_id, p.full_name, p.email,
         c.granted_level, c.decided_at
  FROM organization_claims c
  JOIN organizations o ON o.id = c.organization_id
  LEFT JOIN profiles p ON p.id = c.applicant_user_id
  WHERE public.is_system_admin() AND c.status = 'approved'
  ORDER BY c.decided_at DESC;
$$;
```

`list_pending_claims`/`list_open_disputes`と同じ権限モデル（`REVOKE ALL FROM PUBLIC`＋`REVOKE EXECUTE FROM anon`＋`GRANT EXECUTE TO authenticated`）を踏襲する。

### 4.2 画面層（`app/admin/claims/page.tsx`）

- 既存の「未処理の申請」一覧の下に「承認済み（発行取消の対象）」セクションを追加。`list_approved_claims()` の結果を表示する
- 各行：団体名（リンク）／申請者の`applicant_name`・`applicant_email`／`granted_level`（フル・限定のラベル）／`decided_at`
- `organization_claim_status === 'frozen'` の行は「異議申立て対応中のため `/admin/disputes` で対応してください」という案内を表示し、「発行の取消」ボタンを`disabled`にする（`/admin/disputes`へのリンク付き）
- 「発行の取消」ボタン押下で、その行の下に**seal（深紅）で縁取った確認ブロック**をインライン展開する（`/admin`配下は§3の「危険信号」用法に従う）
  - 理由入力（`textarea`、必須）
  - 「取り消しを実行」（実行ボタン、理由が空の間は`disabled`）／「キャンセル」
- ネイティブ`confirm()`は使わない（claude-in-chromeでのテストやUIの一貫性のため、既存のsonner/トースト運用に合わせてインライン確認に統一）

### 4.3 API層 — 新規 `/api/claims/revoke`

`/api/claims/decide`・`/api/disputes/resolve`と同型のRoute Handler：

- Bearerトークン必須
- ボディ：`{ claimId, organizationId, reason }`。`organizationId`は`organizationPagePath`で検証（`organization_claims`にSELECTポリシーが無く、サーバ側でトークンから引き直せないため、既存の`decide`ルートと同じ制約）
- `supabase.rpc("revoke_claim", { p_claim_id: claimId, p_reason: reason })` を呼ぶ
- `result.ok`のときは常に`revalidateOrganizationPage(organizationId)`を呼ぶ（取消が成功すれば必ず掲載内容が変わるため、`decide`ルートのような条件分岐ヘルパーは不要。3.1により`revoke_claim`は非frozenの承認済みclaimに対して必ず掲載列を書き換える）
- 認可は`revoke_claim`自身の`is_system_admin()`が持つ（このルートは`/admin`配下ではないのでmiddlewareのBasic認証は掛からない、既存2ルートと同じ設計）

---

## 5. エラーハンドリング

- `revoke_claim`のエラーコードは既存どおり `not_found` / `forbidden` のみ（新規追加なし）
- フロント表示用のメッセージ変換は `lib/claims/claimRevocation.ts`（新規）に切り出す。`lib/claims/claimDecision.ts`の`claimDecisionErrorMessage`と同じ形
- RPC呼び出し自体が失敗した場合（ネットワーク等）は既存2ルートと同じく `502 / rpc_error`。フロントは「通信エラー」を表示し、一覧は再読込しない（取消が本当に効いたか不明な状態で成功扱いにしない）
- `frozen`な団体に対してクライアント側の無効化をすり抜けて呼ばれても、`revoke_claim`は`claim_status`を書き換えない設計（4.1）なので、二重実行しても状態は壊れない

---

## 6. テスト方針

- `lib/claims/claimRevocation.ts` の純粋関数（エラーメッセージ変換・理由必須のバリデーション判定）に対する単体テストを追加する。UIコンポーネントに計算を埋め込まない（CLAUDE.md §5）
- 可能であれば「取消後は常に再検証する」判定も純粋関数として切り出しテストする
- DB側（`revoke_claim`の復元統合・`list_approved_claims`）は既存のclaim系RPCと同様に自動テスト対象外。代わりに実装後、本番で `BEGIN; … ROLLBACK;` による手動検証を必須ステップとする：
  - 承認済み・非frozenの団体に対して`revoke_claim`を呼び、`organizations`の掲載列が`pre_claim`スナップショットに戻ることを確認
  - `resolve_dispute`の認容パス（frozen経由）を同一トランザクション内で流し、二重復元やエラーが起きないことを確認
  - `list_approved_claims()`をadmin以外のロールで呼び、0行またはforbidden相当になることを確認

---

## 7. スコープ外（今回はやらない）

- 剥奪履歴を閲覧する専用UI（監査ログの参照は今回作らない。`organization_claims.status='revoked'`とdecision_noteに残る記録で足りる）
- 承認済み一覧の検索・絞り込み（件数が少ないうちはYAGNI。増えてきたら別タスクで対応）
- `revoke_claim`のDBレベルでの理由必須化（`p_reason`は型上任意のまま。唯一の呼び出し元であるこのUIがフロント側で必須化する）

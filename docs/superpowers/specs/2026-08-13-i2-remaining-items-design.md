# タスクI2残り3項目（/signup復帰・先行申請の再発行・middleware確認） — 設計

> `docs/task-board.md` タスクI2「claim動線・公開前の残作業」の残り3項目（4・5・6）。
> トークン第1バッチ送信のゲート。B19（`revoke_claim`のUI・マイグレーション038/039）は
> 別セッションで完了済み。
>
> **状態：設計確定（2026-08-13 承認済み）。実装計画はこの後 `superpowers:writing-plans` で作る。**

**日付：2026-08-13** ／ 使用スキル：`superpowers:brainstorming`

---

## 1. 背景

`.superpowers/sdd/final-review-2026-08-09.md`（claim動線の最終レビュー）で見つかった Important 指摘のうち、B19（revoke_claim UI）以外の3件が未対応のまま`docs/task-board.md`のタスクI2に残っていた：

1. **I2（レビュー番号）＝`/signup`が`proofloop.claim.returnTo`を消費しない**。掲載団体の大半はアカウント未保有なので、新規登録経由でclaimに戻れないのは主経路の離脱要因。
2. **I6（レビュー番号）＝先行申請による締め出しに復旧手段が無い**。第三者が先に申請し却下されると、トークンは永久にロックされ正当な団体も申請できなくなる。
3. **middleware.ts（リスク台帳S1）の確認**。`/admin/disputes`が通報者PIIを扱うようになった影響で、S1の対策範囲に含まれているか要確認とされていた。

---

## 2. 調査で判明した事実

### 2.1 `/signup`の非同期性が`/login`と同じ手法を使えなくしている

`/login`（`app/login/page.tsx:87-92`）は`signIn()`が同期的に成功した直後に`sessionStorage`から`returnTo`を読んで`router.replace()`する。一方`/signup`の学生登録は`supabase.auth.signUp()`後、**メール確認を待つ非同期フロー**になる（`setSignupSuccess(true)`で確認メール送信画面へ）。メールのリンクをクリックして開くタブは`sessionStorage`を共有しないため、`/login`と同じ「同期的に消費する」手法は使えない。

確実な解決（`emailRedirectTo`にclaim URLを埋め込み、確認リンク自体をclaimページへのリダイレクトにする）はSupabase Auth側のRedirect URL許可リスト設定に依存しうるため、今回は最小対応（確認メール送信画面にURLを表示するだけ）に絞る（ユーザー承認済み）。

### 2.2 却下（`reject`）は`organization_claims.status`を`'rejected'`に落とし、`apply_for_claim`が入口で弾く

`apply_for_claim`（`supabase/migrations/029_org_claim_rpc.sql:80-84`）は`c.status NOT IN ('issued','applied')`のとき`invalid`を返す。`rejected`はこの条件に含まれるため、却下後は**誰も**（正当な団体本人でも）同じトークンで再申請できない。`get_claim_preview`も無効トークンとして扱う（`app/claim/[token]/page.tsx:230-232`、無効・期限切れ・取消を区別しない設計）。

`organization_claims`にはUPDATE/INSERTポリシーが無く（028参照）、RPC経由のみが出入口。新規発行も既存の`reject`パスを書き換えるのではなく、**別トークンを新規発行するRPCを追加**する方が、却下された申請の監査記録（`decision_note`等）を保全できる。

### 2.3 `middleware.ts`のmatcherは既に`/admin/disputes`を含む

```ts
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
```

パスベースの網羅なので、後から追加された`/admin/disputes`や`/admin/claims`の新セクションも自動的に対象に入る。コード変更は不要。

### 2.4 `sessionStorage`キー文字列の重複（DRY違反・今回ついでに直す）

`"proofloop.claim.returnTo"`が`app/claim/[token]/page.tsx:12`（定数定義）と`app/login/page.tsx:87,89`（ベタ書き）の2箇所に存在する。今回`app/signup/page.tsx`にも3箇所目を足すことになるため、共有定数へ切り出す。

---

## 3. 設計

### 3.1 項目4：`/signup`の確認メール送信画面にclaim復帰リンクを表示する（コード変更のみ・DB変更なし）

- `lib/claims/returnUrl.ts`（新規）に`CLAIM_RETURN_KEY = "proofloop.claim.returnTo"`を定義してexportする
- `app/claim/[token]/page.tsx`・`app/login/page.tsx`・`app/signup/page.tsx`の3ファイルとも、この定数をimportして使う（ベタ書きを廃止）
- `app/signup/page.tsx`の`signupSuccess`分岐に、`sessionStorage.getItem(CLAIM_RETURN_KEY)`を読んで値があれば

  > 団体ページの引き取り申請から来られた方は、登録完了後に **こちらのリンク** を開いて申請を続けてください：`/claim/xxx`

  という案内とリンクを表示する。値を消費（削除）はしない — メールクリックで別タブに遷移するため「実際に使われたか」をこの画面側で判定できず、`sessionStorage`はタブを閉じれば自然に消える。

### 3.2 項目5：`/admin/claims`に「却下済み（再発行可能）」セクションと再発行ボタンを追加する

**マイグレーション040（新規）**：

- `list_rejected_claims()` — `status='rejected'`のclaimを一覧するRPC。既存2つ（`list_pending_claims`／`list_approved_claims`）と同じ権限モデル（`SECURITY DEFINER`・`is_system_admin()`・`REVOKE`/`GRANT`）。戻り値に`organization_claim_status`を含める（却下後に別の申請が承認されて既に解決済みなら、UIで再発行を無効化するため）
- `reissue_claim_token(p_claim_id uuid, p_reason text)` — `is_system_admin()`必須。対象claimが`status='rejected'`であることを確認し、同じ団体・同じチャネル情報（`channel`/`channel_handle`/`channel_is_unique`）で新しい`organization_claims`行（`status='issued'`、`expires_at = now() + 90日`、新トークン）を作る。戻り値に新トークンを含める。`decision_note`に`p_reason`（再発行理由）を記録する新規の使い捨てログ的な意味合いはなく、これは**新しく作る行**の`applicant_note`等には触れない（そちらは申請者本人が`apply_for_claim`で埋める）。監査目的で、元の却下claimの行はそのまま残す（触らない）

**画面（`/admin/claims`）**：

- 「却下済み（再発行可能）」セクションを追加。各行に団体名・チャネル・却下理由（`decision_note`）を表示
- `organization_claim_status !== 'unclaimed'`の行は「再発行」ボタンを無効化し「既に別の方が引き取り済みです」と表示
- ボタン押下で`reissue_claim_token`をクライアントから直接呼ぶ（**Route Handlerを経由しない** — `organizations`の掲載内容・`claim_status`を一切変えないRPCのため、ISR再検証が不要な唯一の書き込み系RPCになる）
- 成功したら新トークンのURL（`${SITE_URL}/claim/<新トークン>`）を画面に表示する。コピーしてDM再送に使う想定なので、確認モーダルは不要（危険な操作ではない）

**新規lib（`lib/claims/claimReissue.ts`）**：

- `claimUrlFromToken(token: string): string` — `${SITE_URL}/claim/${token}`を組み立てる純粋関数。テスト対象
- `reissueClaimTokenErrorMessage(code: string | undefined): string` — `forbidden`／`invalid`（対象claimが却下済みでない・存在しない）／既定、の文言化。テスト対象

### 3.3 項目6：middleware確認（コード変更なし）

- `docs/risk-register.md`のS1行に「`/admin/disputes`・`/admin/claims`の新セクションも含め、`matcher`のパスベース網羅により追加対応不要と確認済み（2026-08-13）」を追記
- `docs/task-board.md`のI2項目6を完了としてクローズ

---

## 4. エラーハンドリング

- `reissue_claim_token`のエラーコードは`forbidden`／`invalid`の2種。`decide_claim`等と同じく、RPC自体の通信エラー（`error`オブジェクトが返る場合）はtoastで「通信エラー」を表示し、一覧を再読込しない
- `list_rejected_claims`の取得失敗時は既存2つの一覧と同じくtoast＋空配列にフォールバック

---

## 5. テスト方針

- `lib/claims/claimReissue.ts`の2つの純粋関数（`claimUrlFromToken`／`reissueClaimTokenErrorMessage`）に単体テストを追加する
- `lib/claims/returnUrl.ts`は定数のexportのみのため専用テストは追加しない（既存の`rememberReturn`/消費ロジックも同様にテストが無く、この項目だけ基準を変える理由がない）
- DB側（`list_rejected_claims`・`reissue_claim_token`）は既存のclaim系RPCと同様に自動テスト対象外。実装後、本番で`BEGIN; … ROLLBACK;`による手動検証を行う：
  - 却下済みclaimに対して`reissue_claim_token`を呼び、同じ団体・同じチャネル情報で新しい`issued`行が作られることを確認
  - 元の却下claim行が変更されていないことを確認（監査記録の保全）
  - `organization_claim_status`が`unclaimed`でない団体（既に別claimが承認済み）に対する`list_rejected_claims`の戻り値を確認
  - `reissue_claim_token`を非admin・却下済みでないclaim・存在しないclaimに対して呼び、それぞれ適切なエラーコードが返ることを確認

---

## 6. スコープ外（今回はやらない）

- 項目4の本格対応（`emailRedirectTo`によるメール確認リンク自体のclaimページへのリダイレクト）。Supabase Auth側の設定に依存しうるため、今回は最小対応（URL表示）に留める。将来必要になれば別タスクで、オーナーとSupabase Auth設定を確認のうえ着手する
- 項目5の(a)案（却下時に`status`を`issued`へ戻し履歴を別行に退避する設計）。今回選んだ(b)案（新規トークン発行）の方が既存の却下記録に触れず、実装も小さい
- 運営マニュアルの新規作成。項目5はUIで完結するため、現時点では運営マニュアル（`docs/manuals/`）に手順を書く必要が無い

# B18 本番実プロパティ再検証記録（2026-08-12）

計画・設計は `2026-08-12-ga4-token-redaction-plan.md` / `-design.md`。
最終レビューで指摘された Important #2（「実プロパティに対する再検証が行われていない」）への対応記録。

---

## 前提：デプロイのタイムライン

1. ローカル `main` が `origin/main` より7コミット先行していることが判明（D9・D10・
   マイグレーション035〜037・B18一式）。**push前は本番が旧コードのまま**だった。
2. **push前の実測**（`dpl_DHdkrFZ919c2rkg3mhZntH7ZobV1`）：
   `https://proofloop.jp/claim/00000000-1111-2222-3333-444444444444` への実アクセスで、
   GA4への実際の送信リクエスト（`analytics.google.com/g/collect`）の `dl` パラメータに
   ダミートークンがそのまま乗っていることを確認。これは「修正が効いていない」のではなく
   「修正がまだ本番に届いていない」ことの実証。
3. オーナー承認を得て `git push origin main` 実行（`5db7f08..6c0dbde`）。
4. 新デプロイの反映をポーリングで確認：`dpl_DHdkrFZ919c2rkg3mhZntH7ZobV1` →
   `dpl_bd3nmowdPpp3UhwUmE3Hxm6qkyt9` に変化（≈2分で反映）。

## push後の再検証（claude-in-chromeでの実ブラウザ操作・実プロパティ）

対象プロパティ：GA4「ProofLoop」（測定ID `G-6DW8LF5H7Q`・ストリーム「ProofLoop Web」）。
ローカルのダミー測定IDではなく、**本番の実測定IDに実際に送信されたリクエスト**を
Chrome DevTools相当のネットワーク監視で直接確認した。

| 確認対象 | dp（page_path相当） | dl（page_location） | 結果 |
| --- | --- | --- | --- |
| `/claim/00000000-1111-2222-3333-444444444444` | `/claim/[token]` | `https://proofloop.jp/claim/[token]` | ✅ 丸められている |
| `/invite/aaaa1111-bbbb-2222-cccc-333344445555` | `/invite/[token]` | `https://proofloop.jp/invite/[token]` | ✅ 丸められている |
| `/guide/credits`（無関係ページ） | `/guide/credits` | `https://proofloop.jp/guide/credits` | ✅ 丸められていない（意図どおり） |

`window.dataLayer` でも、`page_view` の**前**に `gtag('set', {page_path, page_location})` が
丸めた値で呼ばれていることを確認（Critical #1の修正が本番で実際に機能している証拠）。
これはgtag.js自身が以降の全イベントで使う基準値を書き換える呼び出しであり、
`page_view` 個別のイベント引数を丸めるより広い範囲をカバーする。

## 確認できなかったこと（正直な記録）

`user_engagement`（可視性変化・離脱で発火する自動イベント）そのものの実際の送信は、
この自動化ブラウザ環境では確実に発火させられなかった（タブの背景化・別タブへのフォーカス
移動を最大20秒試したが、`collect`リクエストは`page_view`のみで、`user_engagement`は
observed at network levelでは1件も観測できなかった。自動化環境が実際の
`document.visibilityState` 変化を伴わない可能性がある）。

ただし、`gtag('set', ...)` がgtag.js自身の内部状態（以降の全イベントが参照する基準値）を
書き換えるという挙動はGA4の公式な仕様であり、page_viewだけを特別扱いする仕組みではない。
`set`呼び出しが正しい値で実行されていることを`dataLayer`で直接確認できているため、
`user_engagement`個別の実地確認が取れなくても、修正の妥当性は機構レベルで裏付けられている。

## 結論

B18のコード・GA4管理画面設定・本番デプロイのすべてが完了し、実プロパティでの
page_view/dp/dlレベルの再検証も通過した。`user_engagement`個別の直接観測のみ
自動化環境の制約で未確認だが、修正メカニズムそのものは確認済み。
**B18はクローズしてよいと判断する。**

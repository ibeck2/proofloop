# 外部サービス・アカウント棚卸し

> ProofLoop が依存している外部サービスと、それぞれがどのアカウントに紐づいているかの調査結果。
> 「どのアカウントで登録したか分からなくなった」ときの出発点として使ってください。
>
> **重要**：このファイルに**シークレット（APIキー・トークン・パスワード）は一切書きません。**
> 公開情報（本番HTMLに出ているID等）と、確認の手がかりだけを記録します。
>
> **調査日：2026-07-22**（調査者：Claude Code。リポジトリ・本番HTML・Supabase MCP から判明する範囲）

---

## 0. まず結論

アカウント識別子は **4つ**あり、混在しています。

| 識別子 | 担当しているサービス | 状態 |
| --- | --- | --- |
| **ibeckzoom@gmail.com**（ibeck2） | GitHub、**Resend**、**バリューコマース**、Supabase（推定） | オーナー確認済み |
| **contact@proofloop.jp** | **GA4**（Search Console も同一の可能性が非常に高い） | オーナー確認済み |
| **contact@ibeck.co.jp** | Claude Code（このセッション）。Supabase MCP もこの接続経由 | — |
| **takenaka01@ibeck.co.jp**（CEO） | Ahrefs のワークスペース所有者 | 2026-07-16 時点の記録 |

**未確認：Vercel／さくらインターネット（ドメイン）／Search Console**（GSCはGA4と同じ `contact@proofloop.jp` の可能性が高い。§4参照）

> **注記**：当初 Claude は git 履歴から「Google系も `ibeckzoom@gmail.com` だろう」と推定しましたが、**実際は GA4 が `contact@proofloop.jp` で外れていました。** git の author や GitHub のユーザー名は、SaaS の所有アカウントの根拠にはなりません。以降も同じ推定はしないでください。

---

## 1. 特定できたもの

### Supabase ✅ 確定

| 項目 | 値 |
| --- | --- |
| 組織名 | `ibeck2's Org`（id: `ywzyggyhbbyflzyxxqly`） |
| プロジェクト名 | `ibeck2's Project` |
| プロジェクトRef | `uhhofjcyotfyrlhaguvy` |
| リージョン | `ap-northeast-1`（東京） |
| 作成日 | 2026-03-07 |
| 状態 | ACTIVE_HEALTHY |

- `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` がこの Ref を指しており、本番と一致。
- **Claude の Supabase MCP から参照できる**＝現在 Claude に接続済みのアカウントで管理できる状態です。
- 同じ組織配下に ProofLoop 以外のプロジェクトが7つあります（`ibeck-mentor-prod` / `aimentordirect` / `glow` / `alternative-study-school-db` / `aio-engine` / `native-shift` / `assessos`）。**課金は組織単位なので、ProofLoop の Supabase 費用は他プロジェクトと合算されています。**

### GA4 ✅ 確定（contact@proofloop.jp）

| 項目 | 値 |
| --- | --- |
| 測定ID | **`G-6DW8LF5H7Q`** |
| 設定場所 | Vercel の環境変数 `NEXT_PUBLIC_GA_ID`（**`.env.local` には入っていません**） |
| 実装 | `components/GoogleAnalytics.tsx` → `app/layout.tsx` |

- 本番 `https://proofloop.jp` のHTMLから取得（`googletagmanager.com/gtag/js?id=G-6DW8LF5H7Q`）。
- **ローカル開発では GA4 が動きません**（`.env.local` に `NEXT_PUBLIC_GA_ID` がないため）。これは意図した挙動として妥当です（開発時のアクセスが計測に混ざらない）。

### Google Search Console ⚠️ 認証済み・アカウントは未確定（contact@proofloop.jp の可能性が高い）

| 項目 | 値 |
| --- | --- |
| 認証方式 | HTMLメタタグ |
| 認証トークン | `zicR4FeCTjvprBg307Ih47ItJeaX1UU42bMt0pd7MuQ` |
| 設定場所 | `app/layout.tsx`（`metadata.verification`） |
| 追加日 | **2026-03-31**（コミット `dfbcb7d`、author: ibeck2） |

- メタタグ方式なので、**このタグを追加した Google アカウントが所有者**です。2026-03-31 に ibeck2 名義でコミットされています。

### GitHub ✅ 確定

| 項目 | 値 |
| --- | --- |
| リポジトリ | `https://github.com/ibeck2/proofloop`（Public） |
| コミット author | `ibeck2 <ibeckzoom@gmail.com>`（全78コミット、他の author なし） |

### Vercel ⚠️ プロジェクトは把握・アカウントは未確定

- **同一リポジトリに Vercel プロジェクトが2つ**紐づいています（2026-07-16 調査時点）。
  - `proofloop-2cea`（`prj_WcU...`）… **proofloop.jp を配信している本番**。ビルド成功。
  - `proofloop`（`prj_UqW...`）… `*.vercel.app` のみ。Supabase環境変数が未設定で**全ビルドがエラー**。本番配信はしていないためサイトへの実害はなし。
- 命名が逆転（本番が旧名の `proofloop-2cea`）しており、整理したい状態です。
- GitHub連携で作られている以上、**Vercelアカウントは GitHub（ibeck2）と連携している可能性が高い**です。

### Resend（メール送信）⚠️ 重要な発見あり

| 項目 | 値 |
| --- | --- |
| 用途 | 団体承認メール（`/api/emails/approve`）、招待メール（`/api/emails/invite`） |
| APIキー | Vercel環境変数 `RESEND_API_KEY`（`.env.local` になし） |
| **送信元アドレス** | **`onboarding@resend.dev`** |

- ⚠️ **送信元が `onboarding@resend.dev` のままです。** これは Resend が用意しているテスト用の共有アドレスで、独自ドメインが未認証であることを意味します。
  - 受信側には「ProofLoop運営 <onboarding@resend.dev>」と表示されます。**営業メールや団体への通知としては信頼性を損ないます。**
  - 迷惑メール判定されやすく、到達率にも影響します。
  - CLAUDE.md の「学生団体への通知メールを営業＆流入の入口にする」施策を実行するなら、**独自ドメイン認証は前提条件**です。

### ドメイン（proofloop.jp）⚠️ レジストラは把握・アカウント未確定

- DNS は**さくらインターネット**で管理（過去の調査記録より。ゾーンにAレコードが無く不通だった経緯あり）。
- Vercel向けの A / CNAME レコードをさくら側のゾーン編集で設定済み。

### Ahrefs ⚠️ CEO所有

- ワークスペース所有者：**takenaka01@ibeck.co.jp（CEO）**
- 2026-07-16 時点で **proofloop.jp のプロジェクト登録は未完**。Claude の Ahrefs MCP はこの CEO 側ワークスペースを参照します。
- プラン：Lite（月100,000ユニット）

---

## 2. アフィリエイト ❗ 実装されていません

CLAUDE.md には以下の記載があります。

> アフィリエイトはバリューコマース（sid: 3766669）。バイト系：アルバイトEX ／ インターン系：クラウドワークス

**しかし、リポジトリ全体を検索した結果、実際のアフィリエイトリンクは1本も実装されていません。** `3766669` も `valuecommerce` も、CLAUDE.md 以外のどこにも出てきません。`/baito` を含め、外部への送客リンクは存在しない状態です。

つまり現状：
- **バリューコマースのアカウントは存在するかもしれないが、サイトからは1円も発生していません。**
- CLAUDE.md の記述は「方針」であって「実装済みの事実」ではありません。

### 2026-07-22 判明

- **アカウントは `ibeckzoom@gmail.com` で存在します。**
- ただし**旧URL（Vercelの `*.vercel.app` ドメイン）で登録されていた**ため、`proofloop.jp` へのURL変更を**申請中**。**後日、審査結果が出ます。**
- したがって現状は「アカウントはあるが、承認が下りるまで proofloop.jp では稼働できない」状態です。

**審査が通ったら次にやること**（Claude が対応します）：
1. バリューコマースの管理画面から、アルバイトEX／クラウドワークスの広告リンク（トラッキングパラメータ付き）を取得していただく
2. そのリンクを `/baito` 等の該当箇所に実装
3. CLAUDE.md §5 の「就活系アフィリエイトは利益相反のため除外」方針は引き続き遵守（バイト系・インターン系のみ）

**注意**：審査結果が出るまでリンクを実装しても計測されない、あるいは規約違反になる可能性があります。**承認を確認してから実装します。**

---

## 3. アカウントを確定させる方法（5〜10分）

### GA4（測定ID `G-6DW8LF5H7Q`）

1. `https://analytics.google.com/` に **心当たりのある Google アカウントでログイン**
2. 左下の「管理」→ プロパティ列の「プロパティの詳細」で測定IDが `G-6DW8LF5H7Q` のものを探す
3. 見つかったら、そのアカウントがアクセス権を持っています
4. **所有者を確定するには**：管理 → プロパティ → 「プロパティのアクセス管理」を開く。**「管理者」権限のユーザー一覧＝実質の所有者**です

> 確認済み：**`contact@proofloop.jp`**（2026-07-22、Claudeが実際にログインして測定IDを照合）。

### Google Search Console

1. `https://search.google.com/search-console` に同様にログイン
2. `proofloop.jp` のプロパティが見えるアカウントが所有者
3. 設定 → ユーザーと権限 で「オーナー」を確認

> メタタグ方式なので、**2026-03-31 にこのタグを取得した Google アカウント**が確認済みオーナーです。

### Vercel

1. `https://vercel.com/` にログイン（GitHub連携の可能性が高いので **GitHubログインを最初に試す**）
2. `proofloop-2cea` と `proofloop` の2プロジェクトが見えるアカウントが該当
3. Settings → Members で所有者を確認

### Resend

1. `https://resend.com/` にログイン
2. API Keys 一覧に、Vercelの `RESEND_API_KEY` と一致するキーがあるか確認（先頭数文字で照合）
3. Domains を見て、`proofloop.jp` が未登録なら上記の「送信元がresend.dev」問題の裏付けになります

### ドメイン（さくらインターネット）

1. `https://secure.sakura.ad.jp/` の会員メニューにログイン
2. `proofloop.jp` が契約一覧にあるアカウントが所有者
3. **更新期限も同時に確認しておいてください**（失効するとサイトが即座に落ちます）

---

## 4. 確認できたら追記してください

各サービスの所有アカウントが判明したら、以下の表を埋めてください。次回以降、Claude もこの表を参照できます。

| サービス | 所有アカウント | 確認日 | 備考 |
| --- | --- | --- | --- |
| GitHub | **ibeck2 / ibeckzoom@gmail.com** | 2026-07-22 | git履歴から確定 |
| Supabase | （ibeck2's Org） | 2026-07-22 | 組織名から推定。ログイン用メールは要確認 |
| **GA4** | **contact@proofloop.jp** | **2026-07-22** | 測定ID `G-6DW8LF5H7Q`。オーナー本人が確認 |
| Search Console | 未確認（`contact@proofloop.jp` の可能性が非常に高い） | | メタタグ認証、2026-03-31追加。**GA4プロパティに Search Console 連携が設定済み**であることを確認（GA4左メニューに「Search Console」セクションが存在）。連携には両方の管理権限が必要なため、同一アカウントの可能性が高い |
| Vercel | 未確認 | | プロジェクト2つ（要整理） |
| **Resend** | **ibeckzoom@gmail.com** | **2026-07-22** | 送信元が resend.dev のまま（要対応） |
| さくらインターネット | 未確認 | | proofloop.jp のDNS。更新期限も要確認 |
| Ahrefs | takenaka01@ibeck.co.jp（CEO） | 2026-07-16 | proofloop.jp のプロジェクト登録は未完 |
| **バリューコマース** | **ibeckzoom@gmail.com** | **2026-07-22** | **旧URLで登録されていたため proofloop.jp へURL変更を申請中（審査待ち）。** サイトへの実装は未着手 |

### 判明した構図（2026-07-22）

アカウントは**4つ**に分かれています。当初の推定（Google系＝ibeckzoom@gmail.com）は**外れ**でした。

| 識別子 | 担当しているサービス |
| --- | --- |
| `ibeckzoom@gmail.com` | GitHub、Supabase（推定）、**Resend**、**バリューコマース** |
| `contact@proofloop.jp` | **GA4**（Search Console も同じ可能性が高い） |
| `contact@ibeck.co.jp` | Claude Code |
| `takenaka01@ibeck.co.jp`（CEO） | Ahrefs |

**運用上の含意**：計測系（GA4）と収益・インフラ系（Resend／バリューコマース／GitHub）が別アカウントに分かれています。担当者が変わるときの引き継ぎ漏れが起きやすい構成なので、この表を最新に保つ価値があります。

---

## 5. この調査で見つかった要対応事項

`docs/owner-todo.md` にも転記済みです。

1. **Resend の送信元が `onboarding@resend.dev`** … 独自ドメイン未認証。団体への通知メール施策の前提条件。
2. **アフィリエイトが未実装** … CLAUDE.md の記述と実態が乖離。収益導線がゼロの状態。
3. **Vercel プロジェクトが2つ** … 片方は全ビルド失敗中。命名も逆転しており整理が必要。
4. **ドメインの更新期限が未把握** … 失効するとサイトが落ちます。

---

## 6. GA4 の設定内容（2026-07-22 時点）

| 項目 | 値 |
| --- | --- |
| アカウントID | `398322026` |
| プロパティID | `542031657`（プロパティ名：ProofLoop） |
| ウェブストリーム | `ProofLoop Web` / `https://proofloop.jp` |
| ストリームID | `15100820953` |
| 測定ID | `G-6DW8LF5H7Q` |
| ログインアカウント | `contact@proofloop.jp`（表示名：loop Proof） |
| Search Console 連携 | **設定済み**（GA4左メニューに Search Console セクションあり） |

### 登録済みカスタムディメンション

| ディメンション名 | スコープ | イベントパラメータ | 登録日 |
| --- | --- | --- | --- |
| `metric_id` | イベント | `metric_id` | 2026-07-22 |
| `input_mode` | イベント | `input_mode` | 2026-07-22 |

未登録：`value_band`（必要になったら追加。上限50個に対し現在2個）

### `gpa_calculate` イベントが送る値

`app/gpa/GpaCalculatorClient.tsx` の `trackCalculate` から送信。**成績・評点・素点・科目名は一切送りません。**

| パラメータ | 内容 |
| --- | --- |
| `university_id` | 選択された大学のID（`u-tokyo-basic-average` など） |
| `university_tier` | `top`（調査対象の上位校）/ `other` / `unset` |
| `metric_id` | 換算方式のID（指標の種類を識別） |
| `value_band` | 満点に対する比率の帯（`0-50%` 〜 `87-100%`） |
| `course_count` | 分母に寄与した科目数 |
| `input_mode` | `per-course` / `by-grade` |

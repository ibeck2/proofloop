# メールレート制限の無効化（Email rate limit exceeded を防ぐ）

ログイン・新規登録時に「Email rate limit exceeded」が出る場合、Supabase の **認証まわりのメール送信レート制限** を緩和または実質無効にする必要があります。設定は **Supabase ダッシュボード** または **Management API** で行います。

## 方法1: ダッシュボードで変更（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard) でプロジェクトを開く
2. 左メニュー **Authentication** → **Rate limits** を開く
3. **Email rate limit**（メール送信のレート制限）の値を **大きくする**（例: `100` や `1000`）
   - これで「1時間あたりのメール送信数」の上限が上がり、ログイン・サインアップが制限されにくくなります

**注意**: カスタム SMTP を設定していない場合、この項目が編集できないことがあります。そのときは次を試してください。

- **Custom SMTP を設定する**: Authentication → Providers → Email で SMTP を設定すると、メールレート制限を変更できるようになる場合があります
- または **方法2** で Management API から `rate_limit_email_sent` を更新する

## 方法2: リポジトリのスクリプトで変更

プロジェクトに用意したスクリプトで、Management API を使ってメール送信レート制限を緩和できます。

1. [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) で **SUPABASE_ACCESS_TOKEN** を発行
2. ダッシュボードの **Project Settings** → **General** で **Reference ID** をコピー（**PROJECT_REF**）
3. プロジェクトルートで実行:

```bash
PROJECT_REF=あなたのプロジェクトID SUPABASE_ACCESS_TOKEN=発行したトークン npm run supabase:set-email-rate-limit
```

デフォルトで `rate_limit_email_sent` を **1000** に設定します。変更したい場合は環境変数で指定できます。

```bash
RATE_LIMIT_EMAIL_SENT=500 PROJECT_REF=... SUPABASE_ACCESS_TOKEN=... npm run supabase:set-email-rate-limit
```

## 方法3: Management API を直接叩く

1. アクセストークンを取得: [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)
2. プロジェクト参照 ID: ダッシュボードの **Project Settings** → **General** の **Reference ID**
3. 以下を実行（値は必要に応じて変更）:

```bash
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rate_limit_email_sent": 100
  }'
```

`rate_limit_email_sent` を `100` や `1000` などにすると、実質的に「email rate limit exceeded」を避けやすくなります。

## 参考

- [Supabase: Rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- 本番環境では、カスタム SMTP の利用と適切なレート制限の両方を検討してください。

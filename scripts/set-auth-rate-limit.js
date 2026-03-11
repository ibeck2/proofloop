/**
 * Supabase Auth のメール送信レート制限を緩和するスクリプト
 * 実行前に環境変数 SUPABASE_ACCESS_TOKEN と PROJECT_REF を設定してください。
 *
 * 例: PROJECT_REF=abcdefgh SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/set-auth-rate-limit.js
 *
 * PROJECT_REF は Supabase ダッシュボードの Project Settings → General の Reference ID です。
 * SUPABASE_ACCESS_TOKEN は https://supabase.com/dashboard/account/tokens で発行できます。
 */

const PROJECT_REF = process.env.PROJECT_REF;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const RATE_LIMIT_EMAIL_SENT = Number(process.env.RATE_LIMIT_EMAIL_SENT || "1000");

if (!PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
  console.error("環境変数 PROJECT_REF と SUPABASE_ACCESS_TOKEN を設定してください。");
  process.exit(1);
}

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    rate_limit_email_sent: RATE_LIMIT_EMAIL_SENT,
  }),
})
  .then((res) => {
    if (!res.ok) return res.text().then((t) => Promise.reject(new Error(`${res.status}: ${t}`)));
    return res.json();
  })
  .then(() => {
    console.log(`rate_limit_email_sent を ${RATE_LIMIT_EMAIL_SENT} に更新しました。`);
  })
  .catch((err) => {
    console.error("更新に失敗しました:", err.message);
    process.exit(1);
  });

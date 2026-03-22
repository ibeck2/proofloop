import { Resend } from "resend";
import { NextResponse } from "next/server";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** メール件名用：ヘッダーインジェクション防止 */
function sanitizeSubjectPart(text: string): string {
  return text.replace(/[\r\n\u0000]/g, " ").trim().slice(0, 80) || "相手";
}

function truncateSnippet(text: string, maxLen = 50): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}...`;
}

function buildChatEmailHtml(
  recipientName: string,
  senderName: string,
  messageSnippet: string,
  chatUrl: string
): string {
  const rec = escapeHtml(recipientName || "ユーザー");
  const snd = escapeHtml(senderName || "送信者");
  const snippet = escapeHtml(messageSnippet || "（内容なし）");
  const safeChatUrl = escapeHtml(chatUrl);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>新しいメッセージ</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:rgba(255,255,255,0.9);">ProofLoop</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;line-height:1.4;color:#ffffff;">新しいメッセージが届きました</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                <strong style="color:#0f172a;">${rec}</strong> 様
              </p>
              <p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#475569;">
                <strong style="color:#0f172a;">${snd}</strong> さんからメッセージが届いています。
              </p>
              <div style="margin:20px 0;padding:16px 18px;background:#f8fafc;border-radius:10px;border-left:4px solid #2563eb;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.06em;color:#64748b;text-transform:uppercase;">プレビュー</p>
                <p style="margin:0;font-size:14px;line-height:1.65;color:#1e293b;white-space:pre-wrap;">${snippet}</p>
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
                <tr>
                  <td style="border-radius:8px;background:#2563eb;">
                    <a href="${safeChatUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">チャットを開く</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                本メールは ProofLoop の通知です。心当たりがない場合は破棄してください。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY が設定されていません" },
        { status: 500 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "リクエストボディの解析に失敗しました" },
        { status: 500 }
      );
    }

    const b = body as Record<string, unknown>;
    const email = typeof b.email === "string" ? b.email.trim() : "";
    const recipientName =
      typeof b.recipientName === "string" ? b.recipientName.trim() : "";
    const senderNameRaw =
      typeof b.senderName === "string" ? b.senderName.trim() : "";
    const messageSnippetRaw =
      typeof b.messageSnippet === "string" ? b.messageSnippet : "";
    const chatUrl = typeof b.chatUrl === "string" ? b.chatUrl.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "送信先メールアドレス（email）が必要です" },
        { status: 500 }
      );
    }

    if (!chatUrl) {
      return NextResponse.json(
        { error: "チャットURL（chatUrl）が必要です" },
        { status: 500 }
      );
    }

    const senderName = sanitizeSubjectPart(senderNameRaw);
    const messageSnippet = truncateSnippet(messageSnippetRaw, 50);
    const subject = `【ProofLoop】${senderName}さんから新しいメッセージが届きました`;

    const resend = new Resend(apiKey);
    const html = buildChatEmailHtml(
      recipientName,
      senderNameRaw || "送信者",
      messageSnippet,
      chatUrl
    );

    const { data, error } = await resend.emails.send({
      from: "ProofLoop運営 <onboarding@resend.dev>",
      to: email,
      subject,
      html,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message ?? "メール送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: data?.id }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

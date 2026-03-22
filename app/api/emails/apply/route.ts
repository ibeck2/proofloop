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
  return text.replace(/[\r\n\u0000]/g, " ").trim().slice(0, 80) || "団体";
}

function buildApplyEmailHtml(
  clubName: string,
  applicantName: string,
  applicantUniversity: string,
  atsUrl: string
): string {
  const club = escapeHtml(clubName || "団体");
  const applicant = escapeHtml(applicantName || "応募者");
  const uni = escapeHtml(applicantUniversity || "（大学名未設定）");
  const safeAtsUrl = escapeHtml(atsUrl);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>新しいエントリー</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:rgba(255,255,255,0.9);">ProofLoop</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;line-height:1.4;color:#ffffff;">新しいエントリーが届きました</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#334155;">
                <strong style="color:#0f172a;">${club}</strong>の管理者様
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#475569;">
                <strong style="color:#0f172a;">${uni}</strong>の<strong style="color:#0f172a;">${applicant}</strong>さんから新規エントリーがありました。早速ATSダッシュボードを開いて、チャットで面接の日程調整などを進めましょう！
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto 0;">
                <tr>
                  <td style="border-radius:8px;background:#0d9488;">
                    <a href="${safeAtsUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">ダッシュボードを開く</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                本メールは ProofLoop より自動送信されています。心当たりがない場合は破棄してください。
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
    const clubNameRaw = typeof b.clubName === "string" ? b.clubName.trim() : "";
    const applicantName =
      typeof b.applicantName === "string" ? b.applicantName.trim() : "";
    const applicantUniversity =
      typeof b.applicantUniversity === "string"
        ? b.applicantUniversity.trim()
        : "";
    const atsUrl = typeof b.atsUrl === "string" ? b.atsUrl.trim() : "";

    if (!email) {
      return NextResponse.json(
        { error: "送信先メールアドレス（email）が必要です" },
        { status: 500 }
      );
    }

    if (!atsUrl) {
      return NextResponse.json(
        { error: "ATSのURL（atsUrl）が必要です" },
        { status: 500 }
      );
    }

    const clubNameForSubject = sanitizeSubjectPart(clubNameRaw);
    const subject = `【ProofLoop】${clubNameForSubject}に新しいエントリーが届きました！`;

    const resend = new Resend(apiKey);
    const html = buildApplyEmailHtml(
      clubNameRaw || "団体",
      applicantName,
      applicantUniversity,
      atsUrl
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

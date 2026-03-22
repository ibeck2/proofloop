import { Resend } from "resend";
import { NextResponse } from "next/server";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function buildApprovalEmailHtml(
  applicantName: string,
  organizationName: string,
  mypageUrl: string
): string {
  const name = escapeHtml(applicantName || "申請者");
  const org = escapeHtml(organizationName || "団体");
  const safeMypageUrl = escapeHtml(mypageUrl);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>管理者権限の承認</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:rgba(255,255,255,0.9);">ProofLoop</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;line-height:1.4;color:#ffffff;">団体管理者権限の申請が承認されました</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                <strong style="color:#0f172a;">${name}</strong> 様
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
                <strong style="color:#0f172a;">${org}</strong> の管理者権限が付与されました。マイページよりダッシュボードをご確認ください。
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
                今後とも ProofLoop をよろしくお願いいたします。
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background:#0d9488;">
                    <a href="${safeMypageUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">マイページを開く</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                本メールは ProofLoop 運営より自動送信されています。心当たりがない場合は破棄してください。
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

/** 承認本体は成功済み想定。クライアントは HTTP 200 で emailSent / skipped を見る */
export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.warn(
        "[api/emails/approve] RESEND_API_KEY が未設定のためメール送信をスキップしました（開発環境のモック動作）"
      );
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          skipped: true,
          reason: "resend_api_key_missing",
          message: "開発環境ではメール送信をスキップしました",
        },
        { status: 200 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("Email API Error: JSON parse failed", parseErr);
      return NextResponse.json(
        { ok: false, error: "リクエストボディの解析に失敗しました" },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    const email = typeof b.email === "string" ? b.email.trim() : "";
    const applicantName =
      typeof b.applicantName === "string" ? b.applicantName.trim() : "";
    const organizationName =
      typeof b.organizationName === "string" ? b.organizationName.trim() : "";

    if (!email) {
      console.error("Email API Error: missing email in body", { bodyKeys: Object.keys(b) });
      return NextResponse.json(
        { ok: false, error: "送信先メールアドレス（email）が必要です" },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);
    const mypageUrl = `${getAppOrigin()}/mypage`;
    const html = buildApprovalEmailHtml(applicantName, organizationName, mypageUrl);

    const { data, error } = await resend.emails.send({
      from: "ProofLoop運営 <onboarding@resend.dev>",
      to: email,
      subject: "【ProofLoop】団体管理者権限の申請が承認されました",
      html,
    });

    if (error) {
      console.error("Email API Error: Resend send failed", {
        message: error.message,
        name: error.name,
        error,
      });
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          skipped: false,
          reason: "resend_api_error",
          message: error.message ?? "メール送信に失敗しました",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { ok: true, emailSent: true, skipped: false, id: data?.id },
      { status: 200 }
    );
  } catch (err) {
    console.error("Email API Error:", err);
    const message =
      err instanceof Error ? err.message : "不明なエラーが発生しました";
    return NextResponse.json(
      {
        ok: true,
        emailSent: false,
        skipped: false,
        reason: "unexpected_error",
        message,
      },
      { status: 200 }
    );
  }
}

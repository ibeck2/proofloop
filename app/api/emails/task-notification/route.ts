import { Resend } from "resend";
import { NextResponse } from "next/server";
import {
  createSupabaseWithBearer,
  getBearerToken,
} from "@/lib/supabaseRoute";
import { RESEND_FROM } from "@/lib/email/resendFrom";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** メール件名用：ヘッダーインジェクション防止 */
function sanitizeSubjectPart(text: string): string {
  return text.replace(/[\r\n ]/g, " ").trim().slice(0, 80) || "タスク";
}

function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

function emailShell(headline: string, bodyHtml: string): string {
  const settingsUrl = `${getAppOrigin()}/mypage/notifications`;
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 100%);padding:28px 32px;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.08em;color:rgba(255,255,255,0.9);">ProofLoop</p>
              <h1 style="margin:8px 0 0;font-size:20px;font-weight:700;line-height:1.4;color:#ffffff;">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                本メールは ProofLoop 運営より自動送信されています。この通知は<a href="${escapeHtml(settingsUrl)}" style="color:#0d9488;text-decoration:underline;">「マイページ」の通知設定</a>からオフにできます。
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

function ctaButton(href: string, label: string): string {
  return `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background:#0d9488;">
                    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
                  </td>
                </tr>
              </table>`;
}

function buildReviewAssignedHtml(
  recipientName: string,
  actorName: string,
  taskTitle: string,
  organizationName: string,
  tasksUrl: string
): string {
  const name = escapeHtml(recipientName || "メンバー");
  const actor = escapeHtml(actorName || "メンバー");
  const title = escapeHtml(taskTitle || "タスク");
  const org = escapeHtml(organizationName || "団体");
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
      <strong style="color:#0f172a;">${name}</strong> 様
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
      <strong style="color:#0f172a;">${actor}</strong>さんが、<strong style="color:#0f172a;">${org}</strong>のタスク「<strong style="color:#0f172a;">${title}</strong>」をレビュー待ちにしました。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      内容を確認し、対応をお願いします。
    </p>
    ${ctaButton(tasksUrl, "タスク一覧を開く")}`;
  return emailShell("タスクのレビューを依頼されました", body);
}

function buildAssigneeChangedHtml(
  recipientName: string,
  actorName: string,
  taskTitle: string,
  organizationName: string,
  tasksUrl: string
): string {
  const name = escapeHtml(recipientName || "メンバー");
  const actor = escapeHtml(actorName || "メンバー");
  const title = escapeHtml(taskTitle || "タスク");
  const org = escapeHtml(organizationName || "団体");
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
      <strong style="color:#0f172a;">${name}</strong> 様
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
      <strong style="color:#0f172a;">${actor}</strong>さんが、<strong style="color:#0f172a;">${org}</strong>のタスク「<strong style="color:#0f172a;">${title}</strong>」の担当者にあなたを設定しました。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      内容を確認し、対応をお願いします。
    </p>
    ${ctaButton(tasksUrl, "タスク一覧を開く")}`;
  return emailShell("タスクの担当者に指定されました", body);
}

function buildCommentAddedHtml(
  recipientName: string,
  actorName: string,
  taskTitle: string,
  organizationName: string,
  tasksUrl: string
): string {
  const name = escapeHtml(recipientName || "メンバー");
  const actor = escapeHtml(actorName || "メンバー");
  const title = escapeHtml(taskTitle || "タスク");
  const org = escapeHtml(organizationName || "団体");
  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
      <strong style="color:#0f172a;">${name}</strong> 様
    </p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#475569;">
      <strong style="color:#0f172a;">${actor}</strong>さんが、<strong style="color:#0f172a;">${org}</strong>のタスク「<strong style="color:#0f172a;">${title}</strong>」にコメントを投稿しました。
    </p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
      内容を確認してください。
    </p>
    ${ctaButton(tasksUrl, "タスク一覧を開く")}`;
  return emailShell("タスクにコメントが投稿されました", body);
}

type TaskNotificationBody = {
  type?: "task_review_assigned" | "task_assignee_changed" | "task_comment_added";
  email?: string;
  recipientName?: string;
  actorName?: string;
  taskTitle?: string;
  organizationName?: string;
};

export async function POST(request: Request) {
  try {
    const bearer = getBearerToken(request);
    if (!bearer) {
      return NextResponse.json(
        { ok: false, error: "認証が必要です（Authorization: Bearer）" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseWithBearer(bearer);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "セッションが無効です" },
        { status: 401 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      console.warn(
        "[api/emails/task-notification] RESEND_API_KEY が未設定のためメール送信をスキップしました（開発環境のモック動作）"
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

    const b = body as TaskNotificationBody;
    const type = b.type;
    const email = typeof b.email === "string" ? b.email.trim() : "";
    const recipientName =
      typeof b.recipientName === "string" ? b.recipientName.trim() : "";
    const actorName = typeof b.actorName === "string" ? b.actorName.trim() : "";
    const taskTitle = typeof b.taskTitle === "string" ? b.taskTitle.trim() : "";
    const organizationName =
      typeof b.organizationName === "string" ? b.organizationName.trim() : "";

    if (
      type !== "task_review_assigned" &&
      type !== "task_assignee_changed" &&
      type !== "task_comment_added"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "type（task_review_assigned/task_assignee_changed/task_comment_added）が不正です",
        },
        { status: 400 }
      );
    }
    if (!email) {
      console.error("Email API Error: missing email in body", { type });
      return NextResponse.json(
        { ok: false, error: "送信先メールアドレス（email）が必要です" },
        { status: 400 }
      );
    }

    const tasksUrl = `${getAppOrigin()}/clubtasks`;
    let subject: string;
    let html: string;

    if (type === "task_review_assigned") {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」のレビューを依頼されました`;
      html = buildReviewAssignedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    } else if (type === "task_assignee_changed") {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」の担当者に指定されました`;
      html = buildAssigneeChangedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    } else {
      subject = `【ProofLoop】「${sanitizeSubjectPart(taskTitle)}」にコメントが投稿されました`;
      html = buildCommentAddedHtml(recipientName, actorName, taskTitle, organizationName, tasksUrl);
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error("Email API Error: Resend send failed", {
        type,
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

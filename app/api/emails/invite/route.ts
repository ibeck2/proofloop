import { Resend } from "resend";
import { NextResponse } from "next/server";
import {
  createSupabaseWithBearer,
  getBearerToken,
} from "@/lib/supabaseRoute";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeSubjectPart(text: string): string {
  return text.replace(/[\r\n\u0000]/g, " ").trim().slice(0, 80) || "団体";
}

function buildInviteEmailHtml(
  inviterName: string,
  organizationName: string,
  inviteUrl: string
): string {
  const inviter = escapeHtml(inviterName || "団体管理者");
  const org = escapeHtml(organizationName || "団体");
  const safeUrl = escapeHtml(inviteUrl);

  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#334155;">
                <strong style="color:#0f172a;">${inviter}</strong>さんからの招待です。以下のリンクをクリックして、チームに参加してください。
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#64748b;">
                （※アカウントをお持ちでない方は、リンク先の案内に従って新規登録をお願いします）
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:8px;background:#0f766e;">
                    <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">参加する</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;">
                団体: ${org} / ProofLoop
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

    const bearer = getBearerToken(request);
    if (!bearer) {
      return NextResponse.json(
        { error: "認証が必要です（Authorization: Bearer）" },
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
        { error: "セッションが無効です" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "リクエストボディの解析に失敗しました" },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    const organizationId =
      typeof b.organization_id === "string" ? b.organization_id.trim() : "";
    let email = typeof b.email === "string" ? b.email.trim() : "";
    const roleRaw = typeof b.role === "string" ? b.role.trim().toLowerCase() : "";
    const inviterNameFallback =
      typeof b.inviterName === "string" ? b.inviterName.trim() : "";
    const organizationNameBody =
      typeof b.organizationName === "string" ? b.organizationName.trim() : "";
    const canEditProfile = b.can_edit_profile === true;
    const canManagePosts = b.can_manage_posts === true;
    const canManageMembers = b.can_manage_members === true;
    const canManageApplications = b.can_manage_applications === true;

    if (!organizationId || !email) {
      return NextResponse.json(
        { error: "organization_id と email は必須です" },
        { status: 400 }
      );
    }

    email = email.toLowerCase();

    // 招待は登録済みユーザーのみ（public.users にメールがあること）に制限
    const { data: registeredUsers, error: regErr } = await supabase
      .from("users")
      .select("id, email")
      .ilike("email", email)
      .limit(1);
    if (regErr) {
      return NextResponse.json(
        { error: "招待対象ユーザーの確認に失敗しました" },
        { status: 500 }
      );
    }
    if (!registeredUsers || registeredUsers.length === 0) {
      return NextResponse.json(
        { error: "このメールアドレスはProofLoopに登録されていません" },
        { status: 400 }
      );
    }

    if (roleRaw !== "owner" && roleRaw !== "admin") {
      return NextResponse.json(
        { error: "role は owner または admin である必要があります" },
        { status: 400 }
      );
    }

    const { data: membership, error: memErr } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr || !membership) {
      return NextResponse.json(
        { error: "この団体を管理する権限がありません" },
        { status: 403 }
      );
    }

    const myRole = (membership as { role: string }).role;
    if (myRole !== "owner" && myRole !== "admin") {
      return NextResponse.json(
        { error: "この団体を管理する権限がありません" },
        { status: 403 }
      );
    }

    if (roleRaw === "owner" && myRole !== "owner") {
      return NextResponse.json(
        { error: "代表者（Owner）の招待は代表者のみが行えます" },
        { status: 403 }
      );
    }

    const { data: orgRow, error: orgErr } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgErr || !orgRow) {
      return NextResponse.json(
        { error: "団体が見つかりません" },
        { status: 404 }
      );
    }

    const organizationName =
      (orgRow as { name: string | null }).name?.trim() ||
      organizationNameBody ||
      "団体";

    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const inviterName =
      (inviterProfile as { full_name?: string | null; display_name?: string | null } | null)
        ?.full_name?.trim() ||
      (inviterProfile as { full_name?: string | null; display_name?: string | null } | null)
        ?.display_name?.trim() ||
      inviterNameFallback ||
      user.email?.split("@")[0] ||
      "団体管理者";

    const invitePayload = {
      organization_id: organizationId,
      email,
      role: roleRaw,
      invited_by: user.id,
      can_edit_profile: canEditProfile,
      can_manage_posts: canManagePosts,
      can_manage_members: canManageMembers,
      can_manage_applications: canManageApplications,
    };
    let inserted: { token: string } | null = null;
    let insErr: { code?: string; message?: string } | null = null;
    {
      const fullInsert = await supabase
        .from("organization_invitations")
        .insert(invitePayload)
        .select("token")
        .single();
      inserted = fullInsert.data as { token: string } | null;
      insErr = fullInsert.error;

      if (fullInsert.error) {
        const msg = (fullInsert.error.message || "").toLowerCase();
        const likelyMissingColumn =
          msg.includes("column") ||
          msg.includes("does not exist") ||
          msg.includes("schema cache") ||
          fullInsert.error.code === "PGRST204";
        if (likelyMissingColumn) {
          const fallbackInsert = await supabase
            .from("organization_invitations")
            .insert({
              organization_id: organizationId,
              email,
              role: roleRaw,
              invited_by: user.id,
            })
            .select("token")
            .single();
          inserted = fallbackInsert.data as { token: string } | null;
          insErr = fallbackInsert.error;
        }
      }
    }

    if (insErr) {
      if (insErr.code === "23505") {
        return NextResponse.json(
          { error: "このメールアドレスへの招待は既に存在します" },
          { status: 409 }
        );
      }
      console.error("organization_invitations insert:", insErr);
      return NextResponse.json(
        { error: insErr.message || "招待の作成に失敗しました" },
        { status: 500 }
      );
    }

    const token = (inserted as { token: string }).token;
    if (!token) {
      return NextResponse.json(
        { error: "招待トークンの取得に失敗しました" },
        { status: 500 }
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      new URL(request.url).origin;
    const inviteUrl = `${origin}/invite/${encodeURIComponent(token)}`;

    const subject = `【ProofLoop】${sanitizeSubjectPart(organizationName)}の管理者として招待されました`;
    const html = buildInviteEmailHtml(inviterName, organizationName, inviteUrl);

    const resend = new Resend(apiKey);
    const { data: sent, error: sendErr } = await resend.emails.send({
      from: "ProofLoop運営 <onboarding@resend.dev>",
      to: email,
      subject,
      html,
    });

    if (sendErr) {
      return NextResponse.json(
        { error: sendErr.message ?? "メール送信に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: sent?.id }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "不明なエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

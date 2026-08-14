import { NextResponse } from "next/server";
import { createSupabaseWithBearer, getBearerToken } from "@/lib/supabaseRoute";
import { revalidateOrganizationPage } from "@/lib/organizations/revalidatePage";
import { organizationPagePath } from "@/lib/organizations/paths";
import { shouldRevalidateAfterDispute } from "@/lib/organizations/revalidationTriggers";

/**
 * 掲載についての申立て（submit_dispute）。
 *
 * クライアントから直接 RPC を呼ぶのをやめてここを通すのは、**再検証を
 * 状態変更と不可分にする**ため。単独の `/api/revalidate` を置くと誰でも
 * 叩けてしまい、連打されると ISR が意味を失う。ここでは
 * 「submit_dispute が実際に凍結した」ときにだけ再検証する。
 *
 * ⚠️ 認証は必須にしない。submit_dispute は anon にも EXECUTE を許している
 * （未ログインの訪問者でも乗っ取りを申告できるようにするため。032 参照）。
 * Bearer があれば転送し、reporter_user_id が記録されるようにする。
 *
 * 無防備でない根拠：再検証が起きる条件が「実際に凍結した」に限られ、
 * 自動凍結そのものが 032 のレート制限（直近1時間に5件）で上限を持つ。
 * つまり再検証の発火回数はDB側で既に頭打ちになっている。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // UUID でなければ RPC を呼ぶ前に切る。呼んでしまうと Postgres の
  // `invalid input syntax for type uuid: "..."` がそのまま外へ出る。
  if (!organizationPagePath(id)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  let body: { name?: string; contact?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const supabase = createSupabaseWithBearer(getBearerToken(request));
  const { data, error } = await supabase.rpc("submit_dispute", {
    p_org: id,
    p_name: (body.name ?? "").trim(),
    p_contact: (body.contact ?? "").trim(),
    p_body: (body.body ?? "").trim(),
  });

  if (error) {
    // 生の Postgres メッセージには関数名・列名・制約名・入力値が入りうる。
    // ここは未認証でも叩けるので、外へは安定したコードだけを返してログに残す。
    console.error("submit_dispute failed:", error.message);
    return NextResponse.json({ ok: false, error: "rpc_error" }, { status: 502 });
  }

  const result = data as {
    ok: boolean;
    error?: string;
    frozen?: boolean;
    escalated?: boolean;
    owner_email?: string | null;
    owner_name?: string | null;
    organization_name?: string | null;
  };

  if (shouldRevalidateAfterDispute(result)) {
    revalidateOrganizationPage(id);
  }

  // 045：凍結が実際に発生したときだけ、現オーナーへ通知メールを中継する。
  // owner_email は submit_dispute（SECURITY DEFINER）が特権で解決した機微情報。
  // ベストエフォート（await しない）で、失敗しても申立て受付自体は成功のまま返す。
  if (result.frozen && result.owner_email) {
    const emailUrl = new URL("/api/emails/claim", request.url).toString();
    fetch(emailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "frozen",
        email: result.owner_email,
        organizationName: result.organization_name ?? "",
        ownerName: result.owner_name ?? "",
      }),
    }).catch(() => {});
  }

  // owner_email / owner_name は運営が特権で解決したオーナーの個人情報であり、
  // この申立ては未ログインの訪問者でも送れる。ブラウザへ返す前に必ず取り除く
  // （通報者がオーナーの連絡先を読み取れてしまうと悪用の温床になる）。
  const { owner_email: _ownerEmail, owner_name: _ownerName, ...publicResult } = result;
  void _ownerEmail;
  void _ownerName;

  return NextResponse.json(publicResult);
}

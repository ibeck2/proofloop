import { NextResponse } from "next/server";
import { createSupabaseWithBearer, getBearerToken } from "@/lib/supabaseRoute";
import { revalidateOrganizationPage } from "@/lib/organizations/revalidatePage";
import { organizationPagePath } from "@/lib/organizations/paths";
import { shouldRevalidateAfterClaimDecision } from "@/lib/organizations/revalidationTriggers";

/**
 * 引き取り申請の承認・却下（decide_claim）。
 *
 * 単独の再検証エンドポイントを置かず、状態を変える呼び出しと同じ場所で
 * 再検証する。認可は decide_claim 自身の `is_system_admin()` が持つ
 * （このルートは `/admin` 配下ではないので middleware の Basic 認証は掛からない。
 * 権限判定を RPC に委ねているのはそのため）。
 *
 * ⚠️ `organizationId` はクライアントが送る。RPC は claimId しか受け取らず、
 * `organization_claims` には authenticated 向けの SELECT ポリシーが1本も無いので
 * （本番実測）、サーバ側でこのトークンから引き直すことができない。
 * そこで **RPC を呼ぶ前に必須の入力として検証する**。こうすれば
 * 「状態は変わったのに再検証だけ静かに行われなかった」が起きない。
 * 恒久策は decide_claim の戻り値に organization_id を含めること（`docs/task-board.md`）。
 */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  let body: {
    claimId?: string;
    organizationId?: string;
    decision?: "approve" | "reject";
    level?: "full" | "limited" | null;
    note?: string | null;
    verdict?: "green" | "red";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!organizationPagePath(body.organizationId)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const supabase = createSupabaseWithBearer(token);
  const { data, error } = await supabase.rpc("decide_claim", {
    p_claim_id: body.claimId,
    p_decision: body.decision,
    p_level: body.level ?? null,
    p_note: body.note ?? null,
    p_verdict: body.verdict,
  });

  if (error) {
    console.error("decide_claim failed:", error.message);
    return NextResponse.json({ ok: false, error: "rpc_error" }, { status: 502 });
  }

  const result = data as { ok: boolean; error?: string; decision?: string };
  if (shouldRevalidateAfterClaimDecision(result)) {
    revalidateOrganizationPage(body.organizationId);
  }

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { createSupabaseWithBearer, getBearerToken } from "@/lib/supabaseRoute";
import { revalidateOrganizationPage } from "@/lib/organizations/revalidatePage";
import { organizationPagePath } from "@/lib/organizations/paths";
import { shouldRevalidateAfterClaimRevocation } from "@/lib/organizations/revalidationTriggers";

/**
 * 運営単独での「発行の取消」（revoke_claim、038で掲載内容の復元を統合済み）。
 *
 * 認可は revoke_claim 自身の `is_system_admin()` が持つ（このルートは `/admin` 配下
 * ではないので middleware の Basic 認証は掛からない。既存の decide・resolve と同じ設計）。
 * 成功すれば常に claim_status が変わるので、常に対象ページを再検証する。
 *
 * ⚠️ `organizationId` の扱いは app/api/claims/decide/route.ts と同じ理由・同じ形。
 * `organization_claims` にはSELECTポリシーが無く、サーバ側でトークンから引き直せない。
 */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  let body: {
    claimId?: string;
    organizationId?: string;
    reason?: string;
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
  const { data, error } = await supabase.rpc("revoke_claim", {
    p_claim_id: body.claimId,
    p_reason: body.reason ?? null,
  });

  if (error) {
    console.error("revoke_claim failed:", error.message);
    return NextResponse.json({ ok: false, error: "rpc_error" }, { status: 502 });
  }

  const result = data as { ok: boolean; error?: string };
  if (shouldRevalidateAfterClaimRevocation(result)) {
    revalidateOrganizationPage(body.organizationId);
  }

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { createSupabaseWithBearer, getBearerToken } from "@/lib/supabaseRoute";
import { revalidateOrganizationPage } from "@/lib/organizations/revalidatePage";
import { organizationPagePath } from "@/lib/organizations/paths";
import { shouldRevalidateAfterDisputeResolution } from "@/lib/organizations/revalidationTriggers";

/**
 * 申立ての認容・却下（resolve_dispute）。
 *
 * 認可は resolve_dispute 自身の `is_system_admin()` が持つ。
 * 認容（unclaimed へ）も却下（claimed または unclaimed へ）も claim_status を
 * 必ず変えるので、成功したら常に対象ページを再検証する。
 *
 * ⚠️ `organizationId` の扱いは app/api/claims/decide/route.ts と同じ理由・同じ形。
 */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 401 });
  }

  let body: {
    disputeId?: string;
    organizationId?: string;
    resolution?: "uphold" | "dismiss";
    note?: string | null;
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
  const { data, error } = await supabase.rpc("resolve_dispute", {
    p_dispute_id: body.disputeId,
    p_resolution: body.resolution,
    p_note: body.note ?? null,
  });

  if (error) {
    console.error("resolve_dispute failed:", error.message);
    return NextResponse.json({ ok: false, error: "rpc_error" }, { status: 502 });
  }

  const result = data as { ok: boolean; error?: string };
  if (shouldRevalidateAfterDisputeResolution(result)) {
    revalidateOrganizationPage(body.organizationId);
  }

  return NextResponse.json(result);
}

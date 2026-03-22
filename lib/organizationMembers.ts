import type { SupabaseClient } from "@supabase/supabase-js";

/** Supabase の外部キー結合がオブジェクトまたは配列で返る場合の正規化 */
export function normalizeJoinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return value as T;
}

export type OrganizationSummary = {
  id: string;
  name: string | null;
  university?: string | null;
  category?: string | null;
  logo_url?: string | null;
  /** 運営承認済みの団体のみダッシュボードへ（カラム未作成環境では undefined） */
  is_approved?: boolean | null;
};

export type OrganizationMembership = {
  membershipId: string;
  organizationId: string;
  role: string;
  organization: OrganizationSummary | null;
};

type OrgRowDb = {
  id: string;
  name: string | null;
  university?: string | null;
  category?: string | null;
  logo_url?: string | null;
  is_approved?: boolean | null;
};

function isMissingColumnError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "PGRST204" ||
    err.code === "42703" ||
    msg.includes("column") && msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

/**
 * organizations を id 一覧で取得。存在しないカラムを指定した場合は段階的にフォールバック。
 */
async function fetchOrganizationsByIds(
  supabase: SupabaseClient,
  orgIds: string[]
): Promise<{ data: OrgRowDb[]; error: Error | null }> {
  if (orgIds.length === 0) return { data: [], error: null };

  const attempts = [
    "id, name, university, category, logo_url, is_approved",
    "id, name, university, category, is_approved",
    "id, name, university, category, logo_url",
    "id, name, university, category",
  ] as const;

  let lastError: Error | null = null;
  for (const sel of attempts) {
    const { data, error } = await supabase.from("organizations").select(sel).in("id", orgIds);
    if (!error) {
      return { data: (data as OrgRowDb[]) ?? [], error: null };
    }
    lastError = new Error(error.message);
    if (!isMissingColumnError(error)) {
      return { data: [], error: lastError };
    }
  }
  return { data: [], error: lastError };
}

/**
 * ログインユーザーが所属する団体（organization_members 起点）
 *
 * 埋め込み select（organizations(...)）は、DB に無い列（例: logo_url）があると
 * PostgREST が全体を失敗させるため、メンバー行と団体行を分けて取得してマージする。
 * is_approved が false の団体はダッシュボード導線から除外（列が無い環境では全件対象）。
 */
export async function fetchMyOrganizationMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: OrganizationMembership[]; error: Error | null }> {
  const { data: members, error: mErr } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role")
    .eq("user_id", userId);

  if (mErr) {
    return { data: [], error: new Error(mErr.message) };
  }
  if (!members?.length) {
    return { data: [], error: null };
  }

  const orgIds = [...new Set(members.map((m) => m.organization_id).filter(Boolean))];
  const { data: orgs, error: oErr } = await fetchOrganizationsByIds(supabase, orgIds);
  if (oErr) {
    return { data: [], error: oErr };
  }

  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  const list: OrganizationMembership[] = [];
  for (const row of members) {
    const raw = orgMap.get(row.organization_id);
    if (!raw) continue;
    // 明示的に false のときだけ除外（null / undefined は従来どおり許可）
    if (raw.is_approved === false) continue;

    const organization: OrganizationSummary = {
      id: raw.id,
      name: raw.name,
      university: raw.university ?? null,
      category: raw.category ?? null,
      logo_url: raw.logo_url ?? null,
      is_approved: raw.is_approved,
    };
    list.push({
      membershipId: row.id,
      organizationId: row.organization_id,
      role: row.role,
      organization,
    });
  }

  return { data: list, error: null };
}

/**
 * 団体のオーナー（通知先など）— role = owner のメンバーの user_id
 */
export async function fetchOrganizationOwnerUserId(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { user_id: string }).user_id;
}

/** 内部リンク用: orgId をクエリに付与 */
export function withOrgIdQuery(href: string, orgId: string | null): string {
  if (!orgId) return href;
  const hashIndex = href.indexOf("#");
  const pathPart = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const qIndex = pathPart.indexOf("?");
  const path = qIndex >= 0 ? pathPart.slice(0, qIndex) : pathPart;
  const existing = qIndex >= 0 ? pathPart.slice(qIndex + 1) : "";
  const params = new URLSearchParams(existing);
  params.set("orgId", orgId);
  return `${path}?${params.toString()}${hash}`;
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Route Handler 用: Authorization: Bearer <access_token> で認証済みクライアントを作る
 */
export function createSupabaseWithBearer(
  accessToken: string | null | undefined
): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey, {
    global: {
      headers:
        accessToken && accessToken.length > 0
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
    },
  });
}

export function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  const t = h.slice(7).trim();
  return t.length > 0 ? t : null;
}

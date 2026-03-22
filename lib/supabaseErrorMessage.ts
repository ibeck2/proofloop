/**
 * Supabase / PostgREST のエラーオブジェクトをトースト等に載せやすい1行にまとめる
 */
export function formatSupabaseError(err: unknown): string {
  if (err == null) return "不明なエラー";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || "不明なエラー";
  if (typeof err === "object") {
    const o = err as Record<string, unknown>;
    const parts = [o.message, o.details, o.hint, o.code].filter(
      (x) => x != null && String(x).trim() !== ""
    );
    if (parts.length > 0) return parts.map(String).join(" · ");
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Supabase の埋め込み select（例: `events` から `organizations(name)`）の型を、
 * 実際のレスポンス形に合わせるためのキャスト。
 *
 * なぜ必要か：
 * PostgREST は多対一の埋め込みを「単一オブジェクト」で返す。events.organization_id が
 * organizations.id を指しているので、events を引いたときの organizations は配列ではなく
 * オブジェクトになる。ところが supabase-js の型推論はこれを配列と推論する。
 * このプロジェクトは生成済みのDB型（Database 型）を持たせていないため、
 * クライアントが外部キーの関係を知らず、埋め込みを一律で配列とみなすからである。
 *
 * つまり食い違っているのは型推論のほうで、各ファイルが手書きしている行型が正しい。
 * 実データでも確認済み（本番PostgRESTに直接問い合わせ、organizations がオブジェクトで
 * 返ることを確認）。
 *
 * 恒久対応は `supabase gen types` で生成した Database 型をクライアントに渡すこと。
 * それを入れるまでの橋渡しとして、キャストの理由をここに集約しておく。
 */

/** 埋め込みを含む select の結果を、手書きの行型の配列として扱う。 */
export function asRows<T>(data: unknown): T[] {
  return (data ?? []) as T[];
}

/** `.single()` など単一行を返す select の結果を、手書きの行型として扱う。 */
export function asRow<T>(data: unknown): T {
  return data as T;
}

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site-url";
import { buildOrgDescription, buildOrgTitle } from "@/lib/organizations/pageMetadata";
import { organizationCacheTag } from "@/lib/organizations/paths";
import OrganizationDetailClient, { type OrgDetailData } from "./OrganizationDetailClient";
import ListingNotice from "@/components/legal/ListingNotice";
import type { OrganizationClaimStatus } from "@/lib/claims/types";

export type EventRow = {
  id: string;
  organization_id: string;
  title: string | null;
  event_date: string;
  location: string | null;
  description: string | null;
};

export type OrganizationPhotoRow = {
  id: string;
  organization_id: string;
  photo_url: string;
  created_at?: string;
};

export type ReviewRow = {
  id: string;
  organization_id: string;
  rating: number;
  content: string | null;
  status: string;
  created_at: string;
  club_reply?: string | null;
  club_replied_at?: string | null;
};

/**
 * 掲載団体は2,400件超あり、通知メールでの流入はまさにこの経路に集中する。
 * React の `cache()` は1リクエスト内のメモ化でしかないため、これが無いと
 * 1アクセスごとに毎回DBへ当たる（Supabase は MICRO）。
 *
 * ⚠️ 300秒は「普段の更新の反映が遅れてよい上限」であって、凍結の反映時間では
 * ない。claim_status（凍結・引き取り）が変わったときは
 * `lib/organizations/revalidatePage.ts` 経由でその団体の分だけ即座に捨てる。
 * 呼び出し元は app/api/organizations/[id]/dispute ・ app/api/claims/decide ・
 * app/api/disputes/resolve の3本。
 */
const PAGE_REVALIDATE_SECONDS = 300;

// ⚠️ 下の `revalidate` と必ず同じ値にする。`export const revalidate` は Next の制約で
// リテラルしか書けず定数を参照できないため、二重管理になっている。
// フルルートキャッシュ（この行）とデータキャッシュ（PAGE_REVALIDATE_SECONDS）は
// 独立に期限を持つので、タグで無効化しない変更（掲載内容の編集・写真・イベント・
// 口コミ承認）は最悪その合計＝約10分ぶん古く見えることがある。
export const revalidate = 300;

/**
 * 空配列を返すのは意図的：ビルド時には1件も事前生成せず（2,400件超を
 * ビルドで焼くのは現実的でない）、`dynamicParams` の既定（true）により
 * 初回アクセスで生成する。
 *
 * ⚠️ ISR を成立させるには「これ」と「下の `unstable_cache`」の**両方**が要る。
 * Next 15.5.12 / `next start` で実測した経過：
 *   `revalidate` だけ                     → `ƒ Dynamic`・`Cache-Control: no-store`
 *   ＋ `generateStaticParams`             → `● SSG` になるが応答はまだ no-store
 *   ＋ `unstable_cache`                   → `x-nextjs-cache: MISS → HIT`（成立）
 * supabase-js は fetch に AbortSignal を渡すため Next の fetch キャッシュに
 * 乗らず、未キャッシュのデータ取得を含むルートは静的化から外れていた。
 */
export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

const ORG_COLUMNS =
  "id, name, university, category, description, logo_url, member_count, activity_frequency, is_intercollege, target_grades, selection_process, selection_flow, gender_ratio, grade_composition, location_detail, fee_entry, fee_annual, x_id, instagram_id, line_url, website_url, claim_status";

/**
 * PostgREST が `.single()` で0件のときに返すコード。
 * 「団体が存在しない」＝ 404 にしてよい唯一のエラーで、他と必ず区別する。
 */
const NO_ROWS_CODE = "PGRST116";

/** ORG_COLUMNS で取る1行。claim_status は 028 の check 制約に対応する。 */
type OrganizationRow = OrgDetailData & {
  claim_status: OrganizationClaimStatus | null;
};

type OrganizationPageData = {
  org: OrganizationRow | null;
  events: EventRow[];
  photos: OrganizationPhotoRow[];
  reviews: ReviewRow[];
};

/**
 * 団体ページに必要な4つの問い合わせをまとめてデータキャッシュに載せる。
 *
 * fetch 層の挙動に依存せず、結果そのものをキャッシュに載せる。supabase-js は
 * fetch に AbortSignal を渡すので Next の fetch キャッシュには乗らず、
 * `revalidate` と `generateStaticParams` を足しただけでは応答が
 * `Cache-Control: no-store` のままだった（上の注記の実測経過を参照）。
 *
 * タグ付きなので、claim の状態が変わったときは `revalidateOrganizationPage` で
 * その団体の分だけを即座に捨てられる。
 *
 * 🚨 取得に失敗したときは**必ず投げる**。「行が無い」と「取りに行けなかった」を
 * 同一視して null / 空配列に畳むと、Supabase の一過性の不調（接続断・
 * ステートメントタイムアウト・PostgREST の 5xx。MICRO で 2026-08-10 に
 * ディスクI/O枯渇の実績がある）が**成功した結果として300秒キャッシュされ**、
 * 実在する団体ページが5分間 404 を返し続ける。キャッシュを入れたことで
 * 一過性の障害が持続的な障害に変質する、という退行になる。
 * 当たる先が「団体ページ2,400件のインデックス」＝ CLAUDE.md §6 の最優先課題なので、
 * ここは黙って劣化させず 500 で落とす。`unstable_cache` は reject した Promise を
 * 保存しないため、投げれば何もキャッシュされず次のリクエストで再試行される。
 */
const loadFromDatabase = async (id: string): Promise<OrganizationPageData> => {
  const [orgResult, eventsResult, photosResult, reviewsResult] = await Promise.all([
    supabase.from("organizations").select(ORG_COLUMNS).eq("id", id).single(),
    supabase
      .from("events")
      .select("id, organization_id, title, event_date, location, description")
      .eq("organization_id", id)
      .gte("event_date", new Date().toISOString().slice(0, 19))
      .order("event_date", { ascending: true })
      .limit(20),
    supabase
      .from("organization_photos")
      .select("id, organization_id, photo_url, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, organization_id, rating, content, status, created_at, club_reply, club_replied_at")
      .eq("organization_id", id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  // .single() は「0件」を PGRST116 で返す。これだけが「団体が存在しない」＝
  // キャッシュしてよい正当な結果で、それ以外のエラーはすべて取得の失敗。
  if (orgResult.error && orgResult.error.code !== NO_ROWS_CODE) {
    throw new Error(`organizations fetch failed: ${orgResult.error.code}`);
  }
  // 付随データも同様。失敗を空配列に畳むと「写真もイベントも口コミも無い団体」を
  // 300秒キャッシュしてしまい、劣化が固定される。
  for (const [name, result] of [
    ["events", eventsResult],
    ["organization_photos", photosResult],
    ["reviews", reviewsResult],
  ] as const) {
    if (result.error) throw new Error(`${name} fetch failed: ${result.error.code}`);
  }

  return {
    // unstable_cache は戻り値を直列化するので、Supabase のエラーオブジェクトは持ち回らない。
    org: (orgResult.data as unknown as OrganizationRow | null) ?? null,
    events: (eventsResult.data as EventRow[] | null) ?? [],
    photos: (photosResult.data as OrganizationPhotoRow[] | null) ?? [],
    reviews: (reviewsResult.data as ReviewRow[] | null) ?? [],
  };
};

/**
 * generateMetadata と本体レンダリングの両方から使うため、リクエスト単位でもメモ化する。
 * React の `cache()` は1リクエスト内のメモ化、`unstable_cache` はリクエストを
 * またぐキャッシュ。役割が違うので両方要る。
 */
const getOrganizationPageData = cache((id: string) =>
  unstable_cache(() => loadFromDatabase(id), ["organization-detail", id], {
    revalidate: PAGE_REVALIDATE_SECONDS,
    tags: [organizationCacheTag(id)],
  })()
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { org } = await getOrganizationPageData(id);

  // 取得できないときは既定のメタデータに任せる（notFound はページ本体で扱う）
  if (!org) return {};

  const title = buildOrgTitle(org);
  const description = buildOrgDescription(org);
  const url = `${SITE_URL}/organizations/${id}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url,
      siteName: "ProofLoop",
      title: `${title} | ProofLoop`,
      description,
      locale: "ja_JP",
    },
    alternates: { canonical: url },
  };
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org, events, photos, reviews } = await getOrganizationPageData(id);

  // ここに来る null は「団体が存在しない」だけ（取得の失敗は loadFromDatabase が投げる）。
  // この 404 がキャッシュされるのは意図どおり。存在しないIDを総当たりされても
  // DBに当たらない。団体は claim 動線でしか状態が変わらず、新規作成された団体は
  // それ以前に誰も訪問していないので、古い 404 が残ることはない。
  if (!org) notFound();

  return (
    <>
      <OrganizationDetailClient
        org={org}
        claimStatus={org.claim_status ?? null}
        events={events}
        photos={photos}
        approvedReviews={reviews}
      />
      <ListingNotice />
    </>
  );
}

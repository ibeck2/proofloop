import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site-url";
import { buildOrgDescription, buildOrgTitle } from "@/lib/organizations/pageMetadata";
import OrganizationDetailClient from "./OrganizationDetailClient";

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

const ORG_COLUMNS =
  "id, name, university, category, description, logo_url, member_count, activity_frequency, is_intercollege, target_grades, selection_process, selection_flow, gender_ratio, grade_composition, location_detail, fee_entry, fee_annual, x_id, instagram_id, line_url, website_url";

/**
 * generateMetadata と本体レンダリングの両方から団体行を使うため、リクエスト単位でメモ化する。
 * これが無いと1リクエストあたり同じ問い合わせが2回走る。
 */
const getOrganization = cache(async (id: string) => {
  const { data, error } = await supabase
    .from("organizations")
    .select(ORG_COLUMNS)
    .eq("id", id)
    .single();
  return { data, error };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data: org, error } = await getOrganization(id);

  // 取得できないときは既定のメタデータに任せる（notFound はページ本体で扱う）
  if (error || !org) return {};

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
  const [orgResult, eventsResult, photosResult, reviewsResult] = await Promise.all([
    getOrganization(id),
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

  const { data: org, error: orgError } = orgResult;
  const { data: events = [] } = eventsResult;
  const { data: photos = [] } = photosResult;
  const { data: reviews = [] } = reviewsResult;

  if (orgError || !org) notFound();

  return (
    <OrganizationDetailClient
      org={org}
      events={(events as EventRow[]) ?? []}
      photos={(photos as OrganizationPhotoRow[]) ?? []}
      approvedReviews={(reviews as ReviewRow[]) ?? []}
    />
  );
}

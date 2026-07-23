"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Heart,
  Send,
  CheckCircle2,
  Camera,
  Globe,
  Link as LinkIcon,
  Clock,
  CalendarDays,
  MapPin,
  ChevronRight,
  Star,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchOrganizationOwnerUserId } from "@/lib/organizationMembers";
import { Button } from "@/components/ui";
import { useSavedOrganizations } from "@/hooks/useSavedOrganizations";
import OrganizationPageViewTracker from "@/components/OrganizationPageViewTracker";
import type { Application, ProfileForEntry } from "@/lib/types/application";

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

export type SelectionFlowStep = {
  name: string;
  date_type: "pin" | "deadline" | "period" | "none";
  date_value: string;
  description: string;
  url: string;
};

export type OrgDetailData = {
  id: string;
  name: string | null;
  university: string | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  member_count: string | null;
  activity_frequency: string | null;
  is_intercollege: boolean | null;
  target_grades: string | null;
  selection_process: string | null;
  selection_flow: SelectionFlowStep[] | null;
  gender_ratio: string | null;
  grade_composition: string | null;
  location_detail: string | null;
  fee_entry: string | null;
  fee_annual: string | null;
  x_id: string | null;
  instagram_id: string | null;
  line_url: string | null;
  website_url: string | null;
};

function getTargetGradesDisplay(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  let arr: string[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    arr = Array.isArray(parsed) ? parsed.map(String) : raw.split(",").map((s) => s.trim()).filter(Boolean);
  } catch {
    arr = raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (arr.length === 0) return null;
  const hasB1 = arr.includes("学部1年");
  const hasB2 = arr.includes("学部2年");
  const hasB3 = arr.includes("学部3年");
  const hasB4 = arr.includes("学部4年");
  const hasM1 = arr.includes("大学院1年");
  const hasM2 = arr.includes("大学院2年");
  const allUnder = hasB1 && hasB2 && hasB3 && hasB4 && !hasM1 && !hasM2;
  const allSix = hasB1 && hasB2 && hasB3 && hasB4 && hasM1 && hasM2;
  const onlyGrad = !hasB1 && !hasB2 && !hasB3 && !hasB4 && hasM1 && hasM2;
  if (allUnder) return "学部生対象";
  if (allSix) return "学部生・院生全員対象";
  if (onlyGrad) return "院生対象";
  return arr.join("・") + "のみ";
}

function formatStepDate(step: SelectionFlowStep): string {
  if (step.date_type === "none" || !step.date_value.trim()) return "";
  const v = step.date_value.trim();
  if (step.date_type === "pin" || step.date_type === "deadline") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      const formatted = d.toLocaleString("ja-JP", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
      return step.date_type === "deadline" ? `${formatted}まで` : formatted;
    }
    return step.date_type === "deadline" ? v + "まで" : v;
  }
  if (step.date_type === "period") return v + "頃";
  return v;
}

const TABS = [
  { id: "overview", label: "概要・基本情報" },
  { id: "activity", label: "活動詳細" },
  { id: "events", label: "イベント・選考" },
  { id: "photos", label: "フォト＆口コミ" },
] as const;

type Props = {
  org: OrgDetailData;
  events?: EventRow[];
  photos?: OrganizationPhotoRow[];
  approvedReviews?: ReviewRow[];
};

/** エントリー完了後に団体管理者へ通知メール（ベストエフォート・await しない） */
function fireApplyNotificationEmail(opts: {
  organizationId: string;
  applicantUserId: string;
  clubName: string | null;
  fallbackProfile: ProfileForEntry | null;
}) {
  const { organizationId, applicantUserId, clubName, fallbackProfile } = opts;
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const atsUrl = `${origin}/clubats?orgId=${encodeURIComponent(organizationId)}`;

  void (async () => {
    try {
      const ownerId = await fetchOrganizationOwnerUserId(supabase, organizationId);
      if (!ownerId) {
        console.error("apply notify: no organization owner in organization_members");
        return;
      }

      const { data: adminProfile, error: adminErr } = await supabase
        .from("profiles")
        .select("contact_email")
        .eq("id", ownerId)
        .maybeSingle();

      if (adminErr) {
        console.error("apply notify: admin profile fetch failed", adminErr);
        return;
      }

      const contactEmail = adminProfile?.contact_email?.trim();
      if (!contactEmail) return;

      const { data: applicantProfile, error: appErr } = await supabase
        .from("profiles")
        .select("full_name, display_name, university")
        .eq("id", applicantUserId)
        .maybeSingle();

      if (appErr) {
        console.error("apply notify: applicant profile fetch failed", appErr);
        return;
      }

      const applicantName =
        applicantProfile?.full_name?.trim() ||
        applicantProfile?.display_name?.trim() ||
        fallbackProfile?.display_name?.trim() ||
        "応募者";
      const applicantUniversity =
        applicantProfile?.university?.trim() ||
        fallbackProfile?.university?.trim() ||
        "（大学名未設定）";

      const res = await fetch("/api/emails/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contactEmail,
          clubName: clubName?.trim() || "団体",
          applicantName,
          applicantUniversity,
          atsUrl,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error("apply notify email API failed", res.status, j);
      }
    } catch (e) {
      console.error("apply notify error", e);
    }
  })();
}

export default function OrganizationDetailClient({
  org,
  events = [],
  photos = [],
  approvedReviews = [],
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const { savedOrgIds, toggle: toggleSavedOrg, togglingId } = useSavedOrganizations();
  const isSavedOrg = savedOrgIds.includes(org.id);
  const [application, setApplication] = useState<Application | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [applicantMessage, setApplicantMessage] = useState("");
  const [profileForEntry, setProfileForEntry] = useState<ProfileForEntry | null>(null);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryCheckDone, setEntryCheckDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null));
  }, []);

  const openOrCreateChat = async () => {
    const uid = session?.user?.id;
    if (!uid) {
      toast.error("メッセージ機能を利用するにはログインしてください");
      router.push("/login");
      return;
    }

    // 既にエントリー済みなら、そのスレッド（application）をチャットとして使う
    const existingEntry = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", uid)
      .eq("organization_id", org.id)
      .neq("is_chat_only", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingEntry.data?.id) {
      router.push(`/mypage/messages?app=${encodeURIComponent(existingEntry.data.id)}`);
      return;
    }

    // エントリーなしの場合は chat-only スレッドを再利用 or 作成
    const existingChatOnly = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", uid)
      .eq("organization_id", org.id)
      .eq("is_chat_only", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingChatOnly.data?.id) {
      router.push(`/mypage/messages?app=${encodeURIComponent(existingChatOnly.data.id)}`);
      return;
    }

    const { data: inserted, error } = await supabase
      .from("applications")
      .insert({
        user_id: uid,
        organization_id: org.id,
        status: "chat",
        current_step: "メッセージ",
        applicant_message: null,
        source: "Message",
        is_chat_only: true,
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message || "チャットの作成に失敗しました");
      return;
    }
    router.push(`/mypage/messages?app=${encodeURIComponent(inserted.id)}`);
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setEntryCheckDone(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const [appRes, profileRes] = await Promise.all([
        supabase
          .from("applications")
          .select("id, user_id, organization_id, status, current_step, applicant_message, created_at")
          .eq("user_id", session.user.id)
          .eq("organization_id", org.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("display_name, university, faculty, enrollment_year")
          .eq("id", session.user.id)
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (appRes.data) setApplication(appRes.data as Application);
      if (profileRes.data) setProfileForEntry(profileRes.data as ProfileForEntry);
      setEntryCheckDone(true);
    })();
    return () => { cancelled = true; };
  }, [session?.user?.id, org.id]);

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;
    setEntrySubmitting(true);
    try {
      const { data, error } = await supabase.from("applications").insert({
        user_id: session.user.id,
        organization_id: org.id,
        status: "active",
        current_step: "新規応募",
        applicant_message: applicantMessage.trim() || null,
        source: "ProofLoop",
      }).select("id, user_id, organization_id, status, current_step, applicant_message, created_at, source").single();
      if (error) throw error;
      setApplication(data as Application);
      setEntryModalOpen(false);
      setApplicantMessage("");
      toast.success("エントリーが完了しました");
      fireApplyNotificationEmail({
        organizationId: org.id,
        applicantUserId: session.user.id,
        clubName: org.name,
        fallbackProfile: profileForEntry,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エントリーに失敗しました");
    } finally {
      setEntrySubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !reviewComment.trim()) return;
    setReviewSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        organization_id: org.id,
        user_id: session.user.id,
        rating: reviewRating,
        content: reviewComment.trim(),
        status: "pending",
      });
      if (error) throw error;
      toast.success("口コミを送信しました。運営の承認後に公開されます");
      setReviewComment("");
      setReviewRating(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const formatReviewDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const name = org.name ?? "（団体名なし）";
  const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  const xUrl = org.x_id
    ? `https://x.com/${org.x_id.replace(/^@/, "")}`
    : null;
  const instaUrl = org.instagram_id
    ? `https://www.instagram.com/${org.instagram_id.replace(/^@/, "")}/`
    : null;

  return (
    <div className="min-h-screen bg-paper text-graphite font-body">
      <OrganizationPageViewTracker organizationId={org.id} />
      <main className="max-w-4xl mx-auto px-4 py-8 pb-20 md:pb-12">
        <Link
          href="/search"
          className="text-ink text-sm font-bold mb-6 inline-flex items-center gap-1 hover:underline underline-offset-4"
        >
          ← 検索に戻る
        </Link>

        {/* ヘッダーエリア */}
        <header className="flex flex-col sm:flex-row gap-6 items-start pb-8 border-b border-rule">
          <div className="flex-shrink-0">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={`${name}のロゴ`}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-contain bg-mist border border-rule"
              />
            ) : (
              <div
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-ink border border-ink flex items-center justify-center text-paper"
                aria-hidden="true"
              >
                <span className="font-mincho text-4xl sm:text-5xl">
                  {name.trim().charAt(0) || "◯"}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-mincho text-ink">{name}</h1>
              <button
                type="button"
                onClick={() => toggleSavedOrg(org.id)}
                disabled={togglingId === org.id}
                aria-label={isSavedOrg ? "お気に入りから削除" : "お気に入りに追加"}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full border border-rule bg-paper hover:bg-mist transition-colors disabled:opacity-50"
              >
                <Heart
                  className={`w-6 h-6 ${isSavedOrg ? "text-ink" : "text-graphite/70"}`}
                  fill={isSavedOrg ? "currentColor" : "none"}
                  aria-hidden="true"
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-0">
              {org.university && (
                <span className="text-sm px-2.5 py-0.5 border border-rule text-graphite bg-mist rounded">
                  {org.university}
                </span>
              )}
              {org.category && (
                <span className="text-sm px-2.5 py-0.5 border border-ink text-ink bg-mist rounded">
                  {org.category}
                </span>
              )}
              {org.is_intercollege !== null && org.is_intercollege !== undefined && (
                <span className="text-xs px-2.5 py-0.5 font-medium border border-rule text-ink bg-mist rounded">
                  {org.is_intercollege ? "インカレ" : "学内団体"}
                </span>
              )}
              {getTargetGradesDisplay(org.target_grades) && (
                <span className="text-xs px-2.5 py-0.5 font-medium border border-rule text-ink bg-mist rounded">
                  {getTargetGradesDisplay(org.target_grades)}
                </span>
              )}
              {org.selection_process && (
                <span className="text-xs px-2.5 py-0.5 font-medium border border-rule text-ink bg-mist rounded">
                  {org.selection_process}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* エントリーCTA */}
        <div className="py-4 border-b border-rule">
          {session ? (
            application ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 text-graphite">
                  <CheckCircle2 className="w-6 h-6 text-ink" aria-hidden="true" />
                  <span className="font-bold">
                    エントリー済み（現在：{application.current_step || "—"}ステップ）
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openOrCreateChat}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  この団体にメッセージを送る
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={openOrCreateChat}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" aria-hidden="true" />
                  この団体にメッセージを送る
                </Button>
                <button
                  type="button"
                  onClick={() => setEntryModalOpen(true)}
                  disabled={!entryCheckDone}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-ink text-paper font-bold rounded-lg hover:bg-ink/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" aria-hidden="true" />
                  この団体にエントリーする
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-graphite text-sm">
                メッセージを送るにはログインが必要です。
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={openOrCreateChat}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                この団体にメッセージを送る
              </Button>
            </div>
          )}
        </div>

        {/* タブナビ */}
        <nav
          role="tablist"
          className="flex gap-0 border-b border-rule overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-seal text-seal"
                  : "border-transparent text-graphite/70 hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* タブコンテンツ */}
        <div className="py-8">
          {activeTab === "overview" && (
            <section
              role="tabpanel"
              key="overview"
              className="transition-opacity duration-200"
            >
              <h2 className="text-lg font-bold font-mincho text-ink mb-4">理念・活動内容</h2>
              {org.description ? (
                <p className="text-graphite whitespace-pre-wrap leading-relaxed">
                  {org.description}
                </p>
              ) : (
                <p className="text-graphite/70 italic">活動内容は未登録です。</p>
              )}
              <div className="mt-8">
                <h3 className="text-base font-bold font-mincho text-ink mb-3">公式SNS・連絡先</h3>
                <div className="flex flex-wrap gap-4">
                  {xUrl && (
                    <a
                      href={xUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rule hover:border-ink/30 hover:bg-mist transition-colors"
                    >
                      <span className="text-xl" aria-hidden="true">𝕏</span>
                      <span className="text-sm font-medium">X (Twitter)</span>
                    </a>
                  )}
                  {instaUrl && (
                    <a
                      href={instaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rule hover:border-ink/30 hover:bg-mist transition-colors"
                    >
                      <Camera className="w-5 h-5" aria-hidden="true" />
                      <span className="text-sm font-medium">Instagram</span>
                    </a>
                  )}
                  {org.line_url && (
                    <a
                      href={org.line_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rule hover:border-ink/30 hover:bg-mist transition-colors"
                    >
                      <span className="text-ink font-bold text-sm">LINE</span>
                      <span className="text-sm font-medium">公式LINE</span>
                    </a>
                  )}
                  {org.website_url && (
                    <a
                      href={org.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rule hover:border-ink/30 hover:bg-mist transition-colors"
                    >
                      <Globe className="w-5 h-5" aria-hidden="true" />
                      <span className="text-sm font-medium">Webサイト</span>
                    </a>
                  )}
                  {!xUrl && !instaUrl && !org.line_url && !org.website_url && (
                    <p className="text-graphite/70 text-sm">SNS・連絡先は未登録です。</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeTab === "activity" && (
            <section
              role="tabpanel"
              key="activity"
              className="animate-in fade-in duration-200 space-y-8"
            >
              <div>
                <h2 className="text-lg font-bold font-mincho text-ink mb-3">メンバー構成</h2>
                <dl className="space-y-2 text-graphite">
                  {org.member_count && (
                    <div className="flex gap-2">
                      <dt className="font-medium w-28">総人数</dt>
                      <dd>{org.member_count}</dd>
                    </div>
                  )}
                  {org.gender_ratio && (
                    <div className="flex gap-2">
                      <dt className="font-medium w-28">男女比</dt>
                      <dd>{org.gender_ratio}</dd>
                    </div>
                  )}
                  {org.grade_composition && (
                    <div className="flex gap-2">
                      <dt className="font-medium w-28">学年構成</dt>
                      <dd>{org.grade_composition}</dd>
                    </div>
                  )}
                  {!org.member_count && !org.gender_ratio && !org.grade_composition && (
                    <p className="text-graphite/70 italic">メンバー情報は未登録です。</p>
                  )}
                </dl>
              </div>
              <div>
                <h2 className="text-lg font-bold font-mincho text-ink mb-3">活動のベース</h2>
                <dl className="space-y-2 text-graphite">
                  {org.activity_frequency && (
                    <div className="flex gap-2">
                      <dt className="font-medium w-28">活動頻度</dt>
                      <dd>{org.activity_frequency}</dd>
                    </div>
                  )}
                  {org.location_detail && (
                    <div className="flex gap-2">
                      <dt className="font-medium w-28">主な活動場所</dt>
                      <dd>{org.location_detail}</dd>
                    </div>
                  )}
                  {!org.activity_frequency && !org.location_detail && (
                    <p className="text-graphite/70 italic">活動のベース情報は未登録です。</p>
                  )}
                </dl>
              </div>
              <div>
                <h2 className="text-lg font-bold font-mincho text-ink mb-3">費用</h2>
                <dl className="space-y-2 text-graphite">
                  {org.fee_entry && (
                    <div className="flex gap-2">
                      <dt className="font-medium w-28">初期費用</dt>
                      <dd>{org.fee_entry}</dd>
                    </div>
                  )}
                  {org.fee_annual && (
                    <div className="flex gap-2">
                      <dt className="font-medium w-28">年会費</dt>
                      <dd>{org.fee_annual}</dd>
                    </div>
                  )}
                  {!org.fee_entry && !org.fee_annual && (
                    <p className="text-graphite/70 italic">費用情報は未登録です。</p>
                  )}
                </dl>
              </div>
            </section>
          )}

          {activeTab === "events" && (
            <section
              role="tabpanel"
              key="events"
              className="transition-opacity duration-200"
            >
              <div className="space-y-4 mb-6">
                {getTargetGradesDisplay(org.target_grades) && (
                  <div>
                    <h3 className="text-sm font-bold text-graphite mb-1">対象学年</h3>
                    <p className="text-graphite">{getTargetGradesDisplay(org.target_grades)}</p>
                  </div>
                )}
                {org.selection_process && (
                  <div>
                    <h3 className="text-sm font-bold text-graphite mb-1">選考</h3>
                    <p className="text-graphite">{org.selection_process}</p>
                  </div>
                )}
              </div>
              {org.selection_process === "選考あり" && org.selection_flow && Array.isArray(org.selection_flow) && org.selection_flow.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-base font-bold font-mincho text-ink mb-4">選考フロー</h3>
                  <div className="relative">
                    {org.selection_flow.map((step, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-10 h-10 rounded-full bg-ink text-paper flex items-center justify-center text-sm font-bold shrink-0">
                            {index + 1}
                          </div>
                          {index < org.selection_flow!.length - 1 && (
                            <div className="w-0.5 flex-1 min-h-[24px] bg-rule my-1" />
                          )}
                        </div>
                        <div className="pb-6 flex-1 min-w-0">
                          <div className="p-4 rounded-lg border border-rule bg-mist/50">
                            <h4 className="font-bold text-ink mb-1">{step.name || "（ステップ名）"}</h4>
                            {formatStepDate(step) && (
                              <p className="text-sm text-graphite flex items-center gap-1 mb-2">
                                <Clock className="w-4 h-4" aria-hidden="true" />
                                {formatStepDate(step)}
                              </p>
                            )}
                            {step.description && (
                              <p className="text-sm text-graphite whitespace-pre-wrap mb-2">{step.description}</p>
                            )}
                            {step.url && (
                              <a
                                href={step.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm font-bold text-ink hover:underline underline-offset-4"
                              >
                                <LinkIcon className="w-[18px] h-[18px]" aria-hidden="true" />
                                関連リンクを開く
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-base font-bold font-mincho text-ink mb-3">予定イベント</h3>
                {events.length === 0 ? (
                  <p className="text-graphite/70 py-8 text-center border border-dashed border-rule rounded-lg bg-mist">
                    現在予定されているイベントはありません
                  </p>
                ) : (
                  <div className="space-y-4">
                    {events.map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/events/${ev.id}`}
                        className="block p-4 rounded-lg border border-rule bg-paper hover:border-ink/30 transition-colors"
                      >
                        <h4 className="font-bold text-ink mb-2">{ev.title ?? "（タイトルなし）"}</h4>
                        <div className="flex flex-wrap gap-3 text-sm text-graphite">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4" aria-hidden="true" />
                            {formatEventDate(ev.event_date)}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" aria-hidden="true" />
                              {ev.location}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-graphite text-sm mt-2 line-clamp-2">{ev.description}</p>
                        )}
                        <span className="text-ink text-sm font-bold mt-2 inline-flex items-center gap-1">
                          詳細を見る
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "photos" && (
            <section
              role="tabpanel"
              key="photos"
              className="transition-opacity duration-200 space-y-10"
            >
              <div>
                <h3 className="text-base font-bold font-mincho text-ink mb-3">フォトギャラリー</h3>
                {photos.length === 0 ? (
                  <p className="text-graphite/70 py-8 text-center border border-dashed border-rule rounded-lg bg-mist">
                    まだ写真がありません
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-lg overflow-hidden bg-mist border border-rule"
                      >
                        <img
                          src={photo.photo_url}
                          alt="団体の写真"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold font-mincho text-ink mb-3">口コミ</h3>
                {approvedReviews.length === 0 ? (
                  <p className="text-graphite/70 py-6 text-center border border-dashed border-rule rounded-lg bg-mist text-sm">
                    まだ口コミはありません
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {approvedReviews.map((r) => (
                      <li
                        key={r.id}
                        className="p-4 rounded-lg border border-rule bg-paper"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex text-ink" aria-label={`${r.rating}点`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-[18px] h-[18px] ${star <= r.rating ? "opacity-100" : "opacity-30"}`}
                                fill={star <= r.rating ? "currentColor" : "none"}
                                aria-hidden="true"
                              />
                            ))}
                          </span>
                          <span className="text-graphite/70 text-sm">
                            {formatReviewDate(r.created_at)}
                          </span>
                        </div>
                        {r.content && (
                          <p className="text-graphite text-sm whitespace-pre-wrap">{r.content}</p>
                        )}
                        {r.club_reply && r.club_reply.trim() && (
                          <div className="mt-3 pt-3 border-t border-rule bg-mist rounded-lg p-3">
                            <p className="text-xs font-bold text-graphite mb-1">団体からの返信</p>
                            <p className="text-graphite text-sm whitespace-pre-wrap">{r.club_reply}</p>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {session && (
                  <form onSubmit={handleSubmitReview} className="mt-6 p-5 rounded-lg border border-rule bg-mist">
                    <h4 className="text-sm font-bold text-ink mb-3">口コミを投稿する</h4>
                    <div className="mb-3">
                      <span className="text-graphite text-sm mr-2">評価</span>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="border border-rule rounded px-2 py-1.5 text-sm"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} 星
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="review-comment" className="block text-graphite text-sm mb-1">
                        コメント
                      </label>
                      <textarea
                        id="review-comment"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="体験や感想を入力してください"
                        rows={3}
                        required
                        className="w-full border border-rule rounded px-3 py-2 text-sm focus:ring-1 focus:ring-ink focus:border-ink"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? "送信中..." : "送信する"}
                    </Button>
                  </form>
                )}
                {!session && (
                  <p className="text-graphite/70 text-sm mt-4">口コミを投稿するにはログインしてください。</p>
                )}
              </div>
            </section>
          )}
        </div>

        {/* エントリーモーダル */}
        {entryModalOpen && (
          <>
            <div
              role="presentation"
              aria-hidden
              className="fixed inset-0 z-[200] bg-black/40"
              onClick={() => !entrySubmitting && setEntryModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="entry-modal-title"
              className="fixed left-1/2 top-1/2 z-[210] w-[min(480px,90vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-paper border border-rule rounded-xl shadow-xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 id="entry-modal-title" className="font-mincho text-ink text-lg font-bold">
                  この団体にエントリーする
                </h3>
                <button
                  type="button"
                  aria-label="閉じる"
                  onClick={() => !entrySubmitting && setEntryModalOpen(false)}
                  disabled={entrySubmitting}
                  className="p-2 text-graphite/70 hover:text-ink transition-colors disabled:opacity-50"
                >
                  <X className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
              <form onSubmit={handleEntrySubmit} className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-graphite mb-2">
                    送信されるプロフィール情報
                  </h4>
                  <div className="rounded-lg border border-rule bg-mist p-4 space-y-2 text-sm">
                    <p><span className="text-graphite/70 font-medium">氏名</span> {profileForEntry?.display_name ?? "—"}</p>
                    <p><span className="text-graphite/70 font-medium">大学名</span> {profileForEntry?.university ?? "—"}</p>
                    <p><span className="text-graphite/70 font-medium">学部・学科</span> {profileForEntry?.faculty ?? "—"}</p>
                    <p><span className="text-graphite/70 font-medium">入学年度</span> {profileForEntry?.enrollment_year ?? "—"}</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="applicant-message" className="block text-sm font-bold text-graphite mb-2">
                    志望動機 / 自己PR <span className="text-graphite/70 font-normal">（任意）</span>
                  </label>
                  <textarea
                    id="applicant-message"
                    value={applicantMessage}
                    onChange={(e) => setApplicantMessage(e.target.value)}
                    placeholder="志望動機や自己PRを入力してください"
                    rows={4}
                    className="w-full border border-rule rounded-lg px-3 py-2 text-graphite bg-paper focus:ring-1 focus:ring-ink focus:border-ink resize-y"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEntryModalOpen(false)}
                    disabled={entrySubmitting}
                  >
                    キャンセル
                  </Button>
                  <Button type="submit" variant="primary" disabled={entrySubmitting}>
                    {entrySubmitting ? "送信中..." : "送信する"}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

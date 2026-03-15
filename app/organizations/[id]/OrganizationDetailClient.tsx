"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";

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

export default function OrganizationDetailClient({
  org,
  events = [],
  photos = [],
  approvedReviews = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const [session, setSession] = useState<{ user: { id: string } } | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session ?? null));
  }, []);

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
    <div className="min-h-screen bg-white text-slate-900 font-display">
      <main className="max-w-4xl mx-auto px-4 py-8 pb-20 md:pb-12">
        <Link
          href="/search"
          className="text-accent text-sm font-bold mb-6 inline-flex items-center gap-1 hover:underline"
        >
          ← 検索に戻る
        </Link>

        {/* ヘッダーエリア */}
        <header className="flex flex-col sm:flex-row gap-6 items-start pb-8 border-b border-slate-200">
          <div className="flex-shrink-0">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={`${name}のロゴ`}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-contain bg-slate-50 border border-slate-200"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-4xl sm:text-5xl">groups</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">{name}</h1>
            <div className="flex flex-wrap gap-2">
              {org.university && (
                <span className="text-sm px-2.5 py-0.5 border border-slate-300 text-slate-700 bg-slate-50 rounded">
                  {org.university}
                </span>
              )}
              {org.category && (
                <span className="text-sm px-2.5 py-0.5 border border-accent text-accent bg-accent/5 rounded">
                  {org.category}
                </span>
              )}
              {org.is_intercollege !== null && org.is_intercollege !== undefined && (
                <span className="text-xs px-2.5 py-0.5 font-medium border border-blue-500/60 text-blue-700 bg-blue-50 rounded">
                  {org.is_intercollege ? "インカレ" : "学内団体"}
                </span>
              )}
              {org.target_grades && (
                <span className="text-xs px-2.5 py-0.5 font-medium border border-emerald-500/60 text-emerald-700 bg-emerald-50 rounded">
                  {org.target_grades}
                </span>
              )}
              {org.selection_process && (
                <span className="text-xs px-2.5 py-0.5 font-medium border border-orange-500/60 text-orange-700 bg-orange-50 rounded">
                  {org.selection_process}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* タブナビ */}
        <nav
          role="tablist"
          className="flex gap-0 border-b border-slate-200 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-slate-500 hover:text-slate-800"
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
              <h2 className="text-lg font-bold text-navy mb-4">理念・活動内容</h2>
              {org.description ? (
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {org.description}
                </p>
              ) : (
                <p className="text-slate-500 italic">活動内容は未登録です。</p>
              )}
              <div className="mt-8">
                <h3 className="text-base font-bold text-navy mb-3">公式SNS・連絡先</h3>
                <div className="flex flex-wrap gap-4">
                  {xUrl && (
                    <a
                      href={xUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-xl">𝕏</span>
                      <span className="text-sm font-medium">X (Twitter)</span>
                    </a>
                  )}
                  {instaUrl && (
                    <a
                      href={instaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">photo_camera</span>
                      <span className="text-sm font-medium">Instagram</span>
                    </a>
                  )}
                  {org.line_url && (
                    <a
                      href={org.line_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-green-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                    >
                      <span className="text-green-600 font-bold text-sm">LINE</span>
                      <span className="text-sm font-medium">公式LINE</span>
                    </a>
                  )}
                  {org.website_url && (
                    <a
                      href={org.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">language</span>
                      <span className="text-sm font-medium">Webサイト</span>
                    </a>
                  )}
                  {!xUrl && !instaUrl && !org.line_url && !org.website_url && (
                    <p className="text-slate-500 text-sm">SNS・連絡先は未登録です。</p>
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
                <h2 className="text-lg font-bold text-navy mb-3">メンバー構成</h2>
                <dl className="space-y-2 text-slate-700">
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
                    <p className="text-slate-500 italic">メンバー情報は未登録です。</p>
                  )}
                </dl>
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy mb-3">活動のベース</h2>
                <dl className="space-y-2 text-slate-700">
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
                    <p className="text-slate-500 italic">活動のベース情報は未登録です。</p>
                  )}
                </dl>
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy mb-3">費用</h2>
                <dl className="space-y-2 text-slate-700">
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
                    <p className="text-slate-500 italic">費用情報は未登録です。</p>
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
                {org.target_grades && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-600 mb-1">対象学年</h3>
                    <p className="text-slate-700">{org.target_grades}</p>
                  </div>
                )}
                {org.selection_process && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-600 mb-1">選考</h3>
                    <p className="text-slate-700">{org.selection_process}</p>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <h3 className="text-base font-bold text-navy mb-3">予定イベント</h3>
                {events.length === 0 ? (
                  <p className="text-slate-500 py-8 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50">
                    現在予定されているイベントはありません
                  </p>
                ) : (
                  <div className="space-y-4">
                    {events.map((ev) => (
                      <article
                        key={ev.id}
                        className="p-4 rounded-lg border border-slate-200 bg-white hover:border-accent/30 transition-colors"
                      >
                        <h4 className="font-bold text-navy mb-2">{ev.title ?? "（タイトルなし）"}</h4>
                        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                            {formatEventDate(ev.event_date)}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">location_on</span>
                              {ev.location}
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="text-slate-600 text-sm mt-2 line-clamp-2">{ev.description}</p>
                        )}
                      </article>
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
                <h3 className="text-base font-bold text-navy mb-3">フォトギャラリー</h3>
                {photos.length === 0 ? (
                  <p className="text-slate-500 py-8 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50">
                    まだ写真がありません
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200"
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
                <h3 className="text-base font-bold text-navy mb-3">口コミ</h3>
                {approvedReviews.length === 0 ? (
                  <p className="text-slate-500 py-6 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50 text-sm">
                    まだ口コミはありません
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {approvedReviews.map((r) => (
                      <li
                        key={r.id}
                        className="p-4 rounded-lg border border-slate-200 bg-white"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex text-amber-500" aria-label={`${r.rating}点`}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`material-symbols-outlined text-lg ${star <= r.rating ? "opacity-100" : "opacity-30"}`}
                                style={
                                  star <= r.rating
                                    ? { fontVariationSettings: "'FILL' 1" }
                                    : undefined
                                }
                              >
                                star
                              </span>
                            ))}
                          </span>
                          <span className="text-slate-500 text-sm">
                            {formatReviewDate(r.created_at)}
                          </span>
                        </div>
                        {r.content && (
                          <p className="text-slate-700 text-sm whitespace-pre-wrap">{r.content}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {session && (
                  <form onSubmit={handleSubmitReview} className="mt-6 p-5 rounded-lg border border-slate-200 bg-slate-50">
                    <h4 className="text-sm font-bold text-navy mb-3">口コミを投稿する</h4>
                    <div className="mb-3">
                      <span className="text-slate-600 text-sm mr-2">評価</span>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="border border-slate-300 rounded px-2 py-1.5 text-sm"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} 星
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="review-comment" className="block text-slate-600 text-sm mb-1">
                        コメント
                      </label>
                      <textarea
                        id="review-comment"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="体験や感想を入力してください"
                        rows={3}
                        required
                        className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary"
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
                  <p className="text-slate-500 text-sm mt-4">口コミを投稿するにはログインしてください。</p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

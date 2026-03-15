"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type ReviewRow = {
  id: string;
  organization_id: string;
  rating: number;
  content: string | null;
  status: string;
  created_at: string;
  club_reply: string | null;
  club_replied_at: string | null;
};

type OrgRow = { id: string; name: string | null };

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ClubDashboardReviewsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandingReplyId, setExpandingReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    const { data: rows } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("user_id", session.user.id)
      .limit(1);
    const org = (rows as OrgRow[] | null)?.[0];
    if (org) {
      setOrgId(org.id);
      setOrgName(org.name ?? null);
    }
    setLoading(false);
  }, []);

  const loadReviews = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("reviews")
      .select("id, organization_id, rating, content, status, created_at, club_reply, club_replied_at")
      .eq("organization_id", orgId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("reviews fetch error:", error);
      setReviews([]);
      return;
    }
    setReviews((data as ReviewRow[]) ?? []);
  }, [orgId]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    if (orgId) loadReviews();
  }, [orgId, loadReviews]);

  const handleOpenReply = (review: ReviewRow) => {
    setExpandingReplyId(review.id);
    if (review.club_reply != null) {
      setReplyDrafts((prev) => ({ ...prev, [review.id]: review.club_reply ?? "" }));
    }
  };

  const handleSubmitReply = async (reviewId: string) => {
    const text = (replyDrafts[reviewId] ?? "").trim();
    setSubmittingId(reviewId);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          club_reply: text || null,
          club_replied_at: new Date().toISOString(),
        })
        .eq("id", reviewId);
      if (error) throw error;
      toast.success("お礼メッセージを送信しました");
      setExpandingReplyId(null);
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });
      await loadReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="p-6 lg:p-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium">団体が登録されていません</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">プロフィール編集で団体を登録してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-primary text-2xl font-bold tracking-tight">口コミ・レビュー管理</h1>
      {orgName && (
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{orgName} への承認済み口コミ一覧</p>
      )}

      <div className="mt-6">
        {reviews.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-slate-500 dark:text-slate-400 text-sm">承認済みの口コミはまだありません</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex text-amber-500" aria-label={`${r.rating}点`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-lg ${star <= r.rating ? "opacity-100" : "opacity-30"}`}
                        style={star <= r.rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        star
                      </span>
                    ))}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{formatReviewDate(r.created_at)}</span>
                </div>
                {r.content && (
                  <p className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap mb-4">{r.content}</p>
                )}

                {(expandingReplyId === r.id || r.club_reply) && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                    <label htmlFor={`reply-${r.id}`} className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                      団体からの返信（お礼）
                    </label>
                    <textarea
                      id={`reply-${r.id}`}
                      value={replyDrafts[r.id] ?? r.club_reply ?? ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="お礼メッセージを入力..."
                      rows={3}
                      className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary resize-y"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitReply(r.id)}
                        disabled={submittingId === r.id}
                        className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingId === r.id ? "送信中..." : "送信する"}
                      </button>
                      {r.club_reply && (
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          {r.club_replied_at
                            ? `返信日: ${formatReviewDate(r.club_replied_at)}`
                            : ""}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {expandingReplyId !== r.id && !r.club_reply && (
                  <button
                    type="button"
                    onClick={() => handleOpenReply(r)}
                    className="mt-2 text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">reply</span>
                    返信（お礼）を書く
                  </button>
                )}
                {expandingReplyId !== r.id && r.club_reply && (
                  <button
                    type="button"
                    onClick={() => handleOpenReply(r)}
                    className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    返信を編集する
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

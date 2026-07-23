"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Reply, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

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

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ClubDashboardReviewsPage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [expandingReplyId, setExpandingReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

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

  if (ctxLoading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[200px]">
        <p className="text-graphite/70">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 lg:p-10">
        <div className="border border-rule border-l-4 border-l-seal bg-mist p-6 text-center">
          <p className="text-ink font-bold font-body">管理できる団体がありません</p>
          <p className="text-graphite/70 text-sm mt-1 font-body">プロフィール編集で団体を登録してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="font-mincho text-ink text-2xl font-bold tracking-tight">口コミ・レビュー管理</h1>
      {orgName && (
        <p className="text-graphite/70 text-sm mt-1 font-body">{orgName} への承認済み口コミ一覧</p>
      )}

      <div className="mt-6">
        {reviews.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-rule rounded-lg bg-mist">
            <p className="text-graphite/70 text-sm font-body">承認済みの口コミはまだありません</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="p-5 rounded-xl border border-rule bg-paper shadow-sm"
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
                  <span className="text-graphite/70 text-sm font-body">{formatReviewDate(r.created_at)}</span>
                </div>
                {r.content && (
                  <p className="text-graphite text-sm whitespace-pre-wrap mb-4 font-body">{r.content}</p>
                )}

                {(expandingReplyId === r.id || r.club_reply) && (
                  <div className="mt-3 pt-3 border-t border-rule">
                    <label htmlFor={`reply-${r.id}`} className="block text-sm font-bold text-ink mb-2 font-body">
                      団体からの返信（お礼）
                    </label>
                    <textarea
                      id={`reply-${r.id}`}
                      value={replyDrafts[r.id] ?? r.club_reply ?? ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="お礼メッセージを入力..."
                      rows={3}
                      className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-graphite focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ink resize-y"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSubmitReply(r.id)}
                        disabled={submittingId === r.id}
                        className="px-4 py-2 rounded-lg bg-ink text-paper text-sm font-medium hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed font-body"
                      >
                        {submittingId === r.id ? "送信中..." : "送信する"}
                      </button>
                      {r.club_reply && (
                        <span className="text-graphite/70 text-xs font-body">
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
                    className="mt-2 text-sm font-medium text-ink hover:underline inline-flex items-center gap-1 font-body"
                  >
                    <Reply className="w-[18px] h-[18px]" aria-hidden="true" />
                    返信（お礼）を書く
                  </button>
                )}
                {expandingReplyId !== r.id && r.club_reply && (
                  <button
                    type="button"
                    onClick={() => handleOpenReply(r)}
                    className="mt-2 text-sm font-medium text-graphite/70 hover:text-ink hover:underline inline-flex items-center gap-1 font-body"
                  >
                    <Pencil className="w-[18px] h-[18px]" aria-hidden="true" />
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

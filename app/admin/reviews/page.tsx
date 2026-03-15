"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";

const ADMIN_EMAIL = "admin99@test.com";

type ReviewRow = {
  id: string;
  organization_id: string;
  rating: number;
  content: string | null;
  status: string;
  created_at: string;
};

type ReviewWithOrg = ReviewRow & {
  organization_name: string | null;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  const isAdmin = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const loadPending = useCallback(async () => {
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("id, organization_id, rating, content, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error(
        "reviews fetch error:",
        JSON.stringify(reviewsError, null, 2),
        "message:",
        (reviewsError as { message?: string }).message,
        "code:",
        (reviewsError as { code?: string }).code,
        "details:",
        (reviewsError as { details?: unknown }).details
      );
      setReviews([]);
      setLoading(false);
      return;
    }

    const rows = (reviewsData as ReviewRow[]) ?? [];
    if (rows.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }

    const orgIds = [...new Set(rows.map((r) => r.organization_id))];
    const { data: orgsData, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", orgIds);

    if (orgsError) {
      console.error(
        "organizations fetch error:",
        JSON.stringify(orgsError, null, 2),
        "message:",
        (orgsError as { message?: string }).message
      );
    }

    const orgMap = new Map<string, string | null>();
    if (orgsData) {
      for (const o of orgsData as { id: string; name: string | null }[]) {
        orgMap.set(o.id, o.name ?? null);
      }
    }

    const merged: ReviewWithOrg[] = rows.map((r) => ({
      ...r,
      organization_name: orgMap.get(r.organization_id) ?? null,
    }));
    setReviews(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
      setSessionChecked(true);
    });
  }, []);

  useEffect(() => {
    if (sessionChecked && isAdmin) loadPending();
  }, [sessionChecked, isAdmin, loadPending]);

  const updateStatus = async (reviewId: string, status: "approved" | "rejected") => {
    if (!isAdmin) return;
    setActionId(reviewId);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({ status })
        .eq("id", reviewId);
      if (error) {
        console.error(
          "reviews update error:",
          JSON.stringify(error, null, 2),
          "message:",
          (error as { message?: string }).message,
          "code:",
          (error as { code?: string }).code,
          "details:",
          (error as { details?: unknown }).details
        );
        toast.error(
          "更新に失敗しました。管理者権限（admin99@test.com）でログインしているか確認してください"
        );
        return;
      }
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (err) {
      console.error(
        "reviews update error (catch):",
        err instanceof Error ? err.message : err,
        typeof err === "object" && err ? JSON.stringify(err, null, 2) : ""
      );
      toast.error(
        "更新に失敗しました。管理者権限（admin99@test.com）でログインしているか確認してください"
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-display">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-accent text-sm font-bold mb-6 inline-flex items-center gap-1 hover:underline">
          ← トップに戻る
        </Link>
        <h1 className="text-2xl font-bold text-navy mb-2">口コミ承認管理</h1>
        <p className="text-slate-600 text-sm mb-8">承認待ちの口コミを一覧で確認し、承認または却下できます。</p>

        {sessionChecked && !isAdmin && (
          <div className="mb-6 p-4 rounded-lg border-2 border-amber-500 bg-amber-50 text-amber-800">
            <p className="font-bold">このページは運営専用です</p>
            <p className="text-sm mt-1">
              口コミの承認・却下を行うには、管理者アカウント（{ADMIN_EMAIL}）でログインしてください。
            </p>
          </div>
        )}

        {!sessionChecked || !isAdmin ? (
          !sessionChecked ? (
            <p className="text-slate-500">確認中...</p>
          ) : (
            <p className="text-slate-500">上記のアカウントでログインすると操作できます。</p>
          )
        ) : loading ? (
          <p className="text-slate-500">読み込み中...</p>
        ) : reviews.length === 0 ? (
          <p className="text-slate-500 py-12 text-center border border-dashed border-slate-300 rounded-lg bg-white">
            承認待ちの口コミはありません
          </p>
        ) : (
          <ul className="space-y-4" aria-busy={actionId !== null}>
            {reviews.map((r) => (
              <li
                key={r.id}
                className="p-5 rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500 mb-1">
                      <Link
                        href={`/organizations/${r.organization_id}`}
                        className="text-accent hover:underline"
                      >
                        {r.organization_name ?? "（団体名なし）"}
                      </Link>
                      {" · "}
                      {new Date(r.created_at).toLocaleString("ja-JP")}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex text-amber-500 text-sm">
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
                      <span className="text-slate-500 text-sm">{r.rating} 星</span>
                    </div>
                    {r.content && (
                      <p className="text-slate-700 text-sm whitespace-pre-wrap">{r.content}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => updateStatus(r.id, "approved")}
                      disabled={actionId === r.id}
                    >
                      {actionId === r.id ? "処理中..." : "承認"}
                    </Button>
                    <Button
                      type="button"
                      variant="outlineMuted"
                      size="sm"
                      onClick={() => updateStatus(r.id, "rejected")}
                      disabled={actionId === r.id}
                    >
                      却下
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

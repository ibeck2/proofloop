"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { EventDetailRow } from "./page";

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = { event: EventDetailRow };

export default function EventDetailClient({ event }: Props) {
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSavedIds = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", uid);
    if (error) return;
    setSavedEventIds((data ?? []).map((r: { event_id: string }) => r.event_id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user?.id) return;
      fetchSavedIds(session.user.id);
    });
    return () => { cancelled = true; };
  }, [fetchSavedIds]);

  const toggleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      toast.error("保存するにはログインしてください");
      return;
    }
    setTogglingId(event.id);
    const isSaved = savedEventIds.includes(event.id);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", session.user.id)
          .eq("event_id", event.id);
        if (error) throw error;
        setSavedEventIds((prev) => prev.filter((id) => id !== event.id));
        toast.success("保存を解除しました");
      } else {
        const { error } = await supabase.from("saved_events").insert({
          user_id: session.user.id,
          event_id: event.id,
        });
        if (error) throw error;
        setSavedEventIds((prev) => [...prev, event.id]);
        toast.success("イベントを保存しました");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存の更新に失敗しました");
    } finally {
      setTogglingId(null);
    }
  };

  const org = event.organizations;
  const orgId = event.organization_id;
  const isSaved = savedEventIds.includes(event.id);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-900 font-display pb-20 md:pb-12">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/schedule"
          className="text-accent text-sm font-bold mb-6 inline-flex items-center gap-1 hover:underline"
        >
          ← スケジュールに戻る
        </Link>

        <article className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-navy">
                {event.title ?? "（タイトルなし）"}
              </h1>
              <button
                type="button"
                onClick={toggleSave}
                disabled={togglingId === event.id}
                aria-label={isSaved ? "保存を解除" : "イベントを保存"}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <span
                  className={`material-symbols-outlined text-xl ${isSaved ? "text-blue-600" : "text-slate-400"}`}
                  style={isSaved ? { fontVariationSettings: '"FILL" 1' } : undefined}
                >
                  {isSaved ? "bookmark" : "bookmark_border"}
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {isSaved ? "保存済み" : "保存する"}
                </span>
              </button>
            </div>

            <dl className="space-y-4 text-slate-700">
              <div>
                <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">開催日時</dt>
                <dd className="flex items-center gap-2 text-lg">
                  <span className="material-symbols-outlined text-primary text-[22px]">schedule</span>
                  {formatEventDate(event.event_date)}
                </dd>
              </div>
              {event.location && (
                <div>
                  <dt className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">場所</dt>
                  <dd className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                      {event.location.startsWith("http") ? "videocam" : "location_on"}
                    </span>
                    {event.location.startsWith("http") ? (
                      <a
                        href={event.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent font-medium hover:underline break-all"
                      >
                        {event.location}
                      </a>
                    ) : (
                      <span className="break-words">{event.location}</span>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            {event.description && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">詳細</h2>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {org && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">主催団体</h2>
                <Link
                  href={`/organizations/${orgId}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                >
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-contain bg-white border border-slate-200"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-3xl">groups</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-navy truncate">{org.name ?? "団体"}</p>
                    <p className="text-sm text-slate-500">団体詳細を見る</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </Link>
              </div>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}

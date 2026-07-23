"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Bookmark,
  CalendarDays,
  Video,
  MapPin,
  Users,
  ChevronRight,
} from "lucide-react";
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
    <div className="min-h-screen bg-paper text-graphite font-body pb-20 md:pb-12">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/schedule"
          className="text-ink text-sm font-bold mb-6 inline-flex items-center gap-1 hover:underline underline-offset-4"
        >
          ← スケジュールに戻る
        </Link>

        <article className="bg-paper border border-rule rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <h1 className="text-2xl md:text-3xl font-bold font-mincho text-ink">
                {event.title ?? "（タイトルなし）"}
              </h1>
              <button
                type="button"
                onClick={toggleSave}
                disabled={togglingId === event.id}
                aria-label={isSaved ? "保存を解除" : "イベントを保存"}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-rule bg-mist hover:bg-mist/70 transition-colors disabled:opacity-50"
              >
                <Bookmark
                  className={`w-5 h-5 ${isSaved ? "text-ink" : "text-graphite/70"}`}
                  fill={isSaved ? "currentColor" : "none"}
                  aria-hidden="true"
                />
                <span className="text-sm font-bold text-graphite">
                  {isSaved ? "保存済み" : "保存する"}
                </span>
              </button>
            </div>

            <dl className="space-y-4 text-graphite">
              <div>
                <dt className="text-xs font-bold text-graphite/70 uppercase tracking-wider mb-1">開催日時</dt>
                <dd className="flex items-center gap-2 text-lg font-numeric tabular-nums text-graphite">
                  <CalendarDays className="w-5 h-5 text-ink" aria-hidden="true" />
                  {formatEventDate(event.event_date)}
                </dd>
              </div>
              {event.location && (
                <div>
                  <dt className="text-xs font-bold text-graphite/70 uppercase tracking-wider mb-1">場所</dt>
                  <dd className="flex items-start gap-2">
                    {event.location.startsWith("http") ? (
                      <Video className="w-5 h-5 text-ink shrink-0" aria-hidden="true" />
                    ) : (
                      <MapPin className="w-5 h-5 text-ink shrink-0" aria-hidden="true" />
                    )}
                    {event.location.startsWith("http") ? (
                      <a
                        href={event.location}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink font-medium hover:underline break-all"
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
              <div className="mt-8 pt-6 border-t border-rule">
                <h2 className="text-sm font-bold text-graphite/70 uppercase tracking-wider mb-2">詳細</h2>
                <p className="text-graphite whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}

            {org && (
              <div className="mt-8 pt-6 border-t border-rule">
                <h2 className="text-sm font-bold text-graphite/70 uppercase tracking-wider mb-3">主催団体</h2>
                <Link
                  href={`/organizations/${orgId}`}
                  className="flex items-center gap-4 p-4 rounded-lg border border-rule bg-mist/50 hover:bg-mist hover:border-ink/30 transition-colors"
                >
                  {org.logo_url ? (
                    <img
                      src={org.logo_url}
                      alt=""
                      className="w-14 h-14 rounded-full object-contain bg-paper border border-rule"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-mist flex items-center justify-center text-graphite/40">
                      <Users className="w-6 h-6" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink truncate">{org.name ?? "団体"}</p>
                    <p className="text-sm text-graphite/70">団体詳細を見る</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-graphite/70" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}

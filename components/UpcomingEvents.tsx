"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type EventWithOrg = {
  id: string;
  title: string | null;
  event_date: string;
  location: string | null;
  organization_id: string;
  organizations: { name: string | null } | null;
};

export default function UpcomingEvents() {
  const [events, setEvents] = useState<EventWithOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          id,
          title,
          event_date,
          location,
          organization_id,
          organizations (
            name
          )
        `
        )
        .gte("event_date", now)
        .order("event_date", { ascending: true })
        .limit(5);
      if (error) {
        console.error("upcoming events fetch error:", error);
        setEvents([]);
      } else {
        setEvents((data as EventWithOrg[]) ?? []);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <section className="w-full flex flex-col gap-8">
        <div className="flex flex-end justify-between border-b border-[#f0f2f5] pb-4">
          <h3 className="text-primary text-2xl font-black">直近のイベント</h3>
          <Link className="text-text-grey text-sm font-bold hover:text-primary flex items-center gap-1" href="/schedule">
            全て見る
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-none snap-start w-[320px] h-48 bg-slate-100 animate-pulse rounded"
            />
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="w-full flex flex-col gap-8">
        <div className="flex flex-end justify-between border-b border-[#f0f2f5] pb-4">
          <h3 className="text-primary text-2xl font-black">直近のイベント</h3>
          <Link className="text-text-grey text-sm font-bold hover:text-primary flex items-center gap-1" href="/schedule">
            全て見る
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
        <p className="text-text-grey py-8 text-center border border-dashed border-slate-200 rounded-lg">
          現在予定されているイベントはありません
        </p>
      </section>
    );
  }

  return (
    <section className="w-full flex flex-col gap-8">
      <div className="flex flex-end justify-between border-b border-[#f0f2f5] pb-4">
        <h3 className="text-primary text-2xl font-black">直近のイベント</h3>
        <Link className="text-text-grey text-sm font-bold hover:text-primary flex items-center gap-1" href="/schedule">
          全て見る
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
      <div className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/organizations/${ev.organization_id}`}
            className="flex-none snap-start w-[320px] bg-white border border-[#f0f2f5] hover:border-text-grey/30 transition-colors rounded-lg overflow-hidden group"
          >
            <div className="h-32 bg-primary/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-5xl text-primary/30 group-hover:text-primary/50 transition-colors">
                event
              </span>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <span className="text-xs font-bold text-text-grey uppercase tracking-wider">
                {ev.organizations?.name ?? "団体"}
              </span>
              <h4 className="text-primary text-lg font-bold line-clamp-2 group-hover:text-accent transition-colors">
                {ev.title ?? "（タイトルなし）"}
              </h4>
              <div className="flex flex-col gap-1 text-sm text-text-grey">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                  {formatEventDate(ev.event_date)}
                </span>
                {ev.location && (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      {ev.location.startsWith("http") ? "videocam" : "location_on"}
                    </span>
                    {ev.location.length > 40 ? ev.location.slice(0, 40) + "…" : ev.location}
                  </span>
                )}
              </div>
              <span className="mt-2 text-accent text-sm font-bold flex items-center gap-1 group-hover:underline">
                詳細を見る
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

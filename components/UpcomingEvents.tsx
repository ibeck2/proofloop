"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronRight, MapPin, Video } from "lucide-react";
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
        <div className="flex flex-end justify-between border-b border-rule pb-4">
          <h3 className="text-ink text-2xl font-black">直近のイベント</h3>
          <Link className="text-graphite text-sm font-bold hover:text-ink flex items-center gap-1" href="/schedule">
            全て見る
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-none snap-start w-[320px] h-48 bg-mist animate-pulse rounded"
            />
          ))}
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="w-full flex flex-col gap-8">
        <div className="flex flex-end justify-between border-b border-rule pb-4">
          <h3 className="text-ink text-2xl font-black">直近のイベント</h3>
          <Link className="text-graphite text-sm font-bold hover:text-ink flex items-center gap-1" href="/schedule">
            全て見る
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="text-graphite py-8 text-center border border-dashed border-rule rounded-lg">
          現在予定されているイベントはありません
        </p>
      </section>
    );
  }

  return (
    <section className="w-full flex flex-col gap-8">
      <div className="flex flex-end justify-between border-b border-rule pb-4">
        <h3 className="text-ink text-2xl font-black">直近のイベント</h3>
        <Link className="text-graphite text-sm font-bold hover:text-ink flex items-center gap-1" href="/schedule">
          全て見る
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
        {events.map((ev) => (
          <Link
            key={ev.id}
            href={`/events/${ev.id}`}
            className="flex-none snap-start w-[320px] bg-paper border border-rule hover:border-graphite/30 transition-colors rounded-lg overflow-hidden group"
          >
            <div className="h-32 bg-mist flex items-center justify-center">
              <CalendarDays className="w-12 h-12 text-ink/30 group-hover:text-ink/50 transition-colors" aria-hidden="true" />
            </div>
            <div className="p-6 flex flex-col gap-3">
              <span className="text-xs font-bold text-graphite uppercase tracking-wider">
                {ev.organizations?.name ?? "団体"}
              </span>
              <h4 className="text-ink text-lg font-bold line-clamp-2 group-hover:text-ink transition-colors">
                {ev.title ?? "（タイトルなし）"}
              </h4>
              <div className="flex flex-col gap-1 text-sm text-graphite">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  {formatEventDate(ev.event_date)}
                </span>
                {ev.location && (
                  <span className="flex items-center gap-2">
                    {ev.location.startsWith("http") ? <Video className="w-[18px] h-[18px] shrink-0" aria-hidden="true" /> : <MapPin className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />}
                    {ev.location.length > 40 ? ev.location.slice(0, 40) + "…" : ev.location}
                  </span>
                )}
              </div>
              <span className="mt-2 text-ink text-sm font-bold flex items-center gap-1 group-hover:underline">
                詳細を見る
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

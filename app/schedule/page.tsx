"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";

type EventWithOrg = {
  id: string;
  title: string | null;
  event_date: string;
  location: string | null;
  description: string | null;
  organization_id: string;
  organizations: { name: string | null } | null;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatEventTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(iso: string, year: number, month: number, day: number) {
  const d = new Date(iso);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [events, setEvents] = useState<EventWithOrg[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select(
        `
        id,
        title,
        event_date,
        location,
        description,
        organization_id,
        organizations ( name )
      `
      )
      .order("event_date", { ascending: true });
    if (error) {
      console.error("schedule events fetch error:", error);
      setEvents([]);
      return;
    }
    setEvents((data as EventWithOrg[]) ?? []);
  }, []);

  const fetchSavedIds = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from("saved_events")
      .select("event_id")
      .eq("user_id", uid);
    if (error) {
      console.error("saved_events fetch error:", error);
      return;
    }
    const ids = (data ?? []).map((r: { event_id: string }) => r.event_id);
    setSavedEventIds(ids);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user?.id) {
        setUserId(session.user.id);
        await fetchSavedIds(session.user.id);
      }
      await fetchEvents();
      if (cancelled) return;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchEvents, fetchSavedIds]);

  const toggleSave = async (eventId: string) => {
    if (!userId) {
      toast.error("保存するにはログインしてください");
      return;
    }
    setTogglingId(eventId);
    const isSaved = savedEventIds.includes(eventId);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_events")
          .delete()
          .eq("user_id", userId)
          .eq("event_id", eventId);
        if (error) throw error;
        setSavedEventIds((prev) => prev.filter((id) => id !== eventId));
        toast.success("保存を解除しました");
      } else {
        const { error } = await supabase.from("saved_events").insert({
          user_id: userId,
          event_id: eventId,
        });
        if (error) throw error;
        setSavedEventIds((prev) => [...prev, eventId]);
        toast.success("イベントを保存しました");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存の更新に失敗しました");
    } finally {
      setTogglingId(null);
    }
  };

  const eventsForSelectedDay =
    selectedDay && events.filter((e) => isSameDay(e.event_date, selectedDay.year, selectedDay.month, selectedDay.day));

  const calendarDays = (() => {
    const { year, month } = calendarMonth;
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;
    const result: { day: number | null; date: Date | null }[] = [];
    for (let i = 0; i < totalCells; i++) {
      if (i < startPad) {
        result.push({ day: null, date: null });
      } else if (i < startPad + daysInMonth) {
        const day = i - startPad + 1;
        result.push({ day, date: new Date(year, month, day) });
      } else {
        result.push({ day: null, date: null });
      }
    }
    return result;
  })();

  const monthLabel = `${calendarMonth.year}年${calendarMonth.month + 1}月`;

  if (loading) {
    return (
      <div className="bg-[#f5f5f7] text-slate-900 min-h-screen pb-20 md:pb-8">
        <main className="max-w-[900px] mx-auto px-4 py-8">
          <h1 className="text-primary text-2xl font-bold mb-6">イベントスケジュール</h1>
          <div className="flex gap-4 mb-6">
            <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-[#f5f5f7] text-slate-900 min-h-screen pb-20 md:pb-8">
      <main className="max-w-[900px] mx-auto px-4 py-8">
        <h1 className="text-primary text-2xl font-bold mb-6">イベントスケジュール</h1>

        {/* View Toggle */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex-1 py-3 px-4 font-bold text-sm transition-colors ${
              viewMode === "list"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            リスト表示
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex-1 py-3 px-4 font-bold text-sm transition-colors ${
              viewMode === "calendar"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            月間表示
          </button>
        </div>

        {viewMode === "list" && (
          <section className="space-y-4">
            {events.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300">event_busy</span>
                <p className="text-slate-600 mt-2">現在予定されているイベントはありません</p>
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:border-primary/20 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-stretch">
                    <Link
                      href={`/events/${ev.id}`}
                      className="flex-1 p-5 flex flex-col gap-2 min-w-0"
                    >
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {ev.organizations?.name ?? "団体"}
                      </span>
                      <h3 className="text-primary font-bold text-lg">{ev.title ?? "（タイトルなし）"}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[18px]">schedule</span>
                          {formatEventDate(ev.event_date)}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[18px]">
                              {ev.location.startsWith("http") ? "videocam" : "location_on"}
                            </span>
                            {ev.location.length > 50 ? ev.location.slice(0, 50) + "…" : ev.location}
                          </span>
                        )}
                      </div>
                      {ev.description && (
                        <p className="text-slate-600 text-sm line-clamp-2">{ev.description}</p>
                      )}
                    </Link>
                    <div className="flex items-center px-4 py-3 sm:py-5 border-t sm:border-t-0 sm:border-l border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleSave(ev.id);
                        }}
                        disabled={togglingId === ev.id}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                        aria-label={savedEventIds.includes(ev.id) ? "保存を解除" : "イベントを保存"}
                      >
                        <span
                          className={`material-symbols-outlined text-2xl ${
                            savedEventIds.includes(ev.id) ? "text-blue-600 !font-[500]" : "text-slate-400"
                          }`}
                          style={savedEventIds.includes(ev.id) ? { fontVariationSettings: '"FILL" 1' } : undefined}
                        >
                          {savedEventIds.includes(ev.id) ? "bookmark" : "bookmark_border"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {viewMode === "calendar" && (
          <section className="bg-white border border-slate-200 rounded-lg p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() =>
                  setCalendarMonth((prev) =>
                    prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
                  )
                }
              >
                <span className="material-symbols-outlined text-xl">chevron_left</span>
              </Button>
              <h2 className="text-lg font-bold text-slate-800">{monthLabel}</h2>
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() =>
                  setCalendarMonth((prev) =>
                    prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
                  )
                }
              >
                <span className="material-symbols-outlined text-xl">chevron_right</span>
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded overflow-hidden">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="bg-slate-50 py-2 text-center text-xs font-bold text-slate-600"
                >
                  {w}
                </div>
              ))}
              {calendarDays.map((cell, i) => {
                const isSelected =
                  selectedDay &&
                  cell.date &&
                  selectedDay.year === cell.date.getFullYear() &&
                  selectedDay.month === cell.date.getMonth() &&
                  selectedDay.day === cell.date.getDate();
                const dayEvents =
                  cell.date && events.filter((e) => isSameDay(e.event_date, calendarMonth.year, calendarMonth.month, cell.day!));
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] md:min-h-[100px] bg-white p-1 ${
                      !cell.date ? "bg-slate-50/50" : ""
                    } ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
                  >
                    {cell.date && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedDay({
                              year: calendarMonth.year,
                              month: calendarMonth.month,
                              day: cell.day!,
                            })
                          }
                          className={`w-full text-left text-sm font-bold mb-1 ${
                            isSelected ? "text-primary" : "text-slate-700"
                          }`}
                        >
                          {cell.day}
                        </button>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <Link
                              key={ev.id}
                              href={`/events/${ev.id}`}
                              className="block truncate text-[10px] md:text-xs bg-primary/10 text-primary rounded px-1 py-0.5 hover:bg-primary/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formatEventTime(ev.event_date)} {ev.title ?? ""}
                            </Link>
                          ))}
                          {dayEvents.length > 3 && (
                            <span className="text-[10px] text-slate-500">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedDay && eventsForSelectedDay && eventsForSelectedDay.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3">
                  {selectedDay.year}年{selectedDay.month + 1}月{selectedDay.day}日のイベント
                </h3>
                <ul className="space-y-3">
                  {eventsForSelectedDay.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-3">
                      <span className="text-primary font-bold text-sm shrink-0">
                        {formatEventTime(ev.event_date)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/events/${ev.id}`}
                          className="text-primary font-bold hover:underline"
                        >
                          {ev.title ?? "（タイトルなし）"}
                        </Link>
                        <p className="text-slate-600 text-sm">{ev.organizations?.name ?? "団体"}</p>
                        {ev.location && (
                          <p className="text-slate-500 text-xs mt-0.5">{ev.location}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSave(ev.id)}
                        disabled={togglingId === ev.id}
                        className="p-1.5 shrink-0 rounded-full hover:bg-slate-100 disabled:opacity-50"
                        aria-label={savedEventIds.includes(ev.id) ? "保存を解除" : "保存"}
                      >
                        <span
                          className={`material-symbols-outlined text-xl ${
                            savedEventIds.includes(ev.id) ? "text-blue-600 !font-[500]" : "text-slate-400"
                          }`}
                          style={savedEventIds.includes(ev.id) ? { fontVariationSettings: '"FILL" 1' } : undefined}
                        >
                          {savedEventIds.includes(ev.id) ? "bookmark" : "bookmark_border"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedDay && eventsForSelectedDay?.length === 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200 text-center text-slate-500 text-sm">
                この日のイベントはありません
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

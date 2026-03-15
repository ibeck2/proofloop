"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Input, Textarea, Button } from "@/components/ui";

type EventRow = {
  id: string;
  organization_id: string;
  title: string | null;
  event_date: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

export default function ClubEventsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUserAndOrg = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setLoading(false);
      return;
    }
    setUserId(session.user.id);
    const { data: rows } = await supabase
      .from("organizations")
      .select("id")
      .eq("user_id", session.user.id)
      .limit(1);
    const org = (rows as { id: string }[] | null)?.[0];
    if (org) setOrgId(org.id);
    setLoading(false);
  }, []);

  const loadEvents = useCallback(async () => {
    if (!orgId) return;
    const { data, error } = await supabase
      .from("events")
      .select("id, organization_id, title, event_date, location, description, created_at")
      .eq("organization_id", orgId)
      .order("event_date", { ascending: true });
    if (error) {
      console.error("events fetch error:", error);
      setEvents([]);
    } else {
      setEvents((data as EventRow[]) ?? []);
    }
  }, [orgId]);

  useEffect(() => {
    loadUserAndOrg();
  }, [loadUserAndOrg]);

  useEffect(() => {
    if (orgId) loadEvents();
  }, [orgId, loadEvents]);

  const resetForm = () => {
    setTitle("");
    setEventDate("");
    setLocation("");
    setDescription("");
    setShowForm(false);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !title.trim() || !eventDate.trim()) {
      setErrorMessage("タイトルと開催日時は必須です。");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.from("events").insert({
        organization_id: orgId,
        title: title.trim(),
        event_date: eventDate,
        location: location.trim() || null,
        description: description.trim() || null,
      });
      if (error) throw error;
      resetForm();
      loadEvents();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このイベントを削除してもよろしいですか？")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      loadEvents();
    } catch (err) {
      console.error("delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

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

  if (loading) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-text-sub">読み込み中...</p>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="p-6 lg:p-10">
        <p className="text-text-sub">団体プロフィールを登録してください。プロフィール編集から団体情報を作成すると、イベントを管理できるようになります。</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <h2 className="text-2xl font-bold text-navy dark:text-white mb-2">イベント管理</h2>
      <p className="text-text-sub text-sm mb-6">団体のイベントを作成・管理できます。</p>

      {!showForm ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm(true)}
          className="mb-8"
        >
          新規イベントを作成
        </Button>
      ) : (
        <div className="mb-8 p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h3 className="text-lg font-bold text-navy dark:text-white mb-4">イベントを作成</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="event-title" className="block text-sm font-bold text-navy dark:text-slate-200 mb-2">
                タイトル <span className="text-red-500">*</span>
              </label>
              <Input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 春の新入生歓迎会"
                required
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="event-date" className="block text-sm font-bold text-navy dark:text-slate-200 mb-2">
                開催日時 <span className="text-red-500">*</span>
              </label>
              <input
                id="event-date"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="event-location" className="block text-sm font-bold text-navy dark:text-slate-200 mb-2">
                開催場所 / Zoomリンク
              </label>
              <Input
                id="event-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: 駒場キャンパス 1号館 または Zoom URL"
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="event-description" className="block text-sm font-bold text-navy dark:text-slate-200 mb-2">
                イベント詳細
              </label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="イベントの詳細を入力してください"
                rows={4}
                className="w-full"
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {errorMessage}
              </p>
            )}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "登録中..." : "登録する"}
              </Button>
              <Button type="button" variant="outlineMuted" onClick={resetForm}>
                キャンセル
              </Button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-navy dark:text-white mb-4">登録済みイベント</h3>
        {events.length === 0 ? (
          <p className="text-text-sub py-8 text-center border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
            イベントはまだ登録されていません。上のボタンから作成してください。
          </p>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <article
                key={ev.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-navy dark:text-white font-bold text-lg mb-2">{ev.title ?? "（タイトルなし）"}</h4>
                  <div className="flex flex-wrap gap-3 text-sm text-text-sub">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                      {formatEventDate(ev.event_date)}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                        {ev.location}
                      </span>
                    )}
                  </div>
                  {ev.description && (
                    <p className="text-text-sub text-sm mt-2 line-clamp-2">{ev.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(ev.id)}
                  disabled={deletingId === ev.id}
                  className="flex-shrink-0 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                >
                  {deletingId === ev.id ? "削除中..." : "削除"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ApplicationWithOrg } from "@/lib/types/application";
import ChatRoom from "@/components/ChatRoom";
import { formatRelativeTime } from "@/lib/format";

export default function MypageMessagesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationWithOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [deeplinkAppId, setDeeplinkAppId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data: appRows, error: appError } = await supabase
      .from("applications")
      .select(
        `
        id,
        user_id,
        organization_id,
        status,
        current_step,
        applicant_message,
        created_at,
        last_message_at,
        organizations (
          id,
          name,
          university,
          category,
          logo_url
        )
      `
      )
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (appError) {
      console.error("applications fetch error:", appError);
      setApplications([]);
      setLoading(false);
      return;
    }

    const list = (appRows ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      user_id: row.user_id as string | null,
      organization_id: row.organization_id as string,
      status: row.status as string,
      current_step: row.current_step as string,
      applicant_message: row.applicant_message as string | null,
      created_at: row.created_at as string,
      last_message_at: row.last_message_at as string | null,
      organizations: row.organizations as ApplicationWithOrg["organizations"],
    }));
    setApplications(list);

    const appIds = list.map((a: { id: string }) => a.id);
    if (appIds.length > 0) {
      const { data: unreadRows } = await supabase
        .from("application_messages")
        .select("application_id")
        .in("application_id", appIds)
        .eq("is_from_club", true)
        .is("read_at", null);
      const ids = [...new Set((unreadRows ?? []).map((r: { application_id: string }) => r.application_id))];
      setUnreadIds(new Set(ids));
    } else {
      setUnreadIds(new Set());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** メール通知の「チャットを開く」用: ?app=<application_id> */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("app");
    if (id) setDeeplinkAppId(id);
  }, []);

  useEffect(() => {
    if (!deeplinkAppId || applications.length === 0) return;
    if (applications.some((a) => a.id === deeplinkAppId)) {
      setSelectedId(deeplinkAppId);
    }
  }, [deeplinkAppId, applications]);

  const handleMarkedAsRead = useCallback((applicationId: string) => {
    setUnreadIds((prev) => {
      const n = new Set(prev);
      n.delete(applicationId);
      return n;
    });
  }, []);

  const selectedApp = applications.find((a) => a.id === selectedId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-500">ログインしてください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f5f7]">
      <header className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="一覧に戻る"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="text-lg font-bold text-primary truncate">メッセージ</h1>
        </div>
        <Link
          href="/mypage"
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">person</span>
          マイページ
        </Link>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* 左ペイン: 会話リスト */}
        <aside
          className={`shrink-0 w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {applications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                エントリーした団体とのメッセージがここに表示されます
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {applications.map((app) => {
                  const org = app.organizations;
                  const name = org?.name?.trim() || "（団体名なし）";
                  const sub = org?.university || org?.category || null;
                  const isSelected = app.id === selectedId;
                  const hasUnread = unreadIds.has(app.id);
                  return (
                    <li key={app.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(app.id)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        <div className="relative shrink-0">
                          {org?.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                              <span className="material-symbols-outlined text-xl">groups</span>
                            </div>
                          )}
                          {hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3" title="未読あり">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 truncate">{name}</p>
                          {sub && (
                            <p className="text-xs text-slate-500 truncate">{sub}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatRelativeTime(app.last_message_at ?? app.created_at)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* 右ペイン: チャット */}
        <section
          className={`flex-1 flex flex-col min-w-0 bg-slate-50 ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedId && userId ? (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="mb-2">
                <p className="font-medium text-slate-900">
                  {selectedApp?.organizations?.name?.trim() || "（団体名なし）"}
                </p>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <ChatRoom
                  applicationId={selectedId}
                  userId={userId}
                  viewerIsClub={false}
                  onMarkedAsRead={handleMarkedAsRead}
                  placeholder="メッセージを入力..."
                  fillHeight
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">chat_bubble_outline</span>
                <p className="text-slate-500 font-medium">メッセージを選択してください</p>
                <p className="text-slate-400 text-sm mt-1">左のリストから団体を選ぶと、ここにチャットが表示されます</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

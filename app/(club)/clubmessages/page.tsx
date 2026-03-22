"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ApplicationWithProfile } from "@/lib/types/application";
import ChatRoom from "@/components/ChatRoom";
import { formatRelativeTime } from "@/lib/format";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

export default function ClubMessagesPage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    hasNoMemberships,
    isReady,
    withOrgQuery,
  } = useClubOrganization();

  const [userId, setUserId] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [deeplinkAppId, setDeeplinkAppId] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    if (!orgId) return;
    const { data: appRows, error: appError } = await supabase
      .from("applications")
      .select("id, user_id, organization_id, status, current_step, applicant_message, created_at, last_message_at, priority, manual_name, manual_university, source")
      .eq("organization_id", orgId)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (appError) {
      console.error("applications fetch error:", appError);
      setApplications([]);
      return;
    }

    const appList = (appRows ?? []) as Omit<ApplicationWithProfile, "profiles">[];
    const userIds = [...new Set(appList.map((a) => a.user_id).filter(Boolean))] as string[];

    if (userIds.length === 0) {
      setApplications(appList.map((a) => ({ ...a, profiles: null })));
    } else {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, display_name, university, faculty, enrollment_year, email")
        .in("id", userIds);
      const profileMap = new Map<string, NonNullable<ApplicationWithProfile["profiles"]>>();
      for (const p of profileRows ?? []) {
        profileMap.set((p as { id: string }).id, p as NonNullable<ApplicationWithProfile["profiles"]>);
      }
      setApplications(
        appList.map((a) => ({
          ...a,
          profiles: a.user_id ? profileMap.get(a.user_id) ?? null : null,
        }))
      );
    }

    const appIds = appList.map((a) => a.id);
    if (appIds.length > 0) {
      const { data: unreadRows } = await supabase
        .from("application_messages")
        .select("application_id")
        .in("application_id", appIds)
        .eq("is_from_club", false)
        .is("read_at", null);
      const ids = [...new Set((unreadRows ?? []).map((r: { application_id: string }) => r.application_id))];
      setUnreadIds(new Set(ids));
    } else {
      setUnreadIds(new Set());
    }
  }, [orgId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (orgId) loadApplications();
  }, [orgId, loadApplications]);

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

  if (ctxLoading) {
    return (
      <div className="p-6 md:p-10 flex items-center justify-center min-h-[50vh]">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (!ctxLoading && (hasNoMemberships || !isReady || !orgId)) {
    return (
      <div className="p-6 md:p-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6 text-center">
          <p className="text-amber-800 dark:text-amber-200 font-medium">管理できる団体がありません</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">プロフィール編集で団体を登録してください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] md:h-[calc(100vh-0px)]">
      <header className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3 min-w-0">
          {selectedId && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="一覧に戻る"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">メッセージ</h1>
        </div>
        <Link
          href={withOrgQuery("/clubats")}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">group_work</span>
          採用管理（ATS）
        </Link>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* 左ペイン: 会話リスト */}
        <aside
          className={`shrink-0 w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {applications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
                メッセージ履歴はまだありません
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {applications.map((app) => {
                  const name = app.user_id && app.profiles
                    ? app.profiles.display_name?.trim() || "（名前なし）"
                    : app.manual_name?.trim() || "（名前なし）";
                  const sub = app.user_id && app.profiles
                    ? [app.profiles.university, app.profiles.faculty].filter(Boolean).join(" · ") || null
                    : app.manual_university || app.source || null;
                  const isSelected = app.id === selectedId;
                  const hasUnread = unreadIds.has(app.id);
                  return (
                    <li key={app.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(app.id)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                          isSelected ? "bg-primary/10 dark:bg-primary/20" : ""
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-400">
                            <span className="material-symbols-outlined text-xl">person</span>
                          </div>
                          {hasUnread && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3" title="未読あり">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{name}</p>
                          {sub && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
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
          className={`flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-800/30 ${
            selectedId ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedId && userId ? (
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="mb-2 flex items-center gap-2">
                <p className="font-medium text-slate-900 dark:text-white">
                  {selectedApp?.user_id && selectedApp?.profiles
                    ? selectedApp.profiles.display_name?.trim() || "（名前なし）"
                    : selectedApp?.manual_name?.trim() || "（名前なし）"}
                </p>
                {selectedApp?.source && selectedApp.source !== "ProofLoop" && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                    {selectedApp.source}
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <ChatRoom
                  applicationId={selectedId}
                  userId={userId}
                  viewerIsClub
                  onMarkedAsRead={handleMarkedAsRead}
                  placeholder="面接日程・Zoomリンク・合否連絡などを入力..."
                  fillHeight
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4 block">chat_bubble_outline</span>
                <p className="text-slate-500 dark:text-slate-400 font-medium">メッセージを選択してください</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">左のリストから会話を選ぶと、ここにチャットが表示されます</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

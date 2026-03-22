"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { ApplicationMessage } from "@/lib/types/application";
import MessageBubble from "@/components/MessageBubble";
import { fetchOrganizationOwnerUserId } from "@/lib/organizationMembers";

function firstJoin<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] ?? null) as T | null;
  return v as T;
}

function truncateSnippetForEmail(text: string, maxLen = 50): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}...`;
}

type OrgJoin = { name: string | null };

/**
 * メッセージ送信成功後に受信者へ通知メール（ベストエフォート・await しない）
 */
function fireChatEmailNotification(opts: {
  applicationId: string;
  viewerIsClub: boolean;
  senderUserId: string;
  messageContent: string;
}): void {
  const { applicationId, viewerIsClub, senderUserId, messageContent } = opts;
  const messageSnippet = truncateSnippetForEmail(messageContent, 50);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  void (async () => {
    try {
      const { data: appRow, error: appErr } = await supabase
        .from("applications")
        .select("user_id, organization_id, organizations ( name )")
        .eq("id", applicationId)
        .maybeSingle();

      if (appErr) {
        console.error(
          "chat notify: application fetch failed",
          appErr.message,
          appErr
        );
        return;
      }
      if (!appRow) {
        console.error("chat notify: application not found");
        return;
      }

      const org = firstJoin(appRow.organizations as OrgJoin | OrgJoin[] | null);
      const orgPk = appRow.organization_id as string;

      let recipientUserId: string | null = null;
      let senderName = "";
      let chatUrl = "";

      if (viewerIsClub) {
        recipientUserId = appRow.user_id ?? null;
        senderName = org?.name?.trim() || "団体";
        chatUrl = `${origin}/mypage/messages?app=${encodeURIComponent(applicationId)}`;
      } else {
        recipientUserId = await fetchOrganizationOwnerUserId(supabase, orgPk);
        chatUrl = `${origin}/clubmessages?orgId=${encodeURIComponent(orgPk)}&app=${encodeURIComponent(applicationId)}`;
        const { data: senderProfile, error: spErr } = await supabase
          .from("profiles")
          .select("full_name, display_name")
          .eq("id", senderUserId)
          .maybeSingle();
        if (spErr) {
          console.error(
            "chat notify: sender profile fetch failed",
            spErr.message
          );
        }
        const sp = senderProfile as {
          full_name?: string | null;
          display_name?: string | null;
        } | null;
        senderName =
          sp?.full_name?.trim() ||
          sp?.display_name?.trim() ||
          "学生";
      }

      if (!recipientUserId) {
        return;
      }

      const { data: recipientProfile, error: rpErr } = await supabase
        .from("profiles")
        .select("contact_email, full_name, display_name")
        .eq("id", recipientUserId)
        .maybeSingle();

      if (rpErr) {
        console.error(
          "chat notify: recipient profile fetch failed",
          rpErr.message
        );
        return;
      }
      if (!recipientProfile) return;

      const rp = recipientProfile as {
        contact_email: string | null;
        full_name: string | null;
        display_name: string | null;
      };

      const email = rp.contact_email?.trim();
      if (!email) return;

      const recipientName =
        rp.full_name?.trim() ||
        rp.display_name?.trim() ||
        "ユーザー";

      const res = await fetch("/api/emails/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          recipientName,
          senderName,
          messageSnippet,
          chatUrl,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error("chat notify email API failed", res.status, j);
      }
    } catch (e) {
      console.error("chat notify error", e);
    }
  })();
}

export interface ChatRoomProps {
  applicationId: string | null;
  userId: string;
  viewerIsClub: boolean;
  onMarkedAsRead?: (applicationId: string) => void;
  /** 送信プレースホルダー */
  placeholder?: string;
  /** 高さを親に任せる（Inbox用）。false なら固定 max-h */
  fillHeight?: boolean;
}

export default function ChatRoom({
  applicationId,
  userId,
  viewerIsClub,
  onMarkedAsRead,
  placeholder = "メッセージを入力...",
  fillHeight = false,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<ApplicationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const markAsRead = useCallback(
    async (appId: string) => {
      const { error } = await supabase
        .from("application_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("application_id", appId)
        .eq("is_from_club", viewerIsClub ? false : true)
        .is("read_at", null);
      if (!error) onMarkedAsRead?.(appId);
    },
    [viewerIsClub, onMarkedAsRead]
  );

  const loadMessages = useCallback(async (appId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("application_messages")
      .select("id, application_id, sender_id, is_from_club, content, created_at, read_at")
      .eq("application_id", appId)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("application_messages fetch error:", error);
      setMessages([]);
      return;
    }
    setMessages((data as ApplicationMessage[]) ?? []);
  }, []);

  useEffect(() => {
    if (!applicationId) {
      setMessages([]);
      setInput("");
      return;
    }
    loadMessages(applicationId);
    markAsRead(applicationId);
  }, [applicationId, loadMessages, markAsRead]);

  useEffect(() => {
    if (!applicationId) return;
    const channel = supabase
      .channel(`chatroom:${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "application_messages",
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const msg: ApplicationMessage = {
            id: row.id as string,
            application_id: row.application_id as string,
            sender_id: row.sender_id as string,
            is_from_club: row.is_from_club as boolean,
            content: row.content as string,
            created_at: row.created_at as string,
            read_at: (row.read_at as string) ?? null,
          };
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          const isFromOther = viewerIsClub ? !msg.is_from_club : msg.is_from_club;
          if (isFromOther) markAsRead(msg.application_id);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [applicationId, viewerIsClub, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId || !input.trim()) return;
    setSending(true);
    const trimmed = input.trim();
    try {
      const { error } = await supabase.from("application_messages").insert({
        application_id: applicationId,
        sender_id: userId,
        is_from_club: viewerIsClub,
        content: trimmed,
      });
      if (error) throw error;
      setInput("");
      toast.success("送信しました");
      fireChatEmailNotification({
        applicationId,
        viewerIsClub,
        senderUserId: userId,
        messageContent: trimmed,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  if (!applicationId) return null;

  const containerClass = fillHeight
    ? "flex flex-col min-h-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 overflow-hidden"
    : "flex flex-col rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30 overflow-hidden";
  const messagesClass = fillHeight
    ? "flex-1 min-h-0 overflow-y-auto p-3 space-y-2 overflow-x-hidden hide-scrollbar"
    : "max-h-64 overflow-y-auto p-3 space-y-2 overflow-x-hidden hide-scrollbar";

  return (
    <div className={containerClass}>
      <div className={messagesClass}>
        {loading ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6">読み込み中...</p>
        ) : messages.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6">まだメッセージはありません</p>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                isFromSelf={msg.is_from_club === viewerIsClub}
                content={msg.content}
                createdAt={msg.created_at}
              />
            ))}
            <div ref={messagesEndRef} aria-hidden />
          </>
        )}
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shrink-0 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary resize-none min-h-0"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="shrink-0 self-end p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="送信"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
            send
          </span>
        </button>
      </form>
    </div>
  );
}

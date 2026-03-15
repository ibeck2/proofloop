"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { ApplicationMessage } from "@/lib/types/application";
import MessageBubble from "@/components/MessageBubble";

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
    try {
      const { error } = await supabase.from("application_messages").insert({
        application_id: applicationId,
        sender_id: userId,
        is_from_club: viewerIsClub,
        content: input.trim(),
      });
      if (error) throw error;
      setInput("");
      toast.success("送信しました");
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

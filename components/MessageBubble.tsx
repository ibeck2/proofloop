"use client";

import MessageContent from "./MessageContent";

/**
 * LINE/Slack風の吹き出し。団体・学生どちらでも共通。
 * isFromSelf: 自分側（右・Primary）／相手側（左・グレー）
 */
export default function MessageBubble({
  isFromSelf,
  content,
  createdAt,
}: {
  isFromSelf: boolean;
  content: string;
  createdAt?: string | null;
}) {
  return (
    <div className={`flex ${isFromSelf ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
          isFromSelf
            ? "bg-ink text-paper rounded-br-md rounded-bl-2xl"
            : "bg-mist text-graphite border border-rule rounded-bl-md rounded-br-2xl"
        }`}
      >
        <MessageContent content={content} className="text-inherit" />
        <p className={`text-xs mt-1.5 ${isFromSelf ? "text-paper/80" : "text-graphite/70"}`}>
          {createdAt
            ? new Date(createdAt).toLocaleString("ja-JP", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </p>
      </div>
    </div>
  );
}

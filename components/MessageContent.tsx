"use client";

/**
 * メッセージ本文を表示し、URLをクリッカブルなリンクにするコンポーネント
 */
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export default function MessageContent({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  if (!content?.trim()) return <span className={className}>—</span>;

  const parts = content.split(URL_REGEX);
  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, i) =>
        part.startsWith("http://") || part.startsWith("https://") ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:opacity-80"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

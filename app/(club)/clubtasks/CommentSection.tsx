"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Textarea } from "@/components/ui";
import type { CommentRow } from "@/lib/types/task";
import { formatDateTime } from "@/lib/tasks/taskFormatting";

type Props = {
  taskId: string;
  memberNameById: Record<string, string>;
  onCommentAdded: () => void;
  readOnly?: boolean;
};

export default function CommentSection({
  taskId,
  memberNameById,
  onCommentAdded,
  readOnly = false,
}: Props) {
  const [items, setItems] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_comments")
      .select("id, task_id, organization_id, author_id, body, created_at")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("comments fetch error:", error);
      toast.error("コメントの読み込みに失敗しました");
      return;
    }
    setItems((data as CommentRow[]) ?? []);
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async () => {
    const body = newBody.trim();
    if (!body) return;
    setPosting(true);
    const { error } = await supabase.from("task_comments").insert({
      task_id: taskId,
      body,
    });
    setPosting(false);
    if (error) {
      console.error("comment insert error:", error);
      toast.error("コメントの投稿に失敗しました");
      return;
    }
    setNewBody("");
    await load();
    onCommentAdded();
  };

  return (
    <div>
      <label className="block text-sm font-bold text-ink mb-1">
        コメント・活動ログ
      </label>
      {loading ? (
        <p className="text-xs text-graphite/70">読み込み中...</p>
      ) : (
        <ul className="space-y-2 mb-2 max-h-48 overflow-y-auto">
          {items.length === 0 && (
            <li className="text-xs text-graphite/70">
              コメントはまだありません。
            </li>
          )}
          {items.map((item) => (
            <li
              key={item.id}
              className="text-sm border-b border-rule pb-2 last:border-b-0"
            >
              <p className="text-xs text-graphite/60 flex items-center gap-1 mb-0.5">
                <span className="font-medium text-ink">
                  {(item.author_id && memberNameById[item.author_id]) ||
                    "（元メンバー）"}
                </span>
                <span>・{formatDateTime(item.created_at)}</span>
              </p>
              <p className="text-ink whitespace-pre-wrap">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <>
          <Textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="コメントを追加"
            rows={2}
            disabled={posting}
            className="w-full border border-rule rounded-lg px-3 py-2 text-sm bg-paper text-ink mb-2"
          />
          <Button
            type="button"
            variant="outlineMuted"
            onClick={handlePost}
            disabled={posting || !newBody.trim()}
          >
            {posting ? "投稿中..." : "コメントを投稿"}
          </Button>
        </>
      )}
    </div>
  );
}

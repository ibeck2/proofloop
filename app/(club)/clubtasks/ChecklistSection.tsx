"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input } from "@/components/ui";
import type { ChecklistItemRow } from "@/lib/types/task";

type Props = {
  taskId: string;
  onCountChange: (taskId: string, done: number, total: number) => void;
};

function reportCounts(
  taskId: string,
  items: ChecklistItemRow[],
  onCountChange: Props["onCountChange"]
) {
  onCountChange(
    taskId,
    items.filter((i) => i.is_done).length,
    items.length
  );
}

export default function ChecklistSection({ taskId, onCountChange }: Props) {
  const [items, setItems] = useState<ChecklistItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_checklist_items")
      .select("id, task_id, organization_id, text, is_done, position, created_at")
      .eq("task_id", taskId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("checklist items fetch error:", error);
      toast.error("チェックリストの読み込みに失敗しました");
      return;
    }
    const rows = (data as ChecklistItemRow[]) ?? [];
    setItems(rows);
    reportCounts(taskId, rows, onCountChange);
  }, [taskId, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("task_checklist_items")
      .insert({ task_id: taskId, text, position: items.length })
      .select("id, task_id, organization_id, text, is_done, position, created_at")
      .single();
    setAdding(false);
    if (error || !data) {
      console.error("checklist item insert error:", error);
      toast.error("チェックリスト項目の追加に失敗しました");
      return;
    }
    const next = [...items, data as ChecklistItemRow];
    setItems(next);
    setNewText("");
    reportCounts(taskId, next, onCountChange);
  };

  const handleToggle = async (item: ChecklistItemRow) => {
    const next = items.map((i) =>
      i.id === item.id ? { ...i, is_done: !i.is_done } : i
    );
    setItems(next);
    reportCounts(taskId, next, onCountChange);

    const { error } = await supabase
      .from("task_checklist_items")
      .update({ is_done: !item.is_done })
      .eq("id", item.id);
    if (error) {
      console.error("checklist item update error:", error);
      toast.error("チェックリストの更新に失敗しました");
      void load();
    }
  };

  const handleDelete = async (item: ChecklistItemRow) => {
    const next = items.filter((i) => i.id !== item.id);
    setItems(next);
    reportCounts(taskId, next, onCountChange);

    const { error } = await supabase
      .from("task_checklist_items")
      .delete()
      .eq("id", item.id);
    if (error) {
      console.error("checklist item delete error:", error);
      toast.error("チェックリスト項目の削除に失敗しました");
      void load();
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-ink mb-1">
        チェックリスト
      </label>
      {loading ? (
        <p className="text-xs text-graphite/70">読み込み中...</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {items.length === 0 && (
            <li className="text-xs text-graphite/70">項目はまだありません。</li>
          )}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <label className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={item.is_done}
                  onChange={() => handleToggle(item)}
                  className="w-4 h-4 accent-ink shrink-0"
                />
                <span
                  className={`flex-1 text-sm ${
                    item.is_done ? "line-through text-graphite/50" : "text-ink"
                  }`}
                >
                  {item.text}
                </span>
              </label>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="p-1 text-graphite/50 hover:text-seal shrink-0"
                aria-label="削除"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="項目を追加"
          disabled={adding}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outlineMuted"
          onClick={handleAdd}
          disabled={adding || !newText.trim()}
          aria-label="項目を追加"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

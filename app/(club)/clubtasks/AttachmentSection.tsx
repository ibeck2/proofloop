"use client";

import { useCallback, useEffect, useState } from "react";
import { Paperclip, Trash2, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { AttachmentRow } from "@/lib/types/task";
import { formatFileSize } from "@/lib/tasks/taskFormatting";

type Props = {
  taskId: string;
  organizationId: string;
};

export default function AttachmentSection({ taskId, organizationId }: Props) {
  const [items, setItems] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("task_attachments")
      .select(
        "id, task_id, organization_id, uploaded_by, file_path, file_name, file_size, mime_type, created_at"
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error("attachments fetch error:", error);
      toast.error("添付ファイルの読み込みに失敗しました");
      return;
    }
    setItems((data as AttachmentRow[]) ?? []);
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const path = `${organizationId}/${taskId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("task-attachments")
      .upload(path, file);
    if (upErr) {
      console.error("attachment upload error:", upErr);
      toast.error("ファイルのアップロードに失敗しました");
      setUploading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("task_attachments").insert({
      task_id: taskId,
      uploaded_by: user?.id ?? null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type || null,
    });
    setUploading(false);
    if (insErr) {
      console.error("attachment insert error:", insErr);
      toast.error("添付情報の保存に失敗しました");
      await supabase.storage.from("task-attachments").remove([path]);
      return;
    }
    await load();
  };

  const handleOpen = async (item: AttachmentRow) => {
    const { data, error } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(item.file_path, 60);
    if (error || !data) {
      console.error("attachment signed url error:", error);
      toast.error("ファイルを開けませんでした");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const handleDelete = async (item: AttachmentRow) => {
    const { error } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", item.id);
    if (error) {
      console.error("attachment delete error:", error);
      toast.error("添付ファイルの削除に失敗しました");
      return;
    }
    await supabase.storage.from("task-attachments").remove([item.file_path]);
    await load();
  };

  return (
    <div>
      <label className="block text-sm font-bold text-ink mb-1">
        成果物・アウトプット
      </label>
      {loading ? (
        <p className="text-xs text-graphite/70">読み込み中...</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {items.length === 0 && (
            <li className="text-xs text-graphite/70">
              添付ファイルはまだありません。
            </li>
          )}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpen(item)}
                className="flex-1 flex items-center gap-2 min-w-0 text-left text-sm text-ink hover:underline"
              >
                <Paperclip
                  className="w-4 h-4 shrink-0 text-graphite/50"
                  aria-hidden="true"
                />
                <span className="truncate">{item.file_name}</span>
                <span className="text-xs text-graphite/50 shrink-0">
                  ({formatFileSize(item.file_size)})
                </span>
              </button>
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
      <label className="inline-flex items-center gap-2 text-sm border border-rule rounded-lg px-3 py-1.5 cursor-pointer hover:bg-mist w-fit">
        <Upload className="w-4 h-4" aria-hidden="true" />
        {uploading ? "アップロード中..." : "ファイルを追加"}
        <input
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button, Input, Textarea, Badge } from "@/components/ui";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

const MAX_CONTENT_LENGTH = 400;

const CATEGORY_OPTIONS = [
  { value: "新歓", label: "新歓" },
  { value: "授業", label: "授業" },
  { value: "飲食店", label: "飲食店" },
  { value: "イベント", label: "イベント" },
  { value: "その他", label: "その他" },
] as const;

type CategoryValue = (typeof CATEGORY_OPTIONS)[number]["value"];

type OrgPostRow = {
  id: string;
  organization_id: string;
  content: string;
  category: string | null;
  target_university: string | null;
  is_hidden: boolean | null;
  created_at: string;
};

function categoryBadgeClass(category: string | null): string {
  const c = category ?? "";
  switch (c) {
    case "新歓":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800";
    case "授業":
      return "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800";
    case "飲食店":
      return "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800";
    case "イベント":
      return "bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200 border-violet-200 dark:border-violet-800";
    default:
      return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600";
  }
}

function formatPostDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClubPostsPage() {
  const {
    loading: ctxLoading,
    activeOrgId: orgId,
    activeOrgName: orgName,
    hasNoMemberships,
    isReady,
  } = useClubOrganization();

  const [posts, setPosts] = useState<OrgPostRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [category, setCategory] = useState<CategoryValue>("新歓");
  const [targetUniversity, setTargetUniversity] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    if (!orgId) return;
    setListLoading(true);
    const { data, error } = await supabase
      .from("organization_posts")
      .select(
        "id, organization_id, content, category, target_university, is_hidden, created_at"
      )
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("organization_posts fetch:", error);
      toast.error("投稿の読み込みに失敗しました");
      setPosts([]);
    } else {
      setPosts((data as OrgPostRow[]) ?? []);
    }
    setListLoading(false);
  }, [orgId]);

  useEffect(() => {
    if (orgId) loadPosts();
  }, [orgId, loadPosts]);

  const openModal = () => {
    setCategory("新歓");
    setTargetUniversity("");
    setContent("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    const body = content.trim();
    if (!body) {
      toast.error("本文を入力してください");
      return;
    }
    if (body.length > MAX_CONTENT_LENGTH) {
      toast.error(`本文は${MAX_CONTENT_LENGTH}文字以内にしてください`);
      return;
    }

    const target = targetUniversity.trim();
    setSubmitting(true);
    try {
      const { error } = await supabase.from("organization_posts").insert({
        organization_id: orgId,
        content: body,
        category,
        target_university: target.length > 0 ? target : null,
        is_hidden: false,
      });

      if (error) {
        toast.error(error.message || "投稿に失敗しました");
        return;
      }

      toast.success("投稿しました");
      setModalOpen(false);
      setContent("");
      setTargetUniversity("");
      await loadPosts();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!orgId) return;
    if (!window.confirm("この投稿を削除しますか？取り消せません。")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("organization_posts")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId);

      if (error) {
        toast.error(error.message || "削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      await loadPosts();
    } finally {
      setDeletingId(null);
    }
  };

  const contentLen = content.length;

  if (ctxLoading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  if (hasNoMemberships || !isReady || !orgId) {
    return (
      <div className="p-6 lg:p-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-6 text-center max-w-xl">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            管理できる団体がありません
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-10">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-primary dark:text-white text-2xl font-bold tracking-tight">
            タイムライン投稿
          </h1>
          {orgName && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              {orgName}
            </p>
          )}
        </div>
        <Button
          type="button"
          className="bg-primary text-white shrink-0 inline-flex items-center gap-2"
          onClick={openModal}
        >
          <span className="material-symbols-outlined text-lg">add</span>
          新規投稿
        </Button>
      </header>

      {listLoading ? (
        <p className="text-slate-500 text-sm">読み込み中...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-10 text-center text-slate-500 text-sm">
          まだ投稿がありません。「＋ 新規投稿」から最初の投稿を作成できます。
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <time
                  className="text-xs text-slate-500 dark:text-slate-400"
                  dateTime={post.created_at}
                >
                  {formatPostDate(post.created_at)}
                </time>
                <Badge
                  className={`text-xs font-bold border ${categoryBadgeClass(post.category)}`}
                >
                  {post.category || "（未分類）"}
                </Badge>
                {post.is_hidden ? (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    非表示
                  </span>
                ) : null}
              </div>
              <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {post.content}
              </p>
              {post.target_university?.trim() ? (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  ターゲット大学: {post.target_university.trim()}
                </p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 text-sm"
                  disabled={deletingId === post.id}
                  onClick={() => handleDelete(post.id)}
                >
                  {deletingId === post.id ? "削除中..." : "削除"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="post-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white mb-4"
            >
              新規投稿
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="post-category"
                  className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  カテゴリー
                </label>
                <select
                  id="post-category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as CategoryValue)
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-none px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="post-target-uni"
                  className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  ターゲット大学（任意）
                </label>
                <Input
                  id="post-target-uni"
                  type="text"
                  value={targetUniversity}
                  onChange={(e) => setTargetUniversity(e.target.value)}
                  placeholder="例: 東京大学 ※空欄で全大学に公開"
                  className="w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="post-content"
                  className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  本文 <span className="text-red-600">*</span>
                </label>
                <Textarea
                  id="post-content"
                  value={content}
                  onChange={(e) =>
                    setContent(
                      e.target.value.slice(0, MAX_CONTENT_LENGTH)
                    )
                  }
                  rows={6}
                  required
                  placeholder="タイムラインに表示する内容を入力..."
                  className="min-h-[140px]"
                />
                <div className="flex justify-end mt-1">
                  <span
                    className={`text-xs tabular-nums ${
                      contentLen >= MAX_CONTENT_LENGTH
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : "text-slate-500"
                    }`}
                  >
                    {contentLen}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={closeModal}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-white"
                  disabled={submitting || !content.trim()}
                >
                  {submitting ? "送信中..." : "投稿する"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

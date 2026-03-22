"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { formatRelativeTime } from "@/lib/format";
import { normalizeJoinedRow } from "@/lib/organizationMembers";

const FILTERS = [
  { value: "すべて", label: "すべて" },
  { value: "新歓", label: "新歓" },
  { value: "授業", label: "授業" },
  { value: "飲食店", label: "飲食店" },
  { value: "イベント", label: "イベント" },
  { value: "その他", label: "その他" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

type OrgSummary = {
  id: string;
  name: string | null;
  logo_url: string | null;
  university: string | null;
};

type PostRow = {
  id: string;
  organization_id: string;
  content: string;
  category: string | null;
  target_university: string | null;
  created_at: string;
  organizations: OrgSummary | OrgSummary[] | null;
};

function categoryPillClass(cat: string): string {
  switch (cat) {
    case "新歓":
      return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800";
    case "授業":
      return "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
    case "飲食店":
      return "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800";
    case "イベント":
      return "bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600";
  }
}

function targetUniversityLabel(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.endsWith("大学")) return `${t}向け`;
  return `${t}向け`;
}

export default function TimelinePage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>("すべて");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [likeBusyId, setLikeBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("organization_posts")
      .select(
        `
        id,
        organization_id,
        content,
        category,
        target_university,
        created_at,
        organizations (
          id,
          name,
          logo_url,
          university
        )
      `
      )
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    if (filter !== "すべて") {
      q = q.eq("category", filter);
    }

    const { data, error } = await q;

    if (error) {
      console.error("timeline posts:", error);
      toast.error("投稿の読み込みに失敗しました");
      setPosts([]);
      setLoading(false);
      return;
    }

    setPosts((data ?? []) as PostRow[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const postIds = posts.map((p) => p.id);
    if (postIds.length === 0) {
      setLikeCounts({});
      setLikedPostIds(new Set());
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data: likeRows, error: likeErr } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      if (cancelled) return;

      if (likeErr) {
        console.error("post_likes:", likeErr);
        setLikeCounts({});
        setLikedPostIds(new Set());
        return;
      }

      const counts: Record<string, number> = {};
      const liked = new Set<string>();
      for (const row of likeRows ?? []) {
        const pid = (row as { post_id: string }).post_id;
        counts[pid] = (counts[pid] ?? 0) + 1;
        if (userId && (row as { user_id: string }).user_id === userId) {
          liked.add(pid);
        }
      }
      setLikeCounts(counts);
      setLikedPostIds(liked);
    })();

    return () => {
      cancelled = true;
    };
  }, [posts, userId]);

  const handleToggleLike = async (postId: string) => {
    if (!userId) {
      toast.error("いいねするにはログインが必要です");
      router.push("/login");
      return;
    }

    const liked = likedPostIds.has(postId);
    setLikeBusyId(postId);
    try {
      if (liked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) {
          toast.error(error.message || "いいねの解除に失敗しました");
          return;
        }
        setLikedPostIds((prev) => {
          const n = new Set(prev);
          n.delete(postId);
          return n;
        });
        setLikeCounts((prev) => ({
          ...prev,
          [postId]: Math.max(0, (prev[postId] ?? 1) - 1),
        }));
      } else {
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: userId,
        });
        if (error) {
          if (error.code === "23505") {
            setLikedPostIds((prev) => new Set(prev).add(postId));
            return;
          }
          toast.error(error.message || "いいねに失敗しました");
          return;
        }
        setLikedPostIds((prev) => new Set(prev).add(postId));
        setLikeCounts((prev) => ({
          ...prev,
          [postId]: (prev[postId] ?? 0) + 1,
        }));
      }
    } finally {
      setLikeBusyId(null);
    }
  };

  const filteredEmpty = useMemo(
    () => !loading && posts.length === 0,
    [loading, posts.length]
  );

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-background-dark pb-24 md:pb-8">
      <div className="max-w-xl mx-auto px-4 py-6 md:py-8">
        <header className="mb-6">
          <h1 className="text-primary dark:text-white text-2xl font-bold font-display tracking-tight">
            タイムライン
          </h1>
          <p className="text-text-sub dark:text-slate-400 text-sm mt-1">
            団体からの新着情報・お知らせ
          </p>
        </header>

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-white dark:bg-slate-900 text-text-grey border-slate-200 dark:border-slate-700 hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-center text-slate-500 text-sm py-12">読み込み中...</p>
        ) : filteredEmpty ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-10 text-center text-slate-500 text-sm">
            該当する投稿がありません
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {posts.map((post) => {
              const org = normalizeJoinedRow<OrgSummary>(post.organizations);
              const orgName = org?.name?.trim() || "団体";
              const targetBadge = targetUniversityLabel(post.target_university);
              const count = likeCounts[post.id] ?? 0;
              const liked = likedPostIds.has(post.id);
              const busy = likeBusyId === post.id;

              return (
                <li
                  key={post.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="p-4 pb-3">
                    <div className="flex gap-3">
                      <Link
                        href={`/organizations/${org?.id ?? post.organization_id}`}
                        className="shrink-0"
                      >
                        {org?.logo_url ? (
                          <img
                            src={org.logo_url}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover bg-slate-100 border border-slate-200"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-primary/10 border border-slate-200 flex items-center justify-center text-primary font-bold text-sm">
                            {orgName.slice(0, 1)}
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            href={`/organizations/${org?.id ?? post.organization_id}`}
                            className="font-bold text-slate-900 dark:text-white text-sm hover:text-primary truncate"
                          >
                            {orgName}
                          </Link>
                          <span className="text-slate-400 text-xs">·</span>
                          <time
                            className="text-xs text-slate-500 dark:text-slate-400 shrink-0"
                            dateTime={post.created_at}
                          >
                            {formatRelativeTime(post.created_at)}
                          </time>
                        </div>
                        {post.category ? (
                          <span
                            className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryPillClass(post.category)}`}
                          >
                            {post.category}
                          </span>
                        ) : null}
                        {targetBadge ? (
                          <span className="inline-block mt-2 ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            {targetBadge}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                  </div>
                  <footer className="flex items-center gap-1 px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleLike(post.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      aria-pressed={liked}
                      aria-label={liked ? "いいねを取り消す" : "いいねする"}
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={{
                          fontVariationSettings: liked
                            ? "'FILL' 1, 'wght' 600"
                            : "'FILL' 0, 'wght' 400",
                          color: liked ? "#e11d48" : undefined,
                        }}
                      >
                        favorite
                      </span>
                      <span className="tabular-nums text-rose-700 dark:text-rose-300">
                        {count}
                      </span>
                    </button>
                  </footer>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

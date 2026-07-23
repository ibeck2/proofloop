"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatRelativeTime } from "@/lib/format";
import { normalizeJoinedRow } from "@/lib/organizationMembers";
import {
  TIMELINE_CATEGORIES,
  type TimelineCategoryValue,
  getTimelineCategoryMeta,
} from "@/lib/timelineCategories";

const FILTERS = [
  { value: "all", label: "すべて", icon: "🧭" },
  ...TIMELINE_CATEGORIES,
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

// カテゴリはタグであって優劣・警告ではないため、色相では区別しない（ルール2.1）。
// 全カテゴリ同一のトークンを返す。
function categoryPillClass(cat: string): string {
  switch (cat) {
    case "recruitment":
      return "bg-mist text-ink border-rule";
    case "campus_life":
      return "bg-mist text-ink border-rule";
    case "event":
      return "bg-mist text-ink border-rule";
    case "report":
      return "bg-mist text-ink border-rule";
    default:
      return "bg-mist text-ink border-rule";
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
  const [filter, setFilter] = useState<FilterValue>("all");
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

    if (filter !== "all") {
      q = q.eq("category", filter as TimelineCategoryValue);
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
    <div className="min-h-screen bg-mist pb-24 md:pb-8">
      <div className="max-w-xl mx-auto px-4 py-6 md:py-8">
        <header className="mb-6">
          <h1 className="text-ink text-2xl font-bold font-mincho tracking-tight">
            タイムライン
          </h1>
          <p className="font-body text-graphite/70 text-sm mt-1">
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
                className={`px-3 py-1.5 rounded-full text-xs font-bold font-body border transition-colors ${
                  active
                    ? "bg-ink text-paper border-ink"
                    : "bg-paper text-graphite border-rule hover:border-ink/40"
                }`}
              >
                {f.icon} {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p className="text-center font-body text-graphite/70 text-sm py-12">読み込み中...</p>
        ) : filteredEmpty ? (
          <div className="rounded-xl border border-dashed border-rule bg-paper/60 p-10 text-center font-body text-graphite/70 text-sm">
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
                  className="bg-paper border border-rule rounded-xl shadow-sm overflow-hidden"
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
                            className="w-11 h-11 rounded-full object-cover bg-mist border border-rule"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-mist border border-rule flex items-center justify-center text-ink font-bold text-sm">
                            {orgName.slice(0, 1)}
                          </div>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link
                            href={`/organizations/${org?.id ?? post.organization_id}`}
                            className="font-bold font-body text-graphite text-sm hover:text-ink truncate"
                          >
                            {orgName}
                          </Link>
                          <span className="text-graphite/70 text-xs">·</span>
                          <time
                            className="text-xs font-body text-graphite/70 shrink-0"
                            dateTime={post.created_at}
                          >
                            {formatRelativeTime(post.created_at)}
                          </time>
                        </div>
                        {post.category ? (() => {
                          const meta = getTimelineCategoryMeta(post.category);
                          if (!meta) return null;
                          return (
                            <span
                              className={`inline-block mt-2 text-[10px] font-bold font-body px-2 py-0.5 rounded-full border ${categoryPillClass(post.category)}`}
                            >
                              {meta.icon} {meta.label}
                            </span>
                          );
                        })() : null}
                        {targetBadge ? (
                          <span className="inline-block mt-2 ml-2 text-[10px] font-bold font-body px-2 py-0.5 rounded-full bg-mist text-graphite border border-rule">
                            {targetBadge}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-3 font-body text-graphite text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                  </div>
                  <footer className="flex items-center gap-1 px-4 py-2 border-t border-rule bg-mist/80">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleLike(post.id)}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-bold font-body text-graphite hover:bg-paper transition-colors disabled:opacity-50"
                      aria-pressed={liked}
                      aria-label={liked ? "いいねを取り消す" : "いいねする"}
                    >
                      <Heart
                        className={`w-[22px] h-[22px] ${liked ? "text-ink" : "text-graphite/70"}`}
                        aria-hidden="true"
                        fill={liked ? "currentColor" : "none"}
                      />
                      <span className={`tabular-nums font-numeric ${liked ? "text-ink" : "text-graphite/70"}`}>
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

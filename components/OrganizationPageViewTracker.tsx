"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Strict Mode の二重マウントで同一 org に短時間で二度送らないためのモジュール単位デデュープ
 */
const recentTrackAt = new Map<string, number>();
const DEDUPE_MS = 2000;

type Props = {
  organizationId: string;
};

/**
 * 団体詳細ページの閲覧を 1 セッション相当で 1 回だけ記録（fire-and-forget）
 */
export default function OrganizationPageViewTracker({ organizationId }: Props) {
  useEffect(() => {
    if (!organizationId) return;

    const now = Date.now();
    const last = recentTrackAt.get(organizationId) ?? 0;
    if (now - last < DEDUPE_MS) return;
    recentTrackAt.set(organizationId, now);

    let cancelled = false;

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const viewerId = session?.user?.id ?? null;

        let viewerUniversity: string | null = null;
        if (viewerId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("university")
            .eq("id", viewerId)
            .maybeSingle();
          if (!cancelled && profile && typeof (profile as { university?: string }).university === "string") {
            const u = (profile as { university: string }).university.trim();
            viewerUniversity = u.length > 0 ? u : null;
          }
        }

        if (cancelled) return;

        supabase
          .from("organization_page_views")
          .insert({
            organization_id: organizationId,
            viewer_id: viewerId,
            viewer_university: viewerUniversity,
          })
          .then(({ error }) => {
            if (error) console.error("organization_page_views insert:", error);
          });
      } catch (e) {
        console.error("OrganizationPageViewTracker:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return null;
}

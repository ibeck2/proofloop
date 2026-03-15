"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function useSavedOrganizations(): {
  savedOrgIds: string[];
  toggle: (organizationId: string) => Promise<void>;
  loading: boolean;
  togglingId: string | null;
} {
  const [savedOrgIds, setSavedOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user?.id) {
        setSavedOrgIds([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("saved_organizations")
        .select("organization_id")
        .eq("user_id", session.user.id);
      if (cancelled) return;
      if (error) {
        console.error("saved_organizations fetch error:", error);
        setSavedOrgIds([]);
      } else {
        setSavedOrgIds((data ?? []).map((r: { organization_id: string }) => r.organization_id));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async (organizationId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      toast.error("お気に入りに追加するにはログインしてください");
      return;
    }
    setTogglingId(organizationId);
    const isSaved = savedOrgIds.includes(organizationId);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_organizations")
          .delete()
          .eq("user_id", session.user.id)
          .eq("organization_id", organizationId);
        if (error) throw error;
        setSavedOrgIds((prev) => prev.filter((id) => id !== organizationId));
        toast.success("お気に入りから削除しました");
      } else {
        const { error } = await supabase.from("saved_organizations").insert({
          user_id: session.user.id,
          organization_id: organizationId,
        });
        if (error) throw error;
        setSavedOrgIds((prev) => [...prev, organizationId]);
        toast.success("お気に入りに追加しました");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "お気に入りの更新に失敗しました");
    } finally {
      setTogglingId(null);
    }
  }, [savedOrgIds]);

  return { savedOrgIds, toggle, loading, togglingId };
}

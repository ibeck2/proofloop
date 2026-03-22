"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  fetchMyOrganizationMemberships,
  withOrgIdQuery,
  type OrganizationMembership,
} from "@/lib/organizationMembers";

type ClubOrganizationContextValue = {
  /** 読み込み中（メンバーシップ取得） */
  loading: boolean;
  /** メンバーシップ一覧 */
  memberships: OrganizationMembership[];
  /** URL または先頭所属から解決した現在の団体 ID */
  activeOrgId: string | null;
  /** 現在の団体の表示名 */
  activeOrgName: string | null;
  /** 現在の団体でのロール */
  activeRole: string | null;
  /** メンバーシップが0件で確定した */
  hasNoMemberships: boolean;
  /** activeOrgId が利用可能（所属ありかつ解決済み） */
  isReady: boolean;
  withOrgQuery: (path: string) => string;
  refreshMemberships: () => Promise<void>;
};

const ClubOrganizationContext = createContext<ClubOrganizationContextValue | null>(
  null
);

export function ClubOrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);

  const refreshMemberships = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) {
      setMemberships([]);
      setLoading(false);
      return;
    }
    const { data, error } = await fetchMyOrganizationMemberships(supabase, uid);
    if (error) {
      console.error("organization_members fetch error:", error);
      setMemberships([]);
    } else {
      setMemberships(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshMemberships();
  }, [refreshMemberships]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshMemberships();
      }
    };
    const onFocus = () => {
      void refreshMemberships();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshMemberships]);

  const orgIdParam = searchParams.get("orgId");

  const activeOrgId = useMemo(() => {
    if (memberships.length === 0) return null;
    if (orgIdParam && memberships.some((m) => m.organizationId === orgIdParam)) {
      return orgIdParam;
    }
    return memberships[0].organizationId;
  }, [memberships, orgIdParam]);

  const activeMembership = useMemo(
    () => memberships.find((m) => m.organizationId === activeOrgId) ?? null,
    [memberships, activeOrgId]
  );

  const activeOrgName = activeMembership?.organization?.name?.trim() ?? null;
  const activeRole = activeMembership?.role ?? null;

  const hasNoMemberships = !loading && memberships.length === 0;

  const isReady = !loading && memberships.length > 0 && !!activeOrgId;

  /** URL の orgId が無効または欠落しているとき、正しい orgId で置き換え */
  useEffect(() => {
    if (loading || memberships.length === 0) return;
    const first = memberships[0].organizationId;
    const param = searchParams.get("orgId");
    const valid = param && memberships.some((m) => m.organizationId === param);
    if (!valid) {
      const next = `${pathname}?orgId=${encodeURIComponent(first)}`;
      router.replace(next);
    }
  }, [loading, memberships, pathname, router, searchParams]);

  const withOrgQuery = useCallback(
    (path: string) => withOrgIdQuery(path, activeOrgId),
    [activeOrgId]
  );

  const value = useMemo<ClubOrganizationContextValue>(
    () => ({
      loading,
      memberships,
      activeOrgId,
      activeOrgName,
      activeRole,
      hasNoMemberships,
      isReady,
      withOrgQuery,
      refreshMemberships,
    }),
    [
      loading,
      memberships,
      activeOrgId,
      activeOrgName,
      activeRole,
      hasNoMemberships,
      isReady,
      withOrgQuery,
      refreshMemberships,
    ]
  );

  return (
    <ClubOrganizationContext.Provider value={value}>
      {children}
    </ClubOrganizationContext.Provider>
  );
}

export function useClubOrganization(): ClubOrganizationContextValue {
  const ctx = useContext(ClubOrganizationContext);
  if (!ctx) {
    throw new Error("useClubOrganization must be used within ClubOrganizationProvider");
  }
  return ctx;
}

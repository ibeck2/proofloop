"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Input, Button } from "@/components/ui";
import SearchOrgCard from "@/components/SearchOrgCard";
import { useSavedOrganizations } from "@/hooks/useSavedOrganizations";
import type { ApplicationWithOrg } from "@/lib/types/application";
import ChatRoom from "@/components/ChatRoom";
import {
  fetchMyOrganizationMemberships,
  type OrganizationMembership,
} from "@/lib/organizationMembers";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name?: string | null;
  full_name?: string | null;
  university: string | null;
  faculty: string | null;
  enrollment_year?: string | null;
  admission_year?: string | null;
  graduation_year?: string | null;
  contact_email?: string | null;
};

const ADMISSION_YEAR_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "2026", label: "2026年度" },
  { value: "2025", label: "2025年度" },
  { value: "2024", label: "2024年度" },
  { value: "2023", label: "2023年度" },
  { value: "2022", label: "2022年度" },
];

const GRADUATION_YEAR_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "2030", label: "2030年度" },
  { value: "2029", label: "2029年度" },
  { value: "2028", label: "2028年度" },
  { value: "2027", label: "2027年度" },
  { value: "2026", label: "2026年度" },
];

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

type OrgRow = {
  id: string;
  name: string | null;
  university: string | null;
  category: string | null;
};

type SavedOrgRow = {
  id: string;
  name: string | null;
  university: string | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  member_count: string | null;
  activity_frequency: string | null;
  is_intercollege: boolean | null;
  target_grades: string | null;
  selection_process: string | null;
};

type SavedEventWithDetails = {
  id: string;
  title: string | null;
  event_date: string;
  location: string | null;
  description: string | null;
  organization_id: string;
  organizations: { name: string | null } | null;
};

export default function MypagePage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<OrgRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedEvents, setSavedEvents] = useState<SavedEventWithDetails[]>([]);
  const [savedEventsLoading, setSavedEventsLoading] = useState(false);
  const [savedOrgs, setSavedOrgs] = useState<SavedOrgRow[]>([]);
  const [savedOrgsLoading, setSavedOrgsLoading] = useState(false);
  const [entryApplications, setEntryApplications] = useState<ApplicationWithOrg[]>([]);
  const [entryApplicationsLoading, setEntryApplicationsLoading] = useState(false);
  const [messageModalApp, setMessageModalApp] = useState<ApplicationWithOrg | null>(null);
  const [unreadApplicationIds, setUnreadApplicationIds] = useState<Set<string>>(new Set());
  const { toggle: toggleSavedOrg } = useSavedOrganizations();
  // Admin request (団体管理者権限の申請)
  const [adminRequestModalOpen, setAdminRequestModalOpen] = useState(false);
  const [adminRequestMode, setAdminRequestMode] = useState<"existing" | "new">("existing");
  const [adminTargetOrg, setAdminTargetOrg] = useState<OrgRow | null>(null);
  const [adminSnsType, setAdminSnsType] = useState<string>("X (旧Twitter)");
  const [adminProofLink, setAdminProofLink] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgUniversity, setNewOrgUniversity] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [pendingAdminOrgIds, setPendingAdminOrgIds] = useState<Set<string>>(new Set());
  const [managedMemberships, setManagedMemberships] = useState<OrganizationMembership[]>([]);

  const handleMarkedAsRead = useCallback((applicationId: string) => {
    setUnreadApplicationIds((prev) => {
      const n = new Set(prev);
      n.delete(applicationId);
      return n;
    });
  }, []);

  const closeMessageModal = useCallback(() => {
    setMessageModalApp(null);
  }, []);

  const openMessageModal = useCallback((app: ApplicationWithOrg) => {
    setMessageModalApp(app);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !authUser) {
        setIsLoading(false);
        return;
      }
      setUserId(authUser.id);

      const authEmail =
        authUser.email?.trim() ||
        (typeof authUser.new_email === "string" ? authUser.new_email.trim() : "") ||
        "";
      setUserEmail(authEmail);

      const metaName =
        (authUser.user_metadata?.full_name as string | undefined)?.trim() ||
        (authUser.user_metadata?.name as string | undefined)?.trim() ||
        "";

      try {
        const { data: userRows, error: userError } = await supabase
          .from("users")
          .select("id, name, email, role")
          .eq("id", authUser.id)
          .limit(1);
        if (cancelled) return;
        if (!userError && userRows?.length) {
          const row = userRows[0] as UserRow;
          setUserName(row.name?.trim() || metaName || null);
        } else {
          setUserName(metaName || null);
        }
      } catch {
        if (!cancelled) setUserName(metaName || null);
      }

      // 006 の必須カラムのみ select（存在しない列を指定するとクエリ全体が失敗する）
      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, email, display_name, university, faculty, enrollment_year")
        .eq("id", authUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileRow) {
        const p = profileRow as ProfileRow;
        setFullName(
          String(p.display_name ?? metaName ?? "").trim() || metaName
        );
        setUniversity(p.university ?? "");
        setFaculty(p.faculty ?? "");
        setAdmissionYear(p.enrollment_year ?? p.admission_year ?? "");
        setGraduationYear(p.graduation_year ?? "");
        setContactEmail((p.contact_email ?? "").trim() || authEmail);
        if (authEmail && !(p.email ?? "").trim()) {
          setUserEmail(authEmail);
        }
      } else {
        // 未登録、または取得エラー時は認証情報でフォールバック（保存時に upsert で新規作成可能）
        setFullName(metaName);
        setUniversity("");
        setFaculty("");
        setAdmissionYear("");
        setGraduationYear("");
        setContactEmail(authEmail);
        const msg =
          profileError &&
          typeof profileError === "object" &&
          ("message" in profileError || "code" in profileError)
            ? String(
                (profileError as { message?: string; code?: string }).message ||
                  (profileError as { code?: string }).code ||
                  ""
              ).trim()
            : "";
        if (msg) {
          console.warn("mypage profiles fetch:", msg);
        }
      }

      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadManagedMemberships = useCallback(async () => {
    if (!userId) {
      setManagedMemberships([]);
      return;
    }
    const { data, error } = await fetchMyOrganizationMemberships(supabase, userId);
    if (error) {
      console.warn("mypage: organization memberships:", error.message);
    }
    setManagedMemberships(data);
  }, [userId]);

  useEffect(() => {
    void loadManagedMemberships();
  }, [loadManagedMemberships]);

  // 別タブで承認された直後など、フォーカス復帰時に所属を再取得
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && userId) {
        void loadManagedMemberships();
      }
    };
    const onFocus = () => {
      if (userId) void loadManagedMemberships();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, loadManagedMemberships]);

  useEffect(() => {
    if (!userId) {
      setSavedEvents([]);
      return;
    }
    let cancelled = false;
    setSavedEventsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("saved_events")
        .select(
          `
          event_id,
          events (
            id,
            title,
            event_date,
            location,
            description,
            organization_id,
            organizations ( name )
          )
        `
        )
        .eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        console.error("saved_events fetch error:", error);
        setSavedEvents([]);
        setSavedEventsLoading(false);
        return;
      }
      const list: SavedEventWithDetails[] = [];
      for (const row of data ?? []) {
        const ev = (row as { events: SavedEventWithDetails | null }).events;
        if (ev && typeof ev === "object" && ev.id) list.push(ev);
      }
      setSavedEvents(list);
      setSavedEventsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSavedOrgs([]);
      return;
    }
    let cancelled = false;
    setSavedOrgsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("saved_organizations")
        .select(
          `
          organization_id,
          organizations (
            id,
            name,
            university,
            category,
            description,
            logo_url,
            member_count,
            activity_frequency,
            is_intercollege,
            target_grades,
            selection_process
          )
        `
        )
        .eq("user_id", userId);
      if (cancelled) return;
      if (error) {
        console.error("saved_organizations fetch error:", error);
        setSavedOrgs([]);
        setSavedOrgsLoading(false);
        return;
      }
      const list: SavedOrgRow[] = [];
      for (const row of data ?? []) {
        const o = (row as { organizations: SavedOrgRow | null }).organizations;
        if (o && typeof o === "object" && o.id) list.push(o);
      }
      setSavedOrgs(list);
      setSavedOrgsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setEntryApplications([]);
      return;
    }
    let cancelled = false;
    setEntryApplicationsLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          `
          id,
          user_id,
          organization_id,
          status,
          current_step,
          applicant_message,
          created_at,
          organizations (
            id,
            name,
            university,
            category,
            logo_url
          )
        `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("applications fetch error:", error);
        setEntryApplications([]);
        setEntryApplicationsLoading(false);
        return;
      }
      const list: ApplicationWithOrg[] = (data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        organization_id: row.organization_id,
        status: row.status,
        current_step: row.current_step ?? "",
        applicant_message: row.applicant_message,
        created_at: row.created_at,
        organizations: row.organizations ?? null,
      }));
      setEntryApplications(list);
      setEntryApplicationsLoading(false);

      const appIds = list.map((a) => a.id);
      if (appIds.length > 0) {
        const { data: unreadRows } = await supabase
          .from("application_messages")
          .select("application_id")
          .in("application_id", appIds)
          .eq("is_from_club", true)
          .is("read_at", null);
        const ids = [...new Set((unreadRows ?? []).map((r: { application_id: string }) => r.application_id))];
        setUnreadApplicationIds(new Set(ids));
      } else {
        setUnreadApplicationIds(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const displayNameLabel = useMemo(() => {
    const fromUsers = userName?.trim() ?? "";
    const fromProfile = fullName.trim();
    const fromEmail =
      userEmail.includes("@") ? userEmail.split("@")[0].trim() : userEmail.trim();
    return fromUsers || fromProfile || fromEmail || "ゲスト";
  }, [userName, fullName, userEmail]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) {
        console.error("Profile save error (auth):", authErr);
        toast.error(authErr.message || "ログイン情報を取得できませんでした");
        return;
      }
      const authUser = authData.user;
      if (!authUser?.id) {
        console.error("Profile save error: no user id on session");
        toast.error("ログイン情報を取得できませんでした");
        return;
      }

      // 主キーは必ず現在のセッションのユーザー ID（state の userId とズレないようにする）
      const profileId = authUser.id;
      const sessionEmail = authUser.email?.trim() || "";
      const emailForProfile = sessionEmail || userEmail.trim() || null;
      const contact = contactEmail.trim() || emailForProfile || null;
      const nameTrim = fullName.trim() || null;

      // 006_profiles_table.sql のカラム（必ず存在）
      const basePayload: Record<string, unknown> = {
        id: profileId,
        email: emailForProfile,
        display_name: nameTrim,
        university: university.trim() || null,
        faculty: faculty.trim() || null,
        enrollment_year: admissionYear.trim() || null,
      };

      // 019_profiles_extend_columns.sql 適用後に追加される列
      const fullPayload: Record<string, unknown> = {
        ...basePayload,
        full_name: nameTrim,
        contact_email: contact,
        admission_year: admissionYear.trim() || null,
        graduation_year: graduationYear.trim() || null,
        updated_at: new Date().toISOString(),
      };

      console.log("🚀 Upsert Payload (trying full):", fullPayload);

      let upsertError = (await supabase.from("profiles").upsert(fullPayload, { onConflict: "id" }))
        .error;

      if (upsertError) {
        const msg = (upsertError.message || "").toLowerCase();
        const likelyMissingColumn =
          msg.includes("column") ||
          msg.includes("does not exist") ||
          msg.includes("schema cache") ||
          upsertError.code === "PGRST204";

        if (likelyMissingColumn) {
          console.warn(
            "profiles: full payload failed, retrying with 006 base columns only:",
            JSON.stringify(upsertError),
            upsertError
          );
          console.log("🚀 Upsert Payload (fallback base):", basePayload);
          upsertError = (await supabase.from("profiles").upsert(basePayload, { onConflict: "id" }))
            .error;
        }
      }

      if (upsertError) {
        console.error(
          "Profile save error:",
          JSON.stringify(upsertError),
          upsertError
        );
        toast.error(
          typeof upsertError.message === "string" && upsertError.message
            ? upsertError.message
            : "保存に失敗しました"
        );
        return;
      }

      if (profileId !== userId) {
        setUserId(profileId);
      }
      if (emailForProfile && userEmail !== emailForProfile) {
        setUserEmail(emailForProfile);
      }
      toast.success("プロフィールを保存しました");
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const runSearch = useCallback(async () => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setSearchResults([]);
      setPendingAdminOrgIds(new Set());
      setHasSearched(true);
      return;
    }
    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data: rows, error } = await supabase
        .from("organizations")
        .select("id, name, university, category")
        .ilike("name", `%${keyword}%`)
        .limit(20);
      if (error) throw error;
      const list = (rows as OrgRow[]) ?? [];
      setSearchResults(list);

      // 申請中（pending）の団体を先に取得して、ボタンを無効化する（可能な場合のみ）
      if (userId) {
        const orgIds = list.map((o) => o.id);
        if (orgIds.length === 0) {
          setPendingAdminOrgIds(new Set());
        } else {
          try {
            const { data: pendingRows } = await supabase
              .from("organization_admin_requests")
              .select("organization_id,status")
              .eq("user_id", userId)
              .eq("status", "pending")
              .in("organization_id", orgIds);
            const ids = [...new Set((pendingRows ?? []).map((r: { organization_id: string | null }) => r.organization_id).filter(Boolean))] as string[];
            setPendingAdminOrgIds(new Set(ids));
          } catch {
            setPendingAdminOrgIds(new Set());
          }
        }
      } else {
        setPendingAdminOrgIds(new Set());
      }
    } catch {
      setSearchResults([]);
      setPendingAdminOrgIds(new Set());
    } finally {
      setIsSearching(false);
    }
  }, [searchKeyword, userId]);

  const openAdminRequestExisting = (org: OrgRow) => {
    setAdminRequestMode("existing");
    setAdminTargetOrg(org);
    setAdminSnsType("X (旧Twitter)");
    setAdminProofLink("");
    setAdminMessage("");
    setNewOrgName("");
    setNewOrgUniversity("");
    setAdminRequestModalOpen(true);
  };

  const openAdminRequestNew = () => {
    setAdminRequestMode("new");
    setAdminTargetOrg(null);
    setAdminSnsType("X (旧Twitter)");
    setAdminProofLink("");
    setAdminMessage("");
    setNewOrgName(searchKeyword.trim());
    setNewOrgUniversity("");
    setAdminRequestModalOpen(true);
  };

  const closeAdminRequestModal = () => {
    if (adminSubmitting) return;
    setAdminRequestModalOpen(false);
  };

  const handleAdminRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("ログインしてください");
      return;
    }
    if (adminSubmitting) return;

    setAdminSubmitting(true);
    try {
      if (adminRequestMode === "existing") {
        if (!adminTargetOrg) return;
        if (!adminProofLink.trim()) {
          toast.error("本人確認リンクを入力してください");
          return;
        }
        const { error } = await supabase.from("organization_admin_requests").insert({
          organization_id: adminTargetOrg.id,
          sns_type: adminSnsType,
          proof_link: adminProofLink.trim(),
          message: adminMessage.trim() || null,
          user_id: userId,
        });
        if (error) throw error;
      } else {
        if (!newOrgName.trim()) {
          toast.error("団体名を入力してください");
          return;
        }
        if (!newOrgUniversity.trim()) {
          toast.error("主な活動大学を入力してください");
          return;
        }
        if (!adminProofLink.trim()) {
          toast.error("本人確認リンクを入力してください");
          return;
        }
        const { error } = await supabase.from("organization_admin_requests").insert({
          organization_id: null,
          new_org_name: newOrgName.trim(),
          new_org_university: newOrgUniversity.trim(),
          sns_type: adminSnsType,
          proof_link: adminProofLink.trim(),
          message: adminMessage.trim() || null,
          user_id: userId,
        });
        if (error) throw error;
      }

      setAdminRequestModalOpen(false);
      setAdminTargetOrg(null);
      setAdminProofLink("");
      setAdminMessage("");
      setAdminSnsType("X (旧Twitter)");
      setNewOrgName("");
      setNewOrgUniversity("");
      toast.success("運営に申請を送信しました。審査完了までお待ちください。");
      void loadManagedMemberships();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "申請に失敗しました");
    } finally {
      setAdminSubmitting(false);
    }
  };

  const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-[#f5f5f7] text-slate-900 font-display min-h-screen pb-20 md:pb-8">
      <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-primary text-2xl font-bold">マイページ</h1>
          {managedMemberships.length > 0 ? (
            <div className="flex flex-col gap-2 items-stretch sm:items-end shrink-0">
              {managedMemberships.map((m) => (
                <Link
                  key={m.membershipId}
                  href={`/clubdashboard?orgId=${encodeURIComponent(m.organizationId)}`}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 font-bold text-sm hover:bg-[#001f45] transition-colors rounded-none border-0"
                >
                  <span className="material-symbols-outlined text-lg">dashboard</span>
                  {m.organization?.name?.trim() || "団体"}の管理ダッシュボードへ
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-text-sub text-sm">読み込み中...</p>
        ) : (
          <>
            <p className="text-slate-700 text-base mb-8">
              <span className="font-bold text-primary">{displayNameLabel}</span>
              <span className="text-slate-600"> さん、こんにちは</span>
            </p>

            {/* プロフィール情報 */}
            <section className="mb-10">
              <h2 className="text-primary text-lg font-bold mb-4">プロフィール情報</h2>
              <form onSubmit={handleProfileSave} className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                <div className="space-y-5">
                  <div>
                    <label htmlFor="profile-email" className="block text-slate-700 font-bold text-sm mb-2">
                      メールアドレス
                    </label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={userEmail}
                      readOnly
                      disabled
                      className="w-full bg-slate-50 text-slate-600 cursor-not-allowed"
                    />
                    <p className="text-slate-500 text-xs mt-1">Supabase Authで登録したメールアドレスです</p>
                  </div>
                  <div>
                    <label htmlFor="profile-full-name" className="block text-slate-700 font-bold text-sm mb-2">
                      氏名
                    </label>
                    <Input
                      id="profile-full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="例: 山田 太郎"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-contact-email" className="block text-slate-700 font-bold text-sm mb-2">
                      連絡用メールアドレス
                    </label>
                    <Input
                      id="profile-contact-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Gmail等"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-university" className="block text-slate-700 font-bold text-sm mb-2">
                      大学名
                    </label>
                    <Input
                      id="profile-university"
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="例: 東京大学"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-faculty" className="block text-slate-700 font-bold text-sm mb-2">
                      学部・学科
                    </label>
                    <Input
                      id="profile-faculty"
                      type="text"
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      placeholder="例: 文学部 心理学科"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="profile-enrollment-year" className="block text-slate-700 font-bold text-sm mb-2">
                      入学年度
                    </label>
                    <select
                      id="profile-enrollment-year"
                      value={admissionYear}
                      onChange={(e) => setAdmissionYear(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      {ADMISSION_YEAR_OPTIONS.map((opt) => (
                        <option key={opt.value || "blank"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="profile-graduation-year" className="block text-slate-700 font-bold text-sm mb-2">
                      卒業予定年度
                    </label>
                    <select
                      id="profile-graduation-year"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      {GRADUATION_YEAR_OPTIONS.map((opt) => (
                        <option key={opt.value || "blank"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="mt-6 w-full"
                  disabled={isProfileSaving}
                >
                  {isProfileSaving ? "保存中..." : "保存する"}
                </Button>
              </form>
            </section>

            {/* お気に入り・保存リスト */}
            <section className="mb-10">
              <h2 className="text-primary text-lg font-bold mb-4">保存した情報</h2>
              <div className="grid gap-6 sm:grid-cols-1">
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-slate-800 font-bold text-base mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">bookmark</span>
                    お気に入り団体
                  </h3>
                  {savedOrgsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-lg bg-slate-50/80 border border-dashed border-slate-200">
                      <p className="text-text-sub text-sm">読み込み中...</p>
                    </div>
                  ) : savedOrgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-lg bg-slate-50/80 border border-dashed border-slate-200">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">bookmark_border</span>
                      <p className="text-text-sub text-sm text-center">※お気に入り登録した団体はまだありません</p>
                      <p className="text-slate-400 text-xs mt-1">団体詳細ページからお気に入り登録できます</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedOrgs.map((org) => (
                        <SearchOrgCard
                          key={org.id}
                          id={org.id}
                          name={org.name ?? "（団体名なし）"}
                          university={org.university}
                          category={org.category}
                          description={org.description}
                          logoUrl={org.logo_url}
                          memberCount={org.member_count}
                          activityFrequency={org.activity_frequency}
                          isIntercollege={org.is_intercollege}
                          targetGrades={org.target_grades}
                          selectionProcess={org.selection_process}
                          isFavorite={true}
                          onFavoriteClick={() => {
                            toggleSavedOrg(org.id);
                            setSavedOrgs((prev) => prev.filter((o) => o.id !== org.id));
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-slate-800 font-bold text-base mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">event</span>
                    保存したイベント
                  </h3>
                  {savedEventsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-lg bg-slate-50/80 border border-dashed border-slate-200">
                      <p className="text-text-sub text-sm">読み込み中...</p>
                    </div>
                  ) : savedEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 rounded-lg bg-slate-50/80 border border-dashed border-slate-200">
                      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">event_available</span>
                      <p className="text-text-sub text-sm text-center">※保存したイベントはまだありません</p>
                      <p className="text-slate-400 text-xs mt-1">イベント一覧から保存できます</p>
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {savedEvents.map((ev) => (
                        <li key={ev.id}>
                          <Link
                            href={`/events/${ev.id}`}
                            className="block bg-slate-50/50 border border-slate-200 rounded-lg p-5 hover:border-primary/30 hover:bg-primary/5 transition-colors"
                          >
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                              {ev.organizations?.name ?? "団体"}
                            </span>
                            <h4 className="text-primary font-bold text-base mt-1">{ev.title ?? "（タイトルなし）"}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mt-2">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[18px]">schedule</span>
                                {formatEventDate(ev.event_date)}
                              </span>
                              {ev.location && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[18px]">
                                    {ev.location.startsWith("http") ? "videocam" : "location_on"}
                                  </span>
                                  {ev.location.length > 50 ? ev.location.slice(0, 50) + "…" : ev.location}
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-slate-600 text-sm line-clamp-2 mt-2">{ev.description}</p>
                            )}
                            <span className="mt-2 inline-flex items-center gap-1 text-accent text-sm font-bold">
                              団体詳細を見る
                              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* 自分の所属団体を探す */}
            <section className="mb-10">
              <h2 className="text-primary text-lg font-bold mb-4">自分の所属団体を探す（団体名で検索）</h2>
              <div className="flex gap-2 mb-4">
                <Input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
                  placeholder="団体名で検索"
                  className="flex-1"
                />
                <Button type="button" variant="primary" onClick={runSearch} className="shrink-0">
                  検索
                </Button>
              </div>
              {isSearching ? (
                <p className="text-text-sub text-sm py-6 text-center">検索中...</p>
              ) : hasSearched ? (
                searchResults.length === 0 ? (
                  <div className="text-text-sub text-sm py-6 text-center bg-white border border-slate-200 rounded p-6">
                    <p>該当する団体が見つかりませんでした</p>
                    <button
                      type="button"
                      onClick={openAdminRequestNew}
                      className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-[#001f45] transition-colors font-medium text-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      新規団体として登録申請する
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {searchResults.map((org) => (
                      <li
                        key={org.id}
                        className="bg-white border border-slate-200 rounded p-5 shadow-sm hover:border-primary/30 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-primary font-bold text-base truncate">{org.name || "（団体名なし）"}</p>
                            <p className="text-text-sub text-sm mt-1">{org.university || "—"}</p>
                            {org.category && (
                              <span className="inline-block mt-2 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {org.category}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openAdminRequestExisting(org)}
                            disabled={pendingAdminOrgIds.has(org.id)}
                            className="shrink-0 w-full sm:w-auto"
                          >
                            {pendingAdminOrgIds.has(org.id) ? "申請審査中" : "この団体の管理者になる（申請）"}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </section>

            {/* 現在エントリー中の団体 */}
            <section className="mb-10">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h2 className="text-primary text-lg font-bold">現在エントリー中の団体</h2>
                {entryApplications.length > 0 && (
                  <Link
                    href="/mypage/messages"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium text-sm"
                  >
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                    すべてのメッセージを見る
                  </Link>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                {entryApplicationsLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 rounded-lg bg-slate-50/80 border border-dashed border-slate-200">
                    <p className="text-text-sub text-sm">読み込み中...</p>
                  </div>
                ) : entryApplications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 rounded-lg bg-slate-50/80 border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">assignment</span>
                    <p className="text-text-sub text-sm text-center">エントリー中の団体はまだありません</p>
                    <p className="text-slate-400 text-xs mt-1">団体詳細ページからエントリーできます</p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {entryApplications.map((app) => (
                      <li key={app.id}>
                        <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-5 hover:border-primary/30 transition-colors">
                          <Link
                            href={`/organizations/${app.organization_id}`}
                            className="block hover:bg-primary/5 -m-5 p-5 rounded-lg transition-colors relative"
                          >
                            {unreadApplicationIds.has(app.id) && (
                              <span className="absolute top-4 right-4 flex h-2.5 w-2.5 shrink-0" title="未読メッセージあり">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                              </span>
                            )}
                            <div className="flex gap-4">
                              {app.organizations?.logo_url ? (
                                <img
                                  src={app.organizations.logo_url}
                                  alt=""
                                  className="w-14 h-14 rounded-full object-cover border border-slate-200 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
                                  <span className="material-symbols-outlined text-2xl">groups</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-primary font-bold text-base">
                                  {app.organizations?.name ?? "（団体名なし）"}
                                </h4>
                                {(app.organizations?.university ?? app.organizations?.category) && (
                                  <p className="text-text-sub text-sm mt-1">
                                    {[app.organizations?.university, app.organizations?.category].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                                  <span className="text-xs font-medium text-primary">現在の選考ステータス：</span>
                                  <span className="text-sm font-bold text-primary">{app.current_step || "—"}</span>
                                </div>
                              </div>
                              <span className="self-center material-symbols-outlined text-slate-400">chevron_right</span>
                            </div>
                          </Link>
                          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openMessageModal(app)}
                              className="inline-flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[18px]">chat</span>
                              メッセージを確認する
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* 団体からのメッセージ確認モーダル */}
            {messageModalApp && (
              <>
                <div
                  role="presentation"
                  aria-hidden
                  className="fixed inset-0 z-[200] bg-black/50"
                  onClick={closeMessageModal}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="message-modal-title"
                  className="fixed left-1/2 top-1/2 z-[210] w-[min(480px,92vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-600">
                    <h3 id="message-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                      {messageModalApp.organizations?.name ?? "団体"} とのメッセージ
                    </h3>
                    <button
                      type="button"
                      aria-label="閉じる"
                      onClick={closeMessageModal}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="px-6 py-4 flex-1 min-h-0 flex flex-col min-h-[320px]">
                    {messageModalApp?.id && userId ? (
                      <ChatRoom
                        applicationId={messageModalApp.id}
                        userId={userId}
                        viewerIsClub={false}
                        onMarkedAsRead={handleMarkedAsRead}
                        placeholder="メッセージを入力..."
                        fillHeight={false}
                      />
                    ) : null}
                  </div>
                </div>
              </>
            )}

            {/* 団体管理者権限の申請モーダル */}
            {adminRequestModalOpen && (
              <>
                <div
                  role="presentation"
                  aria-hidden
                  className="fixed inset-0 z-[200] bg-black/50"
                  onClick={closeAdminRequestModal}
                />
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="admin-request-title"
                  className="fixed left-1/2 top-1/2 z-[210] w-[min(520px,92vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl overflow-hidden flex flex-col"
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-600">
                    <h3 id="admin-request-title" className="text-lg font-bold text-slate-900 dark:text-white">
                      管理者権限の申請
                    </h3>
                    <button
                      type="button"
                      aria-label="閉じる"
                      onClick={closeAdminRequestModal}
                      disabled={adminSubmitting}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleAdminRequestSubmit} className="px-6 py-4 flex-1 min-h-0 overflow-y-auto">
                    <div className="space-y-4">
                      {adminRequestMode === "existing" ? (
                        <div>
                          <label className="block text-slate-700 font-bold text-sm mb-2">対象団体名</label>
                          <Input
                            value={adminTargetOrg?.name ?? ""}
                            readOnly
                            disabled
                            className="w-full bg-slate-50 cursor-not-allowed"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-slate-700 font-bold text-sm mb-2">
                              団体名 <span className="text-red-500">*</span>
                            </label>
                            <Input
                              value={newOrgName}
                              onChange={(e) => setNewOrgName(e.target.value)}
                              placeholder="団体名"
                              disabled={adminSubmitting}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-bold text-sm mb-2">
                              主な活動大学 <span className="text-red-500">*</span>
                            </label>
                            <Input
                              value={newOrgUniversity}
                              onChange={(e) => setNewOrgUniversity(e.target.value)}
                              placeholder="例: 東京大学"
                              disabled={adminSubmitting}
                              className="w-full"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-slate-700 font-bold text-sm mb-2">
                          SNS・リンクの種類
                          <span className="text-red-500"> *</span>
                        </label>
                        <select
                          value={adminSnsType}
                          onChange={(e) => setAdminSnsType(e.target.value)}
                          disabled={adminSubmitting}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-primary focus:border-primary"
                        >
                          <option value="X (旧Twitter)">X (旧Twitter)</option>
                          <option value="Instagram">Instagram</option>
                          <option value="団体公式Webサイト">団体公式Webサイト</option>
                          <option value="その他">その他</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold text-sm mb-2">
                          本人確認リンク <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={adminProofLink}
                          onChange={(e) => setAdminProofLink(e.target.value)}
                          placeholder="公式SNSのURL等を入力してください"
                          disabled={adminSubmitting}
                          className="w-full"
                        />
                        <p className="text-slate-500 text-xs mt-2">
                          ※審査のため、ご入力いただいたSNSアカウントのDMやメールアドレス宛に、運営から本人確認のご連絡を差し上げる場合がございます。必ず団体公式、もしくは代表者様のアカウントURLをご指定ください。
                        </p>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold text-sm mb-2">運営へのメッセージ</label>
                        <textarea
                          value={adminMessage}
                          onChange={(e) => setAdminMessage(e.target.value)}
                          placeholder="私が代表の〇〇です"
                          rows={4}
                          disabled={adminSubmitting}
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-primary resize-y"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={closeAdminRequestModal}
                        disabled={adminSubmitting}
                      >
                        キャンセル
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        className="flex-1"
                        disabled={
                          adminSubmitting ||
                          (adminRequestMode === "existing"
                            ? !adminTargetOrg?.id || !adminProofLink.trim()
                            : !newOrgName.trim() || !newOrgUniversity.trim() || !adminProofLink.trim())
                        }
                      >
                        {adminSubmitting ? "送信中..." : "送信する"}
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

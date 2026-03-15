"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Input, Button } from "@/components/ui";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  university: string | null;
  faculty: string | null;
  enrollment_year: string | null;
};

const ENROLLMENT_YEAR_OPTIONS = [
  { value: "", label: "選択してください" },
  { value: "2026", label: "2026年度" },
  { value: "2025", label: "2025年度" },
  { value: "2024", label: "2024年度" },
  { value: "2023", label: "2023年度" },
  { value: "before", label: "それ以前" },
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

export default function MypagePage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<OrgRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

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
      setUserEmail(authUser.email ?? "");
      const { data: userRows, error: userError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("id", authUser.id)
        .limit(1);
      if (cancelled) return;
      if (!userError && userRows?.length) {
        const row = userRows[0] as UserRow;
        setUserName(row.name?.trim() || null);
      } else {
        setUserName(authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null);
      }
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, email, display_name, university, faculty, enrollment_year")
        .eq("id", authUser.id)
        .limit(1);
      if (cancelled) return;
      if (profileRows?.length) {
        const p = profileRows[0] as ProfileRow;
        setDisplayName(p.display_name ?? "");
        setUniversity(p.university ?? "");
        setFaculty(p.faculty ?? "");
        setEnrollmentYear(p.enrollment_year ?? "");
      } else {
        setDisplayName(authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "");
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayNameLabel = userName && userName.length > 0 ? userName : displayName || "ゲスト";

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsProfileSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          id: userId,
          email: userEmail || null,
          display_name: displayName.trim() || null,
          university: university.trim() || null,
          faculty: faculty.trim() || null,
          enrollment_year: enrollmentYear.trim() || null,
        },
        { onConflict: "id" }
      );
      if (error) throw error;
      toast.success("プロフィールを保存しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const runSearch = useCallback(async () => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      setSearchResults([]);
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
      setSearchResults((rows as OrgRow[]) ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchKeyword]);

  const handleClaimClick = () => {
    alert("申請機能は準備中です");
  };

  return (
    <div className="bg-[#f5f5f7] text-slate-900 font-display min-h-screen pb-20 md:pb-8">
      <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-primary text-2xl font-bold">マイページ</h1>
          <Link
            href="/clubdashboard"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 font-bold text-sm hover:bg-[#001f45] transition-colors rounded-none border-0 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">dashboard</span>
            団体管理ダッシュボードへ
          </Link>
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
                    <label htmlFor="profile-display-name" className="block text-slate-700 font-bold text-sm mb-2">
                      氏名 / ニックネーム
                    </label>
                    <Input
                      id="profile-display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="例: 山田 太郎"
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
                      value={enrollmentYear}
                      onChange={(e) => setEnrollmentYear(e.target.value)}
                      className="w-full border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      {ENROLLMENT_YEAR_OPTIONS.map((opt) => (
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
                  <p className="text-text-sub text-sm py-6 text-center bg-white border border-slate-200 rounded p-6">
                    該当する団体が見つかりませんでした
                  </p>
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
                            onClick={handleClaimClick}
                            className="shrink-0 w-full sm:w-auto"
                          >
                            この団体の管理者になる（申請）
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </section>

            {/* 現在の選考進捗 */}
            <section className="mb-10">
              <h2 className="text-primary text-lg font-bold mb-4">現在の選考進捗</h2>
              <div className="bg-white border border-slate-200 p-6 rounded">
                <p className="text-text-sub text-sm">現在参加しているイベントはありません</p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

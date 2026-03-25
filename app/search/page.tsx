"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import SearchOrgCard from "@/components/SearchOrgCard";
import { Button, Input } from "@/components/ui";
import { useSavedOrganizations } from "@/hooks/useSavedOrganizations";
import { supabase } from "@/lib/supabase";
import { UNIVERSITY_OPTIONS } from "@/constants/universities";

const CATEGORIES = [
  "運動系（スポーツ・アウトドア）",
  "文化系（音楽・演劇・アート）",
  "学術・研究（ゼミ・研究会・勉強会）",
  "ビジネス・キャリア（起業・就活）",
  "国際交流・語学",
  "ボランティア・NPO",
  "イベント・企画（インカレ・学園祭等）",
  "メディア・出版",
  "趣味・その他",
] as const;

export type OrgSearchRow = {
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

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [keyword, setKeyword] = useState(initialQ);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [orgs, setOrgs] = useState<OrgSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { savedOrgIds, toggle: toggleSavedOrg } = useSavedOrganizations();

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    const trimmedKeyword = keyword.trim();

    let query = supabase
      .from("organizations")
      .select("id, name, university, category, description, logo_url, member_count, activity_frequency, is_intercollege, target_grades, selection_process");

    if (trimmedKeyword) {
      const escaped = trimmedKeyword.replace(/'/g, "''");
      const pattern = `%${escaped}%`;
      query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`);
    }
    if (selectedCategories.length > 0) {
      query = query.in("category", selectedCategories);
    }
    if (selectedUniversities.length > 0) {
      query = query.in("university", selectedUniversities);
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("organizations fetch error:", error);
      setOrgs([]);
    } else {
      setOrgs((data as OrgSearchRow[]) ?? []);
    }
    setLoading(false);
  }, [keyword, selectedCategories, selectedUniversities]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="bg-white text-slate-900 font-display pb-20 md:pb-0">
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar: Filter Section */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="space-y-8">
              <div>
                <h2 className="text-navy text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">filter_alt</span>
                  絞り込み検索
                </h2>
              </div>
              {/* Keyword search - reflected in state, fetchOrgs runs via useEffect */}
              <div className="border-b border-grey-custom/20 pb-6">
                <p className="text-navy font-bold mb-3">キーワード</p>
                <Input
                  type="text"
                  placeholder="団体名・説明で検索"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full"
                />
                <p className="text-grey-custom text-xs mt-2">
                  団体名または活動内容で部分一致検索します
                </p>
              </div>
              {/* University Filter */}
              <div className="border-b border-grey-custom/20 pb-6">
                <p className="text-navy font-bold mb-4">大学</p>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {UNIVERSITY_OPTIONS.map((uni) => (
                    <label key={uni} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 border-grey-custom text-accent focus:ring-0 rounded"
                        checked={selectedUniversities.includes(uni)}
                        onChange={() =>
                          setSelectedUniversities((prev) =>
                            prev.includes(uni) ? prev.filter((u) => u !== uni) : [...prev, uni]
                          )
                        }
                      />
                      <span className="text-navy text-sm group-hover:text-accent transition-colors line-clamp-1">
                        {uni}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Category Filter */}
              <div className="pb-6">
                <p className="text-navy font-bold mb-4">カテゴリ</p>
                <div className="space-y-3">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 border-grey-custom text-accent focus:ring-0 rounded"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span className="text-navy text-sm group-hover:text-accent transition-colors line-clamp-2">
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fetchOrgs()}
                className="w-full"
              >
                検索する
              </Button>
            </div>
          </aside>
          {/* Main Content Area */}
          <section className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-navy text-3xl font-bold mb-2">サークル検索</h2>
              <p className="text-grey-custom text-sm mb-4">大学生活を彩る団体を見つけよう</p>
            </div>
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="text-grey-custom text-sm">
                {loading ? "検索中..." : `全 ${orgs.length} 件の団体`}
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <article key={i} className="bg-white border border-grey-custom/10 rounded-lg overflow-hidden animate-pulse">
                    <div className="aspect-[2/1] bg-slate-200" />
                    <div className="p-5 space-y-3">
                      <div className="flex gap-2">
                        <span className="h-5 w-20 bg-slate-200 rounded" />
                        <span className="h-5 w-24 bg-slate-100 rounded" />
                      </div>
                      <div className="h-5 bg-slate-200 w-3/4 rounded" />
                      <div className="h-4 bg-slate-100 w-full rounded" />
                      <div className="h-4 bg-slate-100 w-1/2 rounded" />
                      <div className="h-4 bg-slate-100 w-20 mt-4 rounded" />
                    </div>
                  </article>
                ))}
              </div>
            ) : orgs.length === 0 ? (
              <p className="text-grey-custom text-center py-12 border border-grey-custom/20 rounded-lg bg-slate-50">
                条件に一致する団体が見つかりませんでした。キーワード、大学、カテゴリを変えて検索してみてください。
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {orgs.map((org) => (
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
                    isFavorite={savedOrgIds.includes(org.id)}
                    onFavoriteClick={() => toggleSavedOrg(org.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

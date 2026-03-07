"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import ClubCard from "@/components/ClubCard";
import { Button, Input } from "@/components/ui";
import { useFavorites } from "@/hooks/useFavorites";
import { MOCK_CLUBS, type ScaleKey } from "@/lib/mockData";

const UNIVERSITIES = ["東京大学", "早稲田大学", "慶應義塾大学", "明治大学"] as const;
const CATEGORIES = ["スポーツ", "文化学術", "音楽", "ボランティア"] as const;
const SCALES: { value: ScaleKey; label: string }[] = [
  { value: "50未満", label: "50名未満" },
  { value: "50-100", label: "50名から100名" },
  { value: "100以上", label: "100名以上" },
];

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [selectedUniversities, setSelectedUniversities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedScales, setSelectedScales] = useState<ScaleKey[]>([]);
  const [favoriteIds, toggleFavorite] = useFavorites();

  const toggleFilter = <T,>(
    current: T[],
    value: T,
    setter: (next: T[]) => void
  ) => {
    if (current.includes(value)) {
      setter(current.filter((v) => v !== value));
    } else {
      setter([...current, value]);
    }
  };

  const filteredClubs = useMemo(() => {
    const trimmedKeyword = keyword.trim().toLowerCase();
    return MOCK_CLUBS.filter((club) => {
      const matchKeyword =
        trimmedKeyword === "" ||
        club.name.toLowerCase().includes(trimmedKeyword) ||
        club.university.toLowerCase().includes(trimmedKeyword) ||
        club.category.toLowerCase().includes(trimmedKeyword) ||
        club.tags.some((t) => t.toLowerCase().includes(trimmedKeyword));
      const matchUniversity =
        selectedUniversities.length === 0 || selectedUniversities.includes(club.university);
      const matchCategory =
        selectedCategories.length === 0 || selectedCategories.includes(club.category);
      const matchScale =
        selectedScales.length === 0 || selectedScales.includes(club.scale);
      return matchKeyword && matchUniversity && matchCategory && matchScale;
    });
  }, [keyword, selectedUniversities, selectedCategories, selectedScales]);

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
              {/* University Filter */}
              <div className="border-b border-grey-custom/20 pb-6">
                <p className="text-navy font-bold mb-4">大学</p>
                <div className="space-y-3">
                  {UNIVERSITIES.map((uni) => (
                    <label key={uni} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 border-grey-custom text-accent focus:ring-0"
                        checked={selectedUniversities.includes(uni)}
                        onChange={() => toggleFilter(selectedUniversities, uni, setSelectedUniversities)}
                      />
                      <span className="text-navy text-sm group-hover:text-accent transition-colors">{uni}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Category Filter */}
              <div className="border-b border-grey-custom/20 pb-6">
                <p className="text-navy font-bold mb-4">カテゴリ</p>
                <div className="space-y-3">
                  {CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 border-grey-custom text-accent focus:ring-0"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleFilter(selectedCategories, cat, setSelectedCategories)}
                      />
                      <span className="text-navy text-sm group-hover:text-accent transition-colors">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Scale Filter */}
              <div className="pb-6">
                <p className="text-navy font-bold mb-4">規模</p>
                <div className="space-y-3">
                  {SCALES.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 border-grey-custom text-accent focus:ring-0"
                        checked={selectedScales.includes(value)}
                        onChange={() => toggleFilter(selectedScales, value, setSelectedScales)}
                      />
                      <span className="text-navy text-sm group-hover:text-accent transition-colors">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>
          {/* Main Content Area */}
          <section className="flex-1">
            <div className="mb-6">
              <h2 className="text-navy text-3xl font-bold mb-2">サークル検索</h2>
              <p className="text-grey-custom text-sm mb-4">大学生活を彩る団体を見つけよう</p>
              <Input
                type="text"
                placeholder="団体名・大学・カテゴリ・タグで検索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="text-grey-custom text-sm">
                全 {filteredClubs.length} 件の団体
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredClubs.map((club) => {
                const isFavorite = favoriteIds.includes(club.id);
                return (
                  <ClubCard
                    key={club.id}
                    id={club.id}
                    name={club.name}
                    university={club.university}
                    category={club.category}
                    memberCount={club.memberCount}
                    image={club.image}
                    imageAlt={club.imageAlt}
                    detailHref="/clubprofile"
                    isFavorite={isFavorite}
                    onFavoriteClick={() => {
                      toggleFavorite(club.id);
                      toast.success(isFavorite ? "お気に入りから削除しました" : "お気に入りに追加しました");
                    }}
                  />
                );
              })}
            </div>
            {filteredClubs.length === 0 && (
              <p className="text-grey-custom text-center py-12">条件に一致する団体がありません。絞り込みを変更してください。</p>
            )}
            <div className="mt-16 flex justify-center gap-2">
              <Button variant="primary" size="sm" className="w-10 h-10 min-w-10 p-0">1</Button>
              <Button variant="outlineMuted" size="sm" className="w-10 h-10 min-w-10 p-0">2</Button>
              <Button variant="outlineMuted" size="sm" className="w-10 h-10 min-w-10 p-0">3</Button>
              <Button variant="outlineMuted" size="sm" className="w-10 h-10 min-w-10 p-0">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

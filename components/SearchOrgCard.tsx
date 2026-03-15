"use client";

import Link from "next/link";
import Badge from "./ui/Badge";

export type SearchOrgCardProps = {
  id: string;
  name: string;
  university: string | null;
  category: string | null;
  description: string | null;
  logoUrl: string | null;
  memberCount: string | null;
  activityFrequency: string | null;
  isIntercollege?: boolean | null;
  targetGrades?: string | null;
  selectionProcess?: string | null;
  isFavorite?: boolean;
  onFavoriteClick?: () => void;
};

function getCategoryPlaceholder(category: string | null): {
  icon: string;
  bg: string;
  iconColor: string;
} {
  if (!category) return { icon: "groups", bg: "bg-slate-100", iconColor: "text-slate-400" };
  if (category.includes("運動") || category.includes("スポーツ") || category.includes("アウトドア"))
    return { icon: "sports_soccer", bg: "bg-emerald-50", iconColor: "text-emerald-500" };
  if (category.includes("文化") || category.includes("音楽") || category.includes("演劇") || category.includes("アート"))
    return { icon: "palette", bg: "bg-violet-50", iconColor: "text-violet-500" };
  if (category.includes("学術") || category.includes("研究") || category.includes("勉強"))
    return { icon: "school", bg: "bg-amber-50", iconColor: "text-amber-600" };
  if (category.includes("ビジネス") || category.includes("起業") || category.includes("就活"))
    return { icon: "work", bg: "bg-blue-50", iconColor: "text-blue-600" };
  if (category.includes("国際") || category.includes("語学"))
    return { icon: "public", bg: "bg-sky-50", iconColor: "text-sky-600" };
  if (category.includes("ボランティア") || category.includes("NPO"))
    return { icon: "volunteer_activism", bg: "bg-rose-50", iconColor: "text-rose-500" };
  if (category.includes("イベント") || category.includes("インカレ") || category.includes("学園祭"))
    return { icon: "celebration", bg: "bg-orange-50", iconColor: "text-orange-500" };
  if (category.includes("メディア") || category.includes("出版"))
    return { icon: "mic", bg: "bg-fuchsia-50", iconColor: "text-fuchsia-500" };
  return { icon: "groups", bg: "bg-slate-100", iconColor: "text-slate-400" };
}

export default function SearchOrgCard({
  id,
  name,
  university,
  category,
  description,
  logoUrl,
  memberCount,
  activityFrequency,
  isIntercollege = null,
  targetGrades = null,
  selectionProcess = null,
  isFavorite = false,
  onFavoriteClick,
}: SearchOrgCardProps) {
  const detailHref = `/organizations/${id}`;
  const placeholder = getCategoryPlaceholder(category);

  return (
    <article className="bg-white border border-grey-custom/10 hover:border-accent/30 transition-colors group relative rounded-lg overflow-hidden">
      {onFavoriteClick && (
        <button
          type="button"
          aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteClick();
          }}
          className={`absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-white/90 rounded-full shadow-sm transition-colors ${
            isFavorite ? "text-rose-500" : "text-grey-custom hover:text-rose-500"
          }`}
        >
          <span
            className={`material-symbols-outlined text-xl ${isFavorite ? "text-rose-500" : ""}`}
            style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            favorite
          </span>
        </button>
      )}
      <Link href={detailHref} className="block">
        <div
          className={`flex items-center justify-center aspect-[2/1] overflow-hidden ${logoUrl ? "bg-slate-50" : placeholder.bg}`}
        >
          {logoUrl ? (
            <img
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              alt={`${name}のロゴ`}
              src={logoUrl}
            />
          ) : (
            <span className={`material-symbols-outlined text-5xl ${placeholder.iconColor}`}>
              {placeholder.icon}
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-2">
            {category && <Badge>{category}</Badge>}
            {university && <Badge variant="default">{university}</Badge>}
            {isIntercollege !== null && isIntercollege !== undefined && (
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 font-medium rounded border border-blue-500/60 text-blue-700 bg-blue-50">
                {isIntercollege ? "インカレ" : "学内団体"}
              </span>
            )}
            {targetGrades && (
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 font-medium rounded border border-emerald-500/60 text-emerald-700 bg-emerald-50">
                {targetGrades}
              </span>
            )}
            {selectionProcess && (
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 font-medium rounded border border-orange-500/60 text-orange-700 bg-orange-50">
                {selectionProcess}
              </span>
            )}
          </div>
          <h3 className="text-navy text-lg font-bold mb-2 line-clamp-1">{name}</h3>
          {(memberCount || activityFrequency) && (
            <div className="flex flex-wrap items-center gap-3 text-grey-custom text-xs mb-3">
              {memberCount && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">group</span>
                  {memberCount}
                </span>
              )}
              {activityFrequency && (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {activityFrequency}
                </span>
              )}
            </div>
          )}
          {description && (
            <p className="text-grey-custom text-sm line-clamp-3 mb-4">{description}</p>
          )}
          <span className="text-accent text-sm font-bold flex items-center gap-1 hover:underline decoration-2 underline-offset-4">
            詳細を見る
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </span>
        </div>
      </Link>
    </article>
  );
}

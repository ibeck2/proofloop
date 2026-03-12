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
  isFavorite?: boolean;
  onFavoriteClick?: () => void;
};

export default function SearchOrgCard({
  id,
  name,
  university,
  category,
  description,
  logoUrl,
  memberCount,
  activityFrequency,
  isFavorite = false,
  onFavoriteClick,
}: SearchOrgCardProps) {
  const detailHref = `/organizations/${id}`;

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
            isFavorite ? "text-accent" : "text-grey-custom hover:text-accent"
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            favorite
          </span>
        </button>
      )}
      <Link href={detailHref} className="block">
        <div className="flex items-center justify-center aspect-[2/1] bg-slate-100 overflow-hidden">
          {logoUrl ? (
            <img
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              alt={`${name}のロゴ`}
              src={logoUrl}
            />
          ) : (
            <span className="material-symbols-outlined text-5xl text-slate-300">
              groups
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-3">
            {category && <Badge>{category}</Badge>}
            {university && <Badge variant="default">{university}</Badge>}
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

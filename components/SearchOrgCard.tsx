"use client";

import Link from "next/link";
import {
  type LucideIcon,
  Users,
  Dumbbell,
  Palette,
  GraduationCap,
  Briefcase,
  Globe,
  HeartHandshake,
  PartyPopper,
  Mic,
  Heart,
  Clock,
  ChevronRight,
} from "lucide-react";
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

function getCategoryIcon(category: string | null): LucideIcon {
  if (!category) return Users;
  if (category.includes("運動") || category.includes("スポーツ") || category.includes("アウトドア"))
    return Dumbbell;
  if (category.includes("文化") || category.includes("音楽") || category.includes("演劇") || category.includes("アート"))
    return Palette;
  if (category.includes("学術") || category.includes("研究") || category.includes("勉強"))
    return GraduationCap;
  if (category.includes("ビジネス") || category.includes("起業") || category.includes("就活"))
    return Briefcase;
  if (category.includes("国際") || category.includes("語学"))
    return Globe;
  if (category.includes("ボランティア") || category.includes("NPO"))
    return HeartHandshake;
  if (category.includes("イベント") || category.includes("インカレ") || category.includes("学園祭"))
    return PartyPopper;
  if (category.includes("メディア") || category.includes("出版"))
    return Mic;
  return Users;
}

const infoTagClass =
  "inline-flex items-center text-[10px] px-2 py-0.5 font-medium rounded border border-rule text-ink bg-mist";

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
  const CategoryIcon = getCategoryIcon(category);

  return (
    <article className="bg-paper border border-rule hover:border-ink/30 transition-colors group relative rounded-lg overflow-hidden">
      {onFavoriteClick && (
        <button
          type="button"
          aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteClick();
          }}
          className={`absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-paper/90 rounded-full shadow-sm transition-colors ${
            isFavorite ? "text-ink" : "text-graphite/70 hover:text-ink"
          }`}
        >
          <Heart
            className="w-5 h-5"
            fill={isFavorite ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
      )}
      <Link href={detailHref} className="block">
        <div className="flex items-center justify-center aspect-[2/1] overflow-hidden bg-mist">
          {logoUrl ? (
            <img
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              alt={`${name}のロゴ`}
              src={logoUrl}
            />
          ) : (
            <CategoryIcon className="w-12 h-12 text-ink" aria-hidden="true" />
          )}
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-2 mb-2">
            {category && <Badge>{category}</Badge>}
            {university && <Badge variant="default">{university}</Badge>}
            {isIntercollege !== null && isIntercollege !== undefined && (
              <span className={infoTagClass}>
                {isIntercollege ? "インカレ" : "学内団体"}
              </span>
            )}
            {targetGrades && <span className={infoTagClass}>{targetGrades}</span>}
            {selectionProcess && <span className={infoTagClass}>{selectionProcess}</span>}
          </div>
          <h3 className="text-ink text-lg font-bold mb-2 line-clamp-1">{name}</h3>
          {(memberCount || activityFrequency) && (
            <div className="flex flex-wrap items-center gap-3 text-graphite text-xs mb-3">
              {memberCount && (
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" aria-hidden="true" />
                  {memberCount}
                </span>
              )}
              {activityFrequency && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  {activityFrequency}
                </span>
              )}
            </div>
          )}
          {description && (
            <p className="text-graphite text-sm line-clamp-3 mb-4">{description}</p>
          )}
          <span className="text-ink text-sm font-bold flex items-center gap-1 group-hover:underline underline-offset-4">
            詳細を見る
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
}

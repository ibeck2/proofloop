import Link from "next/link";
import Badge from "./ui/Badge";

export type ClubCardProps = {
  id: string;
  name: string;
  university: string;
  category: string;
  memberCount: number;
  image: string;
  imageAlt: string;
  detailHref?: string;
  isFavorite?: boolean;
  onFavoriteClick?: () => void;
};

export default function ClubCard({
  name,
  university,
  category,
  memberCount,
  image,
  imageAlt,
  detailHref = "/clubprofile",
  isFavorite = false,
  onFavoriteClick,
}: ClubCardProps) {
  return (
    <article className="bg-white border border-grey-custom/10 hover:border-accent/30 transition-colors group relative">
      {onFavoriteClick && (
        <button
          type="button"
          aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteClick();
          }}
          className={`absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-white/90 transition-colors ${
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
      <div className="aspect-video bg-background-light overflow-hidden">
        <img
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          alt={imageAlt}
          src={image}
        />
      </div>
      <div className="p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge>{category}</Badge>
          <Badge>{university}</Badge>
        </div>
        <h3 className="text-navy text-lg font-bold mb-2">{name}</h3>
        <div className="flex items-center gap-2 text-grey-custom text-xs mb-4">
          <span className="material-symbols-outlined text-sm">group</span>
          <span>メンバー数 {memberCount}名</span>
        </div>
        <Link
          className="text-accent text-sm font-bold flex items-center gap-1 hover:underline decoration-2 underline-offset-4"
          href={detailHref}
        >
          詳細を見る
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </Link>
      </div>
    </article>
  );
}

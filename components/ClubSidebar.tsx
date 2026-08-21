"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Pencil,
  Users,
  ClipboardList,
  Mail,
  Kanban,
  Megaphone,
  CalendarDays,
  CalendarClock,
  Images,
  Star,
  Wallet,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

const NAV_LINKS: Array<{ href: string; label: string; Icon: LucideIcon; exact?: boolean }> = [
  { href: "/clubdashboard", label: "ダッシュボードホーム", Icon: LayoutDashboard, exact: true },
  { href: "/clubprofile", label: "プロフィール編集", Icon: Pencil, exact: true },
  { href: "/clubsettings/members", label: "メンバー管理", Icon: Users, exact: true },
  { href: "/clubats", label: "入会応募者管理", Icon: ClipboardList, exact: true },
  { href: "/clubmessages", label: "メッセージ", Icon: Mail, exact: true },
  { href: "/clubtasks", label: "タスク管理", Icon: Kanban, exact: true },
  { href: "/clubschedule", label: "日程調整", Icon: CalendarClock, exact: false },
  { href: "/clubfinance", label: "会計・財務", Icon: Wallet, exact: true },
  { href: "/clubposts", label: "タイムライン投稿", Icon: Megaphone, exact: true },
  { href: "/clubevents", label: "イベント管理", Icon: CalendarDays, exact: true },
  { href: "/clubphotos", label: "フォトギャラリー管理", Icon: Images, exact: true },
  { href: "/clubdashboard/reviews", label: "口コミ・レビュー管理", Icon: Star, exact: true },
];

function linkClassFor(pathname: string | null, path: string, exact?: boolean): string {
  const pathOnly = path.split("?")[0];
  const active = exact
    ? pathname === pathOnly
    : pathname === pathOnly || (pathname?.startsWith(pathOnly + "/") ?? false);
  return active
    ? "flex items-center gap-3 px-4 py-3 rounded bg-mist text-ink"
    : "flex items-center gap-3 px-4 py-3 rounded text-graphite hover:text-ink hover:bg-mist transition-colors";
}

function ClubNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { withOrgQuery } = useClubOrganization();
  return (
    <nav className="flex flex-col gap-2">
      {NAV_LINKS.map(({ href, label, Icon, exact }) => (
        <Link
          key={href}
          className={linkClassFor(pathname, href, exact)}
          href={withOrgQuery(href)}
          onClick={onNavigate}
        >
          <Icon className="w-6 h-6" aria-hidden="true" />
          <span className="text-sm font-medium">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function ClubSidebar() {
  return (
    <aside className="hidden w-64 flex-col bg-paper border-r border-rule lg:flex shrink-0">
      <div className="flex h-full flex-col justify-between p-6">
        <div className="flex flex-col gap-8">
          <p className="text-graphite text-xs">管理者用</p>
          <ClubNavLinks />
        </div>
        <div className="pt-6 border-t border-rule">
          <Link
            className="flex items-center gap-3 px-4 py-2 text-graphite hover:text-ink transition-colors"
            href="/"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">ログアウト</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function ClubMobileDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div
        role="presentation"
        aria-hidden={!isOpen}
        className={`lg:hidden fixed inset-0 z-[110] bg-black/40 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        aria-label="管理者用メニュー"
        aria-hidden={!isOpen}
        className={`lg:hidden fixed top-0 right-0 z-[120] h-full w-[min(280px,85vw)] max-w-[280px] bg-paper shadow-xl transition-transform duration-200 ease-out flex flex-col justify-between p-6 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-8">
          <p className="text-graphite text-xs">管理者用</p>
          <ClubNavLinks onNavigate={onClose} />
        </div>
        <div className="pt-6 border-t border-rule">
          <Link
            className="flex items-center gap-3 px-4 py-2 text-graphite hover:text-ink transition-colors"
            href="/"
            onClick={onClose}
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">ログアウト</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

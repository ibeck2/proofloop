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
  Images,
  Star,
  LogOut,
} from "lucide-react";
import { useClubOrganization } from "@/contexts/ClubOrganizationContext";

export default function ClubSidebar() {
  const pathname = usePathname();
  const { withOrgQuery } = useClubOrganization();

  const linkClass = (path: string, exact?: boolean) => {
    const pathOnly = path.split("?")[0];
    const active = exact
      ? pathname === pathOnly
      : pathname === pathOnly || pathname.startsWith(pathOnly + "/");
    return active
      ? "flex items-center gap-3 px-4 py-3 rounded bg-mist text-ink"
      : "flex items-center gap-3 px-4 py-3 rounded text-graphite hover:text-ink hover:bg-mist transition-colors";
  };

  return (
    <aside className="hidden w-64 flex-col bg-paper border-r border-rule lg:flex shrink-0">
      <div className="flex h-full flex-col justify-between p-6">
        <div className="flex flex-col gap-8">
          <p className="text-graphite text-xs">管理者用</p>
          <nav className="flex flex-col gap-2">
            <Link className={linkClass("/clubdashboard", true)} href={withOrgQuery("/clubdashboard")}>
              <LayoutDashboard className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">ダッシュボードホーム</span>
            </Link>
            <Link className={linkClass("/clubprofile", true)} href={withOrgQuery("/clubprofile")}>
              <Pencil className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">プロフィール編集</span>
            </Link>
            <Link
              className={linkClass("/clubsettings/members", true)}
              href={withOrgQuery("/clubsettings/members")}
            >
              <Users className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">メンバー管理</span>
            </Link>
            <Link className={linkClass("/clubats", true)} href={withOrgQuery("/clubats")}>
              <ClipboardList className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">採用管理（ATS）</span>
            </Link>
            <Link className={linkClass("/clubmessages", true)} href={withOrgQuery("/clubmessages")}>
              <Mail className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">メッセージ</span>
            </Link>
            <Link className={linkClass("/clubtasks", true)} href={withOrgQuery("/clubtasks")}>
              <Kanban className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">タスク管理</span>
            </Link>
            <Link className={linkClass("/clubposts", true)} href={withOrgQuery("/clubposts")}>
              <Megaphone className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">タイムライン投稿</span>
            </Link>
            <Link className={linkClass("/clubevents", true)} href={withOrgQuery("/clubevents")}>
              <CalendarDays className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">イベント管理</span>
            </Link>
            <Link className={linkClass("/clubphotos", true)} href={withOrgQuery("/clubphotos")}>
              <Images className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">フォトギャラリー管理</span>
            </Link>
            <Link
              className={linkClass("/clubdashboard/reviews", true)}
              href={withOrgQuery("/clubdashboard/reviews")}
            >
              <Star className="w-6 h-6" aria-hidden="true" />
              <span className="text-sm font-medium">口コミ・レビュー管理</span>
            </Link>
          </nav>
        </div>
        <div className="pt-6 border-t border-rule">
          <Link className="flex items-center gap-3 px-4 py-2 text-graphite hover:text-ink transition-colors" href="/">
            <LogOut className="w-5 h-5" aria-hidden="true" />
            <span className="text-sm font-medium">ログアウト</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      ? "flex items-center gap-3 px-4 py-3 rounded bg-primary/10 text-primary dark:text-blue-200"
      : "flex items-center gap-3 px-4 py-3 rounded text-text-sub hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";
  };

  return (
    <aside className="hidden w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 lg:flex shrink-0">
      <div className="flex h-full flex-col justify-between p-6">
        <div className="flex flex-col gap-8">
          <p className="text-text-sub text-xs">管理者用</p>
          <nav className="flex flex-col gap-2">
            <Link className={linkClass("/clubdashboard", true)} href={withOrgQuery("/clubdashboard")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>dashboard</span>
              <span className="text-sm font-medium">ダッシュボードホーム</span>
            </Link>
            <Link className={linkClass("/clubprofile", true)} href={withOrgQuery("/clubprofile")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>edit_note</span>
              <span className="text-sm font-medium">プロフィール編集</span>
            </Link>
            <Link
              className={linkClass("/clubsettings/members", true)}
              href={withOrgQuery("/clubsettings/members")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>group</span>
              <span className="text-sm font-medium">メンバー管理</span>
            </Link>
            <Link className={linkClass("/clubats", true)} href={withOrgQuery("/clubats")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>group_work</span>
              <span className="text-sm font-medium">採用管理（ATS）</span>
            </Link>
            <Link className={linkClass("/clubmessages", true)} href={withOrgQuery("/clubmessages")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>mail</span>
              <span className="text-sm font-medium">メッセージ</span>
            </Link>
            <Link className={linkClass("/clubtasks", true)} href={withOrgQuery("/clubtasks")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>view_kanban</span>
              <span className="text-sm font-medium">タスク管理</span>
            </Link>
            <Link className={linkClass("/clubposts", true)} href={withOrgQuery("/clubposts")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>campaign</span>
              <span className="text-sm font-medium">タイムライン投稿</span>
            </Link>
            <Link className={linkClass("/clubevents", true)} href={withOrgQuery("/clubevents")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>event</span>
              <span className="text-sm font-medium">イベント管理</span>
            </Link>
            <Link className={linkClass("/clubphotos", true)} href={withOrgQuery("/clubphotos")}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>photo_library</span>
              <span className="text-sm font-medium">フォトギャラリー管理</span>
            </Link>
            <Link
              className={linkClass("/clubdashboard/reviews", true)}
              href={withOrgQuery("/clubdashboard/reviews")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>rate_review</span>
              <span className="text-sm font-medium">口コミ・レビュー管理</span>
            </Link>
          </nav>
        </div>
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
          <Link className="flex items-center gap-3 px-4 py-2 text-text-sub hover:text-primary transition-colors" href="/">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            <span className="text-sm font-medium">ログアウト</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

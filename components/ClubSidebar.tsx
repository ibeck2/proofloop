"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ClubSidebar() {
  const pathname = usePathname();

  const linkClass = (path: string, exact?: boolean) => {
    const active = exact ? pathname === path : pathname === path || pathname.startsWith(path + "/");
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
            <Link className={linkClass("/clubdashboard", true)} href="/clubdashboard">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>dashboard</span>
              <span className="text-sm font-medium">ダッシュボードホーム</span>
            </Link>
            <Link className={linkClass("/clubprofile", true)} href="/clubprofile">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>edit_note</span>
              <span className="text-sm font-medium">プロフィール編集</span>
            </Link>
            <Link className={linkClass("/clubdashboard/selection")} href="/clubdashboard/selection">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>how_to_vote</span>
              <span className="text-sm font-medium">新歓DX・選考管理</span>
            </Link>
            <Link className={linkClass("/clubopenmission", true)} href="/clubopenmission">
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>task_alt</span>
              <span className="text-sm font-medium">ミッションボード</span>
            </Link>
            <Link className={linkClass("/clubdashboard/reviews", true)} href="/clubdashboard/reviews">
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback } from "react";

const STUDENT_PATHS = ["/", "/search", "/classinfo", "/schedule", "/clubprofile", "/mypage"];

function isStudentPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return STUDENT_PATHS.some((p) => p !== "/" && pathname.startsWith(p));
}

const MOBILE_NAV_LINKS = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/search", label: "検索", icon: "search" },
  { href: "/schedule", label: "カレンダー", icon: "calendar_month" },
  { href: "/clubprofile", label: "マイページ", icon: "person" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showStudentNav = isStudentPath(pathname ?? "");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <>
      {/* 共通ヘッダー: ロゴ + 学生向けナビ（学生パスのみ） */}
      <header className="sticky top-0 z-[100] w-full bg-white border-b border-slate-200 shrink-0">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-2xl md:text-3xl">loop</span>
            <span className="font-display font-bold text-xl md:text-2xl tracking-tight">ProofLoop</span>
          </Link>
          {showStudentNav && (
            <>
              <nav className="hidden md:flex items-center gap-8 text-text-grey font-bold text-sm">
                <Link className="flex items-center gap-2 hover:text-primary transition-colors" href="/">
                  <span className="material-symbols-outlined text-[20px]">home</span>
                  ホーム
                </Link>
                <Link className="flex items-center gap-2 hover:text-primary transition-colors" href="/search">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  検索
                </Link>
                <Link className="flex items-center gap-2 hover:text-primary transition-colors" href="/schedule">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                  カレンダー
                </Link>
              </nav>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex gap-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center bg-white border border-accent text-accent hover:bg-accent hover:text-white transition-colors px-6 h-10 font-bold text-sm rounded-none"
                  >
                    ログイン
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center bg-accent text-white hover:bg-[#600000] transition-colors px-6 h-10 font-bold text-sm rounded-none"
                  >
                    新規登録
                  </Link>
                </div>
                {/* モバイル: ハンバーガーボタン */}
                <button
                  type="button"
                  aria-label="メニューを開く"
                  aria-expanded={isMenuOpen}
                  className="md:hidden p-2 -mr-2 text-text-grey hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                >
                  <span className="material-symbols-outlined text-[28px]">
                    {isMenuOpen ? "close" : "menu"}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* モバイル用ドロワー（横からスライド） */}
      {showStudentNav && (
        <>
          <div
            role="presentation"
            aria-hidden={!isMenuOpen}
            className={`md:hidden fixed inset-0 z-[110] bg-black/40 transition-opacity duration-200 ${
              isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={closeMenu}
          />
          <aside
            aria-label="メニュー"
            aria-hidden={!isMenuOpen}
            className={`md:hidden fixed top-0 right-0 z-[120] h-full w-[min(280px,85vw)] max-w-[280px] bg-white shadow-xl transition-transform duration-200 ease-out ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full pt-14 pb-6">
              <div className="px-4 pb-4 border-b border-slate-100">
                <span className="font-display font-bold text-primary text-lg">メニュー</span>
              </div>
              <nav className="flex-1 px-2 py-4 flex flex-col gap-1">
                {MOBILE_NAV_LINKS.map(({ href, label, icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
                      pathname === href || (href !== "/" && pathname?.startsWith(href))
                        ? "bg-primary/10 text-primary"
                        : "text-text-grey hover:bg-slate-50 hover:text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="px-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="w-full inline-flex items-center justify-center bg-white border border-accent text-accent hover:bg-accent hover:text-white transition-colors py-3 font-bold text-sm rounded-none"
                >
                  ログイン
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="w-full inline-flex items-center justify-center bg-accent text-white hover:bg-[#600000] transition-colors py-3 font-bold text-sm rounded-none"
                >
                  新規登録
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
      {children}
      {/* 学生向けモバイルフッター */}
      {showStudentNav && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-[#f0f2f5] flex justify-around py-3 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Link className="flex flex-col items-center gap-1 text-primary" href="/">
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-bold">ホーム</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 text-text-grey hover:text-primary" href="/search">
            <span className="material-symbols-outlined">search</span>
            <span className="text-[10px] font-bold">検索</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 text-text-grey hover:text-primary" href="/schedule">
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="text-[10px] font-bold">カレンダー</span>
          </Link>
          <Link className="flex flex-col items-center gap-1 text-text-grey hover:text-primary" href="/clubprofile">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-bold">マイページ</span>
          </Link>
        </nav>
      )}
    </>
  );
}

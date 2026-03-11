"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ClubDashboardContent() {
  const [orgName, setOrgName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session?.user) {
        setIsLoading(false);
        return;
      }
      const { data: rows } = await supabase
        .from("organizations")
        .select("name")
        .eq("user_id", session.user.id)
        .limit(1);
      if (cancelled) return;
      const name = (rows?.[0] as { name: string | null } | undefined)?.name?.trim();
      setOrgName(name ?? null);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const welcomeTitle = orgName ? `${orgName} 管理ページへようこそ` : "団体管理ページへようこそ";

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-primary dark:text-white text-2xl md:text-3xl font-bold tracking-tight">
            {isLoading ? "読み込み中..." : welcomeTitle}
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded shadow-sm transition-all hover:shadow-md whitespace-nowrap font-bold text-sm"
          href="/schedule"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          新しい新歓イベントを登録する
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm mb-2">今月の閲覧数</h3>
          <p className="text-text-sub dark:text-slate-400 text-sm">データがありません</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm mb-2">お気に入り登録数</h3>
          <p className="text-text-sub dark:text-slate-400 text-sm">データがありません</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm mb-2">新着問い合わせ</h3>
          <p className="text-text-sub dark:text-slate-400 text-sm">データがありません</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-primary dark:text-white text-lg font-bold mb-2">ページ閲覧数推移</h3>
          <p className="text-text-sub dark:text-slate-400 text-sm">機能準備中</p>
        </div>
        <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-primary dark:text-white text-lg font-bold mb-4">直近の実績・イベント</h3>
          <p className="text-text-sub dark:text-slate-400 text-sm mb-4">データがありません</p>
          <Link
            href="/clubdashboard/reviews"
            className="block w-full py-2 text-center text-sm font-bold text-primary dark:text-blue-300 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            口コミ・レビュー管理へ
          </Link>
        </div>
      </div>
    </div>
  );
}

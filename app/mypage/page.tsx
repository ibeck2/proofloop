"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

export default function MypagePage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (cancelled) return;
      if (authError || !authUser) {
        setIsLoading(false);
        return;
      }
      const { data: rows, error: fetchError } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("id", authUser.id)
        .limit(1);
      if (cancelled) return;
      if (!fetchError && rows?.length) {
        const row = rows[0] as UserRow;
        setUserName(row.name?.trim() || null);
      } else {
        setUserName(authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = userName && userName.length > 0 ? userName : "ゲスト";

  return (
    <div className="bg-[#f5f5f7] text-slate-900 font-display min-h-screen pb-20 md:pb-8">
      <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-primary text-2xl font-bold">マイページ</h1>
          <Link
            href="/clubdashboard"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 font-bold text-sm hover:bg-[#001f45] transition-colors rounded-none border-0 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">dashboard</span>
            団体管理ダッシュボードへ
          </Link>
        </div>

        {isLoading ? (
          <p className="text-text-sub text-sm">読み込み中...</p>
        ) : (
          <>
            <p className="text-slate-700 text-base mb-8">
              <span className="font-bold text-primary">{displayName}</span>
              <span className="text-slate-600"> さん、こんにちは</span>
            </p>

            {/* 現在の選考進捗 */}
            <section className="mb-10">
              <h2 className="text-primary text-lg font-bold mb-4">現在の選考進捗</h2>
              <div className="bg-white border border-slate-200 p-6 rounded">
                <p className="text-text-sub text-sm">現在参加しているイベントはありません</p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

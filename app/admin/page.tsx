"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, MessageSquare, Star, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AdminMenuItem = {
  href: string;
  title: string;
  description: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const menuItems: AdminMenuItem[] = useMemo(
    () => [
      {
        href: "/admin/requests",
        title: "団体管理者リクエスト",
        description: "団体管理者申請の確認・承認・却下を行います。",
        Icon: ClipboardCheck,
      },
      {
        href: "/admin/reviews",
        title: "レビュー管理",
        description: "承認待ちの口コミを確認し、公開可否を判断します。",
        Icon: Star,
      },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        if (!cancelled) {
          setSessionChecked(true);
          router.replace("/");
        }
        return;
      }

      const { data: profileRows, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .limit(1);

      if (cancelled) return;
      if (profileError || !profileRows || profileRows.length === 0) {
        setIsAdmin(false);
        setSessionChecked(true);
        router.replace("/");
        return;
      }

      const role = (profileRows[0] as { role?: string }).role;
      setIsAdmin(role === "admin");
      setSessionChecked(true);
      if (role !== "admin") router.replace("/");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">確認中...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">アクセスできません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-display">
      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-navy">
              管理者ダッシュボード（Admin Dashboard）
            </h1>
            <p className="text-slate-600 text-sm mt-2">
              運営・管理機能の入口です。必要なメニューを選択してください。
            </p>
          </div>

          <Link
            href="/"
            className="shrink-0 text-accent text-sm font-bold hover:underline inline-flex items-center gap-1 mt-1"
          >
            ← トップに戻る
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map(({ href, title, description, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-bold text-slate-900">
                        {title}
                      </h2>
                      <MessageSquare
                        className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {description}
                    </p>
                    <div className="mt-4 text-accent text-sm font-bold inline-flex items-center gap-1 group-hover:underline decoration-2 underline-offset-4">
                      開く
                      <Users className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}


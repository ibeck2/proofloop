import Link from "next/link";
import type { Metadata } from "next";
import UpcomingEvents from "@/components/UpcomingEvents";
import Hero from "@/components/home/Hero";
import DirectoryPreview from "@/components/home/DirectoryPreview";
import CategoryEntries from "@/components/home/CategoryEntries";
import { getHomeData } from "@/lib/home/homeData";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "学生団体を探す｜大学別・分野別に見つかる",
  description:
    "全国の大学の学生団体を大学別・分野別に掲載。サークル・研究会・学祭実行委員会を探せます。GPA計算機や単位・お金のガイドも。",
};

export default async function Page() {
  const home = await getHomeData();

  return (
    <div className="bg-paper text-graphite min-h-screen flex flex-col font-body pb-20 md:pb-0">
      <main className="flex-grow w-full max-w-[1100px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-16 md:gap-20">
        <Hero
          organizations={home.heroOrganizations}
          totalOrganizations={home.totalOrganizations}
          universityCount={home.universityCounts.length}
        />

        <DirectoryPreview universityCounts={home.universityCounts} />
        <CategoryEntries categories={home.categoryCounts} />

        {/* 新入生ガイド */}
        <section className="flex flex-col gap-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-primary text-xl font-black">新入生ガイド</h2>
              <p className="text-text-grey text-sm">バイト・就活・留学・単位・サークル・お金——大学生活の疑問をまとめて解決。</p>
            </div>
            <Link href="/guide" className="text-accent text-sm font-bold hover:underline flex items-center gap-1 shrink-0">
              すべて見る
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { href:"/baito", icon:"work", label:"バイト・インターン", color:"text-blue-600", bg:"bg-blue-50", ready:true },
              { href:"/guide/career", icon:"business_center", label:"就活", color:"text-emerald-600", bg:"bg-emerald-50", ready:false },
              { href:"/guide/study-abroad", icon:"flight", label:"留学", color:"text-sky-600", bg:"bg-sky-50", ready:true },
              { href:"/guide/credits", icon:"school", label:"単位・授業", color:"text-amber-600", bg:"bg-amber-50", ready:true },
              { href:"/guide/circle", icon:"groups", label:"サークル", color:"text-violet-600", bg:"bg-violet-50", ready:true },
              { href:"/guide/money", icon:"savings", label:"お金・奨学金", color:"text-rose-600", bg:"bg-rose-50", ready:true },
            ].map((item) => (
              item.ready ? (
                <Link key={item.href} href={item.href}
                  className="group border border-[#f0f2f5] hover:border-accent/40 hover:shadow-sm transition-all p-4 flex flex-col items-center gap-3 text-center">
                  <div className={`w-10 h-10 ${item.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-xl ${item.color}`}>{item.icon}</span>
                  </div>
                  <span className="text-primary text-xs font-bold leading-tight">{item.label}</span>
                </Link>
              ) : (
                <div key={item.href}
                  className="border border-[#f0f2f5] p-4 flex flex-col items-center gap-3 text-center opacity-50">
                  <div className={`w-10 h-10 ${item.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-xl ${item.color}`}>{item.icon}</span>
                  </div>
                  <span className="text-text-grey text-xs font-bold leading-tight">{item.label}</span>
                  <span className="text-[10px] text-slate-400">準備中</span>
                </div>
              )
            ))}
          </div>
        </section>

        {/* Featured Content: Events */}
        <UpcomingEvents />
      </main>
    </div>
  );
}

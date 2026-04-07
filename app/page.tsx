"use client";

import Link from "next/link";
import UpcomingEvents from "@/components/UpcomingEvents";

export default function Page() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-primary min-h-screen flex flex-col font-body pb-20 md:pb-0">
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center gap-10 text-center max-w-4xl mx-auto w-full">
          <h2 className="text-primary text-2xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight max-w-3xl">
            全ての大学生のポテンシャルを<span className="whitespace-nowrap">引き出す</span><br className="hidden sm:block" />
            プラットフォーム ProofLoop
          </h2>
        </section>

        {/* Quick Access */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {/* Card 1: サークルを探す */}
          <Link className="group block border border-[#f0f2f5] bg-white hover:border-accent hover:shadow-sm transition-all p-8 flex flex-col items-center justify-center gap-4 text-center h-64 rounded-none" href="/search">
            <div className="w-16 h-16 bg-primary/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors rounded-none">
              <span className="material-symbols-outlined text-primary text-4xl group-hover:text-accent">groups</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-primary text-xl font-bold">サークルを探す</h3>
              <p className="text-text-grey text-sm">各大学の公認サークルを網羅。あなたに合ったサークルがきっと見つかる。</p>
            </div>
          </Link>

          {/* Card 2: バイト・インターン */}
          <Link className="group block border border-[#f0f2f5] bg-white hover:border-accent hover:shadow-sm transition-all p-8 flex flex-col items-center justify-center gap-4 text-center h-64 rounded-none" href="/baito">
            <div className="w-16 h-16 bg-primary/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors rounded-none">
              <span className="material-symbols-outlined text-primary text-4xl group-hover:text-accent">work</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-primary text-xl font-bold">バイト・インターン</h3>
              <p className="text-text-grey text-sm">大学生目線で厳選。授業・サークルと両立できる仕事を探そう。</p>
            </div>
          </Link>

          {/* Card 3: 過去問・授業レビュー */}
          <Link className="group block border border-[#f0f2f5] bg-white hover:border-accent hover:shadow-sm transition-all p-8 flex flex-col items-center justify-center gap-4 text-center h-64 rounded-none" href="/classinfo">
            <div className="w-16 h-16 bg-primary/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors rounded-none">
              <span className="material-symbols-outlined text-primary text-4xl group-hover:text-accent">school</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-primary text-xl font-bold">授業レビュー・過去問</h3>
              <p className="text-text-grey text-sm">効率的な学習をサポート</p>
            </div>
          </Link>
        </section>

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
              { href:"/guide/credits", icon:"school", label:"単位・授業", color:"text-amber-600", bg:"bg-amber-50", ready:false },
              { href:"/guide/circle", icon:"groups", label:"サークル", color:"text-violet-600", bg:"bg-violet-50", ready:true },
              { href:"/guide/money", icon:"savings", label:"お金・奨学金", color:"text-rose-600", bg:"bg-rose-50", ready:false },
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

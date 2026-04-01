"use client";

import Link from "next/link";

const GUIDE_PAGES = [
  {
    href: "/baito",
    icon: "work",
    label: "バイト・インターン",
    status: "published",
    description: "授業・サークルと両立できるバイトの選び方、2025年最新の年収の壁、インターンとの違いまで徹底解説。",
    tags: ["年収の壁", "シフト選び", "インターン"],
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/guide/career",
    icon: "business_center",
    label: "就活",
    status: "coming",
    description: "いつから始めるべき？自己分析・ES・面接・インターンまで、就活の全体像を学年別に解説。",
    tags: ["就活スケジュール", "自己分析", "インターン"],
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    href: "/guide/study-abroad",
    icon: "flight",
    label: "留学",
    status: "coming",
    description: "費用・期間・手続き・語学力の目安など、大学生の留学に関する疑問をまとめて解決。",
    tags: ["費用", "休学・認定", "語学"],
    color: "text-sky-600",
    bg: "bg-sky-50",
  },
  {
    href: "/guide/credits",
    icon: "school",
    label: "単位・授業",
    status: "coming",
    description: "単位の取り方・落とし方・GPA・必修と選択の違いなど、履修計画で失敗しないための基礎知識。",
    tags: ["履修登録", "GPA", "必修・選択"],
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    href: "/guide/circle",
    icon: "groups",
    label: "サークル",
    status: "coming",
    description: "新歓の仕組み・複数サークルの掛け持ち・入り方・やめ方まで、サークル選びで迷わないためのガイド。",
    tags: ["新歓", "掛け持ち", "選び方"],
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  {
    href: "/guide/money",
    icon: "savings",
    label: "お金・奨学金",
    status: "coming",
    description: "大学生の平均生活費・奨学金の種類・返済・節約術まで。お金の不安を解消するための基礎知識。",
    tags: ["奨学金", "生活費", "節約"],
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
] as const;

export default function GuidePage() {
  return (
    <div className="bg-white text-primary min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">
        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-2xl">menu_book</span>
            <span className="text-accent text-sm font-bold tracking-widest uppercase">Freshman Guide</span>
          </div>
          <h1 className="text-primary text-3xl md:text-5xl font-black leading-tight tracking-tight">
            新入生ガイド
          </h1>
          <p className="text-text-grey text-base md:text-lg leading-relaxed">
            バイト・就活・留学・単位・サークル・お金——大学生活でぶつかる疑問に、ProofLoopがまとめて答えます。
          </p>
        </section>

        {/* ガイド一覧 */}
        <section className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUIDE_PAGES.map((page) => (
              <div key={page.href} className="relative">
                {page.status === "published" ? (
                  <Link
                    href={page.href}
                    className="group border border-[#f0f2f5] hover:border-accent/40 hover:shadow-sm transition-all p-6 flex flex-col gap-4 h-full"
                  >
                    <div className={`w-12 h-12 ${page.bg} flex items-center justify-center`}>
                      <span className={`material-symbols-outlined text-2xl ${page.color}`}>{page.icon}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-primary font-black text-lg">{page.label}どうする？</h2>
                        <span className="text-[10px] px-2 py-0.5 bg-accent text-white font-bold">公開中</span>
                      </div>
                      <p className="text-text-grey text-sm leading-relaxed">{page.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {page.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-primary/5 text-primary border border-primary/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-accent text-sm font-bold flex items-center gap-1 group-hover:underline">
                      読む
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </Link>
                ) : (
                  <div className="border border-[#f0f2f5] p-6 flex flex-col gap-4 h-full opacity-60">
                    <div className={`w-12 h-12 ${page.bg} flex items-center justify-center`}>
                      <span className={`material-symbols-outlined text-2xl ${page.color}`}>{page.icon}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-primary font-black text-lg">{page.label}どうする？</h2>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-500 font-bold">準備中</span>
                      </div>
                      <p className="text-text-grey text-sm leading-relaxed">{page.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {page.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-slate-400 text-sm font-bold">近日公開</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* シミュレーター導線 */}
        <section style={{ backgroundColor: "#002b5c" }} className="p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-black text-xl md:text-2xl" style={{ color: "#ffffff" }}>
              バイト・授業・サークル、全部両立できる？
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              3問に答えるだけで可処分時間・月収・年収の壁を自動計算。
            </p>
          </div>
          <Link
            href="/baito/simulator"
            className="shrink-0 inline-flex items-center gap-2 bg-accent text-white hover:bg-[#600000] transition-colors px-8 py-4 font-black text-base whitespace-nowrap"
          >
            シミュレートしてみる
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </section>

        {/* サークル検索への導線 */}
        <section className="border border-[#f0f2f5] p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="text-primary font-black text-lg">サークルも一緒に探してみよう</h3>
            <p className="text-text-grey text-sm">
              ProofLoopでは全国の学生団体を検索できます。新歓情報・活動頻度・雰囲気がわかる詳細ページが揃っています。
            </p>
          </div>
          <Link
            href="/search"
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-white hover:bg-primary-hover transition-colors px-8 py-3 font-bold text-sm"
          >
            サークルを探す
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </section>
      </main>
    </div>
  );
}


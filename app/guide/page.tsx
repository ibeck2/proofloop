"use client";

import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  Plane,
  GraduationCap,
  Users,
  PiggyBank,
  Home,
  Calculator,
  ArrowRight,
} from "lucide-react";

const GUIDE_PAGES = [
  {
    href: "/baito",
    Icon: Briefcase,
    label: "バイト・インターン",
    status: "published",
    description: "授業・サークルと両立できるバイトの選び方、2025年最新の年収の壁、インターンとの違いまで徹底解説。",
    tags: ["年収の壁", "シフト選び", "インターン"],
  },
  {
    href: "/guide/career",
    Icon: Briefcase,
    label: "就活",
    status: "coming",
    description: "いつから始めるべき？自己分析・ES・面接・インターンまで、就活の全体像を学年別に解説。",
    tags: ["就活スケジュール", "自己分析", "インターン"],
  },
  {
    href: "/guide/study-abroad",
    Icon: Plane,
    label: "留学",
    status: "published",
    description: "費用・期間・手続き・語学力の目安など、大学生の留学に関する疑問をまとめて解決。",
    tags: ["費用", "休学・認定", "語学"],
  },
  {
    href: "/guide/credits",
    Icon: GraduationCap,
    label: "単位・授業",
    status: "published",
    description: "単位の取り方・落とし方・GPA・必修と選択の違いなど、履修計画で失敗しないための基礎知識。",
    tags: ["履修登録", "GPA", "必修・選択"],
  },
  {
    href: "/guide/circle",
    Icon: Users,
    label: "サークル",
    status: "published",
    description: "新歓の仕組み・複数サークルの掛け持ち・入り方・やめ方まで、サークル選びで迷わないためのガイド。",
    tags: ["新歓", "掛け持ち", "選び方"],
  },
  {
    href: "/guide/money",
    Icon: PiggyBank,
    label: "お金・奨学金",
    status: "published",
    description: "大学生の平均生活費・奨学金の種類・返済・節約術まで。お金の不安を解消するための基礎知識。",
    tags: ["奨学金", "生活費", "節約"],
  },
  {
    href: "/guide/living-alone",
    Icon: Home,
    label: "一人暮らし",
    status: "published",
    description: "初期費用・毎月の生活費・家賃相場・食費から、部屋探し・必要なものチェックリスト・仕送りなしで暮らす方法まで。",
    tags: ["初期費用", "家賃", "食費・自炊"],
  },
  {
    href: "/gpa",
    Icon: Calculator,
    label: "GPA",
    status: "published",
    description: "大学別の換算方式に対応。出典つきで正確にGPAを計算できます。",
    tags: ["GPA", "換算方式", "出典つき"],
  },
] as const;

export default function GuidePage() {
  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-2xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-ink" aria-hidden="true" />
            <span className="text-ink text-sm font-bold tracking-widest uppercase">Freshman Guide</span>
          </div>
          <h1 className="text-ink text-3xl md:text-5xl font-black leading-tight tracking-tight font-mincho">
            新入生ガイド
          </h1>
          <p className="text-graphite text-base md:text-lg leading-relaxed">
            バイト・就活・留学・単位・サークル・お金——大学生活でぶつかる疑問に、ProofLoopがまとめて答えます。
          </p>
        </section>

        {/* ガイド一覧 */}
        <section className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GUIDE_PAGES.map((page) => {
              const Icon = page.Icon;
              return (
                <div key={page.href} className="relative">
                  {page.status === "published" ? (
                    <Link href={page.href}
                      className="group border border-rule hover:border-ink/40 hover:shadow-sm transition-all p-6 flex flex-col gap-4 h-full">
                      <div className="w-12 h-12 bg-mist flex items-center justify-center">
                        <Icon className="w-6 h-6 text-ink" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-ink font-black text-lg">{page.label}どうする？</h2>
                          <span className="text-[10px] px-2 py-0.5 bg-ink text-paper font-bold">公開中</span>
                        </div>
                        <p className="text-graphite text-sm leading-relaxed">{page.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {page.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 bg-mist text-ink border border-rule">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-ink text-sm font-bold flex items-center gap-1 group-hover:underline">
                        読む
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </Link>
                  ) : (
                    <div className="border border-rule p-6 flex flex-col gap-4 h-full opacity-60">
                      <div className="w-12 h-12 bg-mist flex items-center justify-center">
                        <Icon className="w-6 h-6 text-ink" aria-hidden="true" />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-ink font-black text-lg">{page.label}どうする？</h2>
                          <span className="text-[10px] px-2 py-0.5 bg-mist text-graphite/70 font-bold">準備中</span>
                        </div>
                        <p className="text-graphite text-sm leading-relaxed">{page.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {page.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 bg-mist text-graphite/70 border border-rule">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-graphite/70 text-sm font-bold">近日公開</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* シミュレーター導線 */}
        <section className="bg-ink p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-black text-xl md:text-2xl text-paper font-mincho">
              バイト・授業・サークル、全部両立できる？
            </h2>
            <p className="text-sm text-paper/70">
              3問に答えるだけで可処分時間・月収・年収の壁を自動計算。
            </p>
          </div>
          <Link href="/baito/simulator"
            className="shrink-0 inline-flex items-center gap-2 bg-seal text-paper hover:bg-seal/90 transition-colors px-8 py-4 font-black text-base whitespace-nowrap">
            シミュレートしてみる
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </section>

        {/* サークル検索への導線 */}
        <section className="border border-rule p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="text-ink font-black text-lg">サークルも一緒に探してみよう</h3>
            <p className="text-graphite text-sm">
              ProofLoopでは全国の学生団体を検索できます。新歓情報・活動頻度・雰囲気がわかる詳細ページが揃っています。
            </p>
          </div>
          <Link href="/search"
            className="shrink-0 inline-flex items-center gap-2 bg-ink text-paper hover:bg-ink/90 transition-colors px-8 py-3 font-bold text-sm">
            サークルを探す
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </section>

      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

type TabId = "overview" | "reviews" | "events";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "基本情報" },
  { id: "reviews", label: "口コミ" },
  { id: "events", label: "新歓イベント" },
];

export default function ClubProfilePage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const starFilled = { fontVariationSettings: "'FILL' 1" as const };

  return (
    <div className="bg-white text-slate-900 font-display pb-20 md:pb-0">
      <main className="max-w-[960px] mx-auto px-4 md:px-10 pb-24">
        {/* Hero Area */}
        <div className="w-full aspect-[21/9] bg-neutral-100 mb-6 overflow-hidden">
          <img
            alt="University campus building with modern architecture"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBku0Wgq3CADd-CGp70mfW0_AGxmGaGHrtV8SF6UxfzYN1Cm0yFrC5cqCKzxyGHxbZgxy5IihjTafqc4Ufy1kRp_fbZvg4r4vt4esuFILqgQ8M2_VAJoYAjBKFanVLemwvWGO4IxMXReL2rPTbZA3Ienc7AVqnx2YM7zSYa2avWzdG3xhfQ1fr0S0P0KpKPPglAIeTPKvUAEvWNcTPSM93G-B-Etd6uJgf68RxvQwxEcd32LOKfb4c_F4-Q-kRVna8TXiItFabfkXQ"
          />
        </div>
        {/* Organization Info */}
        <div className="px-6 mb-8">
          <h2 className="text-primary text-4xl font-black mb-2">AFPLA (Asian Future Political Leaders Association)</h2>
          <div className="flex items-center gap-4 text-neutral-grey text-base">
            <span>東京大学 駒場キャンパス</span>
            <span>国際交流・政治</span>
          </div>
        </div>
        {/* Tab Menu */}
        <nav className="flex border-b border-border-grey mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 text-center font-bold border-b-4 transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-primary"
                  : "text-neutral-grey hover:text-primary border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {/* Content Area: 表示タブに応じて切り替え */}
        <div className="px-6">
          {activeTab === "overview" && (
            <section className="space-y-6">
              <h3 className="text-primary text-xl font-bold">基本情報</h3>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed">
                  AFPLA（Asian Future Political Leaders Association）は、東京大学駒場キャンパスを拠点とする国際交流・政治系の学生団体です。
                  アジア各国の学生と議論やプロジェクトを通じて、次世代のリーダーシップを育成します。
                </p>
                <div className="mt-6 space-y-4">
                  <div>
                    <h4 className="text-primary font-bold text-sm mb-2">活動内容</h4>
                    <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                      <li>東京開催 アジア学生国際会議の企画・運営</li>
                      <li>新入生歓迎 オリエンテーション</li>
                      <li>定例勉強会・ディスカッション</li>
                      <li>海外大学との交流プログラム</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-primary font-bold text-sm mb-2">直近の実績・イベント</h4>
                    <p className="text-slate-700 text-sm">
                      東京開催 アジア学生国際会議、新入生歓迎 オリエンテーションなどを実施。国際交流・政治に関心のある学生が多数参加しています。
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-12">
              <article className="border-b border-border-grey pb-10">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-primary">
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                    </div>
                    <span className="text-neutral-grey text-sm">2024年4月投稿</span>
                  </div>
                  <div className="flex gap-4 text-neutral-grey text-sm font-medium">
                    <span>政治経済学部</span>
                    <span>3年次</span>
                  </div>
                  <div className="text-slate-800 leading-relaxed text-lg">
                    イベントの企画から実行まで一貫して経験できる環境です
                    他学部との交流も非常に多くネットワークが広がります
                    広告業界を志望する学生には最適な活動内容だと言えます
                    就職活動時のガクチカとしても非常に強い武器になります
                  </div>
                </div>
              </article>
              <article className="border-b border-border-grey pb-10">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-primary">
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined">star</span>
                    </div>
                    <span className="text-neutral-grey text-sm">2024年2月投稿</span>
                  </div>
                  <div className="flex gap-4 text-neutral-grey text-sm font-medium">
                    <span>商学部</span>
                    <span>4年次</span>
                  </div>
                  <div className="text-slate-800 leading-relaxed text-lg">
                    サークル内の雰囲気は非常に活気があり刺激的です
                    週に一度の定例ミーティングは必須参加となっています
                    縦のつながりも強くOBOG訪問の際も非常に協力的でした
                    学業との両立は自分次第ですが充実した大学生活を送れます
                  </div>
                </div>
              </article>
              <article className="border-b border-border-grey pb-10">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-primary">
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined" style={starFilled}>star</span>
                      <span className="material-symbols-outlined">star</span>
                      <span className="material-symbols-outlined">star</span>
                    </div>
                    <span className="text-neutral-grey text-sm">2023年11月投稿</span>
                  </div>
                  <div className="flex gap-4 text-neutral-grey text-sm font-medium">
                    <span>文学部</span>
                    <span>2年次</span>
                  </div>
                  <div className="text-slate-800 leading-relaxed text-lg">
                    クリエイティブな作業が好きな人には向いています
                    デザインや動画編集のスキルを磨く機会が多くあります
                    忙しい時期は深夜まで作業することもありますが達成感があります
                    先輩方が丁寧に教えてくれるので初心者でも安心です
                  </div>
                </div>
              </article>
            </div>
          )}

          {activeTab === "events" && (
            <section className="space-y-6">
              <h3 className="text-primary text-xl font-bold">新歓イベント</h3>
              <p className="text-neutral-grey text-sm">新入生向けのイベント一覧です。</p>
              <ul className="border border-border-grey divide-y divide-border-grey">
                <li className="px-4 py-4 hover:bg-slate-50 transition-colors">
                  <Link href="/schedule" className="flex items-center justify-between gap-4 group">
                    <div>
                      <span className="font-bold text-primary group-hover:underline">新入生歓迎会</span>
                      <span className="text-neutral-grey text-sm ml-2">4月10日（木） 駒場キャンパス</span>
                    </div>
                    <span className="material-symbols-outlined text-neutral-grey">chevron_right</span>
                  </Link>
                </li>
                <li className="px-4 py-4 hover:bg-slate-50 transition-colors">
                  <Link href="/schedule" className="flex items-center justify-between gap-4 group">
                    <div>
                      <span className="font-bold text-primary group-hover:underline">広告研究会 説明会</span>
                      <span className="text-neutral-grey text-sm ml-2">4月15日（火） オンライン</span>
                    </div>
                    <span className="material-symbols-outlined text-neutral-grey">chevron_right</span>
                  </Link>
                </li>
                <li className="px-4 py-4 hover:bg-slate-50 transition-colors">
                  <Link href="/schedule" className="flex items-center justify-between gap-4 group">
                    <div>
                      <span className="font-bold text-primary group-hover:underline">OBOG交流会</span>
                      <span className="text-neutral-grey text-sm ml-2">4月22日（火） 学内</span>
                    </div>
                    <span className="material-symbols-outlined text-neutral-grey">chevron_right</span>
                  </Link>
                </li>
              </ul>
            </section>
          )}
        </div>
      </main>
      {/* Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-grey z-50">
        <div className="max-w-[960px] mx-auto flex justify-around items-center h-16">
          <Link className="flex flex-col items-center justify-center gap-1 text-primary" href="/">
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-bold">ホーム</span>
          </Link>
          <Link className="flex flex-col items-center justify-center gap-1 text-neutral-grey" href="/search">
            <span className="material-symbols-outlined">search</span>
            <span className="text-[10px] font-bold">検索</span>
          </Link>
          <Link className="flex flex-col items-center justify-center gap-1 text-neutral-grey" href="/schedule">
            <span className="material-symbols-outlined">calendar_today</span>
            <span className="text-[10px] font-bold">カレンダー</span>
          </Link>
          <Link className="flex flex-col items-center justify-center gap-1 text-neutral-grey" href="/clubprofile">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-bold">マイページ</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

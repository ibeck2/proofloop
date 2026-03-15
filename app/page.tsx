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
{/* Card 2: 過去問・授業レビュー */}
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
{/* Featured Content: Events */}
<UpcomingEvents />
</main>
    </div>
  );
}

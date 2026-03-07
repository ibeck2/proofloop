"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export default function Page() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[トップページ 検索] 送信データ:", { searchKeyword });
    if (searchKeyword.trim()) router.push(`/search?q=${encodeURIComponent(searchKeyword.trim())}`);
    else router.push("/search");
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-primary min-h-screen flex flex-col font-body pb-20 md:pb-0">
<main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">
{/* Hero Section */}
<section className="flex flex-col items-center justify-center gap-10 text-center max-w-4xl mx-auto w-full">
<h2 className="text-primary text-3xl md:text-5xl font-black leading-tight tracking-tight">
                螺旋の先へ<br className="hidden md:block"/>
                学生団体が社会を動かす新しい時代のスタンダード
            </h2>
<form onSubmit={handleSearchSubmit} className="w-full max-w-[640px] flex h-14 border border-text-grey/30 focus-within:border-primary transition-colors bg-white">
              <div className="flex items-center justify-center px-4 text-text-grey">
                <span className="material-symbols-outlined">search</span>
              </div>
              <Input
                className="flex-1 h-full border-0 focus:ring-0 focus:border-0 text-primary placeholder-text-grey/60 text-base font-medium px-0 rounded-none"
                placeholder="大学、サークル名、授業名で検索"
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <Button type="submit" variant="primary" className="h-full px-8 rounded-none">
                検索
              </Button>
            </form>
</section>
{/* Quick Access */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
{/* Card 1: サークルを探す */}
<Link className="group block border border-[#f0f2f5] bg-white hover:border-accent hover:shadow-sm transition-all p-8 flex flex-col items-center justify-center gap-4 text-center h-64 rounded-none" href="/search">
<div className="w-16 h-16 bg-primary/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors rounded-none">
<span className="material-symbols-outlined text-primary text-4xl group-hover:text-accent">groups</span>
</div>
<div className="flex flex-col gap-2">
<h3 className="text-primary text-xl font-bold">サークル比較検討</h3>
<p className="text-text-grey text-sm">自分に合った団体を見つける</p>
</div>
</Link>
{/* Card 2: 中の人口コミ */}
<Link className="group block border border-[#f0f2f5] bg-white hover:border-accent hover:shadow-sm transition-all p-8 flex flex-col items-center justify-center gap-4 text-center h-64 rounded-none" href="/search">
<div className="w-16 h-16 bg-primary/5 flex items-center justify-center group-hover:bg-accent/10 transition-colors rounded-none">
<span className="material-symbols-outlined text-primary text-4xl group-hover:text-accent">forum</span>
</div>
<div className="flex flex-col gap-2">
<h3 className="text-primary text-xl font-bold">中の人口コミ</h3>
<p className="text-text-grey text-sm">リアルな活動実態を知る</p>
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
{/* Featured Content: Events */}
<section className="w-full flex flex-col gap-8">
<div className="flex items-end justify-between border-b border-[#f0f2f5] pb-4">
<h3 className="text-primary text-2xl font-black">直近のイベント</h3>
<Link className="text-text-grey text-sm font-bold hover:text-primary flex items-center gap-1" href="/search">
                    全て見る
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</Link>
</div>
<div className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar snap-x snap-mandatory">
{/* Event Card 1 */}
<article className="flex-none snap-start w-[320px] bg-white border border-[#f0f2f5] hover:border-text-grey/30 transition-colors rounded-none">
<div className="h-40 w-full bg-cover bg-center" data-alt="University campus students gathering" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBSTKC4oFDJih5T7vGHyyrUw1IDzmGHEfKNJW7-0V9r9YnlXK-RE2iulBDZ7IVc9yAqOz6ypj2V36xayoqLBPPBQcTTmgYuxpnJc5xcvflK69km4OBfVE-uaah-Ep-ojfmE1ySWht5vKmPfDn_iaAPhFD7D7I3F1dPdmih9Sqq6Z6f9yvMpRKmD1KpCBZ_e5h2Pfp_8_SlVaKe8q5aFo8h0ewsfEDOi2dt476sCJMY1-2ZFLs3TBBxC_SkzvCohHhqpmcvvD291K6c')" }}>
<div className="w-full h-full bg-primary/10"></div>
</div>
<div className="p-6 flex flex-col gap-4">
<div className="flex flex-col gap-1">
<span className="text-xs font-bold text-text-grey uppercase tracking-wider">東京大学 国際交流サークル</span>
<h4 className="text-primary text-lg font-bold line-clamp-2">春の新入生歓迎会 留学生と交流しよう</h4>
</div>
<div className="flex flex-col gap-2 text-sm text-text-grey">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                2024年4月12日
                            </div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">location_on</span>
                                駒場キャンパス 1号館
                            </div>
</div>
<Link className="mt-2 text-accent text-sm font-bold hover:underline flex items-center gap-1" href="/clubprofile">
                            詳細を見る
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
</article>
{/* Event Card 2 */}
<article className="flex-none snap-start w-[320px] bg-white border border-[#f0f2f5] hover:border-text-grey/30 transition-colors rounded-none">
<div className="h-40 w-full bg-cover bg-center" data-alt="Students collaborating in a seminar room" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDvQjBg-Uu5dcRVw3YdBbCPqYgofgQ7pomqDbCcA_sq10sfrWapMOg0_ZBKbv_2jVexckzjl-QNl4htGsBHcz9FNc5LVSYBdK6Y2CMpTIMT8jxgc9l1JXTdxz43_BvBueYuraIhtdSSwhE5z0kHnJysL-0sG73GTwZdvnsmgJfZTL_cp8dtMRMJxjGEO8qJXxid0At82icVG1aQmbmGTKHRZVB8vkIA2Cl6KZEPdF0mhsOTX-_RC3fG2mcxTqUGwBJImLPkkAtgE9A')" }}>
<div className="w-full h-full bg-primary/10"></div>
</div>
<div className="p-6 flex flex-col gap-4">
<div className="flex flex-col gap-1">
<span className="text-xs font-bold text-text-grey uppercase tracking-wider">早稲田大学 起業家支援団体</span>
<h4 className="text-primary text-lg font-bold line-clamp-2">スタートアップピッチイベント vol.5</h4>
</div>
<div className="flex flex-col gap-2 text-sm text-text-grey">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                2024年4月15日
                            </div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">location_on</span>
                                早稲田キャンパス 11号館
                            </div>
</div>
<Link className="mt-2 text-accent text-sm font-bold hover:underline flex items-center gap-1" href="/clubprofile">
                            詳細を見る
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
</article>
{/* Event Card 3 */}
<article className="flex-none snap-start w-[320px] bg-white border border-[#f0f2f5] hover:border-text-grey/30 transition-colors rounded-none">
<div className="h-40 w-full bg-cover bg-center" data-alt="Outdoor festival scene on campus" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAHCUuJGUc2VL8KvBp39ZLicl_Yn-pgyGKrQanA6eHFtt9mozjhRQcgcmfzX5rZuNURCQ_7HPPgVFYmIWfZsdULkePeMcnzXGkVnuiWLPFH-kf2_suAyTLpbGuxX_eMtPyy4KMoDoQ-lfgf038wYtNZ55YcRKKrl88nLT7parYiUwYDpQvV7hRVADAYQg1zHapvGrZKVhjkWgxVjkx9e8lV3RENRw_EFoPCzONMAb9h-KBJeFYUc4gaefHpmko04zlKVx10_-9A7LY')" }}>
<div className="w-full h-full bg-primary/10"></div>
</div>
<div className="p-6 flex flex-col gap-4">
<div className="flex flex-col gap-1">
<span className="text-xs font-bold text-text-grey uppercase tracking-wider">慶應義塾大学 学園祭実行委員会</span>
<h4 className="text-primary text-lg font-bold line-clamp-2">三田祭 第1回説明会 参加者募集</h4>
</div>
<div className="flex flex-col gap-2 text-sm text-text-grey">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                2024年4月20日
                            </div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">location_on</span>
                                三田キャンパス 南校舎
                            </div>
</div>
<Link className="mt-2 text-accent text-sm font-bold hover:underline flex items-center gap-1" href="/clubprofile">
                            詳細を見る
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
</article>
{/* Event Card 4 */}
<article className="flex-none snap-start w-[320px] bg-white border border-[#f0f2f5] hover:border-text-grey/30 transition-colors rounded-none">
<div className="h-40 w-full bg-cover bg-center" data-alt="Students studying in library" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDnIgJaq4EHDZdFRqRmWQNdx79uIGdbSbnKfcAT9h5WDQc1g7oI7IfMjlydyHXE9AY4mfvBWu6I2Ne7xvG107IVmzyRczG6YettgS8mFU6kMZ8m7ckccIQ0SAV71JcWOgQAoJNR6_T0UnAk5dZG24Y6_Xacvd_px7lgfd0YK75k73W9f0v4sFvicgwgZVqAtzLZoDOtK80JRQ9ckzsnX01DepT_edkeAlLzKo-lkOnxzfAF_qvruPv5gm7m9cX5D-IrA6mMFeJu9Z8')" }}>
<div className="w-full h-full bg-primary/10"></div>
</div>
<div className="p-6 flex flex-col gap-4">
<div className="flex flex-col gap-1">
<span className="text-xs font-bold text-text-grey uppercase tracking-wider">全大学共通 就活支援ネットワーク</span>
<h4 className="text-primary text-lg font-bold line-clamp-2">26卒向け ES対策講座 基礎編</h4>
</div>
<div className="flex flex-col gap-2 text-sm text-text-grey">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                2024年4月22日
                            </div>
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-[18px]">videocam</span>
                                オンライン開催
                            </div>
</div>
<Link className="mt-2 text-accent text-sm font-bold hover:underline flex items-center gap-1" href="/clubprofile">
                            詳細を見る
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
</Link>
</div>
</article>
</div>
</section>
</main>
    </div>
  );
}

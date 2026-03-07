"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Input } from "@/components/ui";

export default function CompanySearchPage() {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [scale, setScale] = useState("");
  const [proofScore, setProofScore] = useState("");
  const [sponsorType, setSponsorType] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { keyword, category, scale, proofScore, sponsorType };
    console.log("[団体検索・スカウト] 送信データ:", payload);
    // Supabase 用: console.log("companysearch", payload);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased text-[#141018] h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-64 h-full bg-primary text-white flex-shrink-0">
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto">
          <Link className="flex items-center gap-3 px-3 py-3 hover:bg-white/10 transition-colors text-white/70 hover:text-white group" href="/companydashborad">
            <span className="material-symbols-outlined group-hover:text-white transition-colors">dashboard</span>
            <span className="text-sm font-medium">ダッシュボード</span>
          </Link>
          <Link className="flex items-center gap-3 px-3 py-3 bg-white/10 text-white border-l-4 border-white" href="/companysearch">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
            <span className="text-sm font-bold">団体検索</span>
          </Link>
          <Link className="flex items-center gap-3 px-3 py-3 hover:bg-white/10 transition-colors text-white/70 hover:text-white group" href="/companymessage">
            <span className="material-symbols-outlined group-hover:text-white transition-colors">mail</span>
            <span className="text-sm font-medium">メッセージ</span>
          </Link>
          <Link className="flex items-center gap-3 px-3 py-3 hover:bg-white/10 transition-colors text-white/70 hover:text-white group" href="/companydashborad">
            <span className="material-symbols-outlined group-hover:text-white transition-colors">settings</span>
            <span className="text-sm font-medium">設定</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-300 bg-cover bg-center flex-shrink-0 no-rounded" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCX04UlULZp0ZW7zCjJ42HvjrTSLNLawJ7KBK6E8zIBkpM4UYOUEUPtQ7vWepo8ghrJuxW4NeSSrczNaE-Cml--ZoOOZpGdS_DRrP2WbS7DTyuXqrclDXDmGAirJSKr3tJRaI4hpyUOcosyoETDxiY45dkUY4foqpxm_ULtjbl6R1JzRzN6q-PJdHHzk16VXJ5I5IIe2acUmQl-Zxw6YPbXmWW7yexB97KuRL2K0-Qf2nnOovHPXNBl7FZTN_Ebdo7sLaaLYMBbPkM')" }} />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white leading-tight">田中 健太</span>
              <span className="text-xs text-white/60">株式会社NextStep</span>
            </div>
          </div>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-5">
          <h2 className="text-2xl font-bold text-primary tracking-tight">団体検索・スカウト</h2>
        </header>
        {/* Filter Section */}
        <section className="bg-filter-bg px-8 py-6 border-b border-gray-200 shadow-sm z-10">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 max-w-7xl">
            <div className="w-full">
              <div className="relative flex items-center w-full">
                <Input
                  className="h-12 pl-4 pr-12 text-sm shadow-sm rounded-none"
                  placeholder="キーワードで検索"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                <Button type="submit" variant="primary" className="absolute right-0 top-0 h-12 w-12 min-w-12 p-0 rounded-none">
                  <span className="material-symbols-outlined">search</span>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-8 bg-white border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer no-rounded shadow-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option disabled value="">活動カテゴリ</option>
                  <option value="culture">文化系</option>
                  <option value="sports">体育会系</option>
                  <option value="academic">学術系</option>
                  <option value="business">ビジネス</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <span className="material-symbols-outlined text-xl">expand_more</span>
                </div>
              </div>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-8 bg-white border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer no-rounded shadow-sm"
                  value={scale}
                  onChange={(e) => setScale(e.target.value)}
                >
                  <option disabled value="">規模</option>
                  <option value="small">10人未満</option>
                  <option value="medium">10-50人</option>
                  <option value="large">50-100人</option>
                  <option value="huge">100人以上</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <span className="material-symbols-outlined text-xl">expand_more</span>
                </div>
              </div>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-8 bg-white border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer no-rounded shadow-sm"
                  value={proofScore}
                  onChange={(e) => setProofScore(e.target.value)}
                >
                  <option disabled value="">Proofスコア</option>
                  <option value="high">80以上</option>
                  <option value="mid">60以上</option>
                  <option value="low">40以上</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <span className="material-symbols-outlined text-xl">expand_more</span>
                </div>
              </div>
              <div className="relative">
                <select
                  className="w-full h-10 pl-3 pr-8 bg-white border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer no-rounded shadow-sm"
                  value={sponsorType}
                  onChange={(e) => setSponsorType(e.target.value)}
                >
                  <option disabled value="">希望協賛形態</option>
                  <option value="monetary">資金協賛</option>
                  <option value="goods">物品協賛</option>
                  <option value="venue">会場協賛</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                  <span className="material-symbols-outlined text-xl">expand_more</span>
                </div>
              </div>
            </div>
          </form>
        </section>
        {/* Results List */}
        <section className="flex-1 overflow-y-auto bg-white p-8">
          <div className="max-w-7xl flex flex-col gap-0 divide-y divide-gray-100">
            {[
              { name: "早稲田大学マーケティング研究会", university: "早稲田大学", tags: ["論理的思考力", "SNS発信力", "企画力"], score: 85, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuClvceJYliy4ZZe6cNp5glfYllfKZaxqiynj9F6Mw2JRP-qXCdscbuiLYhUEJntbHCKQIvh9d2SWMI2-nffYz-NKZW8n6nCxaarrvNPSjxTCcaWEF5cMzgxC3slqJrhpR_A6nMHaYzLkSeXrlYiolmLsnGipJtW4MDKidT2i8doZcMj38MtJqggoctEnroTgiZFBg0WkrP4LfAgpWefnEBmCzc7ATE34qIu6ySQJUBr5j4DtaAyemuP4uGynp1CAQcAvXthQyVJP0c" },
              { name: "慶應義塾大学広告学研究会", university: "慶應義塾大学", tags: ["クリエイティブ", "イベント運営"], score: 82, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDW-EsmfQ-lEYaO6EZc6Xx36YQRJKBvnhpY1I8-a7pUPv3bJBW_Azsr6zBjPRbdoFNf1elUCjvyJNx4gSjybs2GrFYSYscENLCAoxML7pse9b2rqpCWbPVLPLUW0zGWoe7tpDOelr-BSuMvHuQnJNDoYHbo6tbWvUJplkO3mt-kW2Y8hAkwj6IvsJApLqdg2-eAniPL4jfoWDwtaA4JiMnpRkN3-fSc7lUSBdPDAmlzLtzD-gbrBd6GOk8Ely6rbubnaL7ivoYRoXY" },
              { name: "東京大学起業サークルTNK", university: "東京大学", tags: ["ビジネス開発", "プレゼン力", "リーダーシップ", "ITスキル"], score: 79, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRmuoXKTWP_6wtQ7Twag4HGgsEO83kWTcuyGdAbmyWaRXyIY2JQ11-tKOzdjNt4tUfFc-S6mGXSILlxTw1QMR267CusyQJKyBrQUlirTOW_xrKRuoWmJ38MMrP6Gb0LhsV8EzFfXMIHMUz0UqarplfALpstrihJLt3QbvQstJ_z37cH5N8xJo_OB3CuS4ikszbTlhchYXDg4KVJabQq01tjEdL2ChR3rBb8mKofe5YsbUPoglmR8Gs6hbtP3NoWYEDGmSq6ZV3g5I" },
              { name: "上智大学国際ボランティアサークル", university: "上智大学", tags: ["語学力", "異文化理解", "チームワーク"], score: 76, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAywbdxfVfMGZAso2KkQ4ijXy3t8qbzPEcF1FyGd_4pWpnjsZN227_doiBGqjwyNoqvdlbim9_5SJl4FkVDuQddvRnV9XAbfrsbQ5bxPhTSjU0jKdBzYaw6cK1Yaut0eXVXqJl45lgPB--XVwkqLeNCwyKJHrc6lTBhfW4f5ri3O9-hh079HO24bAGNWNZO3EHEhzTvqazaUGoTGEU8LXjeaXeQrlcpA3jLyqtxeL3kIlI-dLnRm2sSK4QafHrFX4oP4c3BnbZrrYI" },
              { name: "明治大学放送研究会", university: "明治大学", tags: ["映像制作", "アナウンス"], score: 72, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCP_u33imToUPa9PrtRXZ_eRTivd0FUZ8j2enyvGOKqugKMIhnOGB7T2Jer-D1xBfnxrg8xwsVmyfii3AqfPEvNtAH2SfLCq5RnnuGm01xGdndfNZwAeYoRSdPCut0_2w8pFQ_DDsEyKsbzqfYVxY4SEVRUpIGGzzkKrc8BZZl12uJefMZIZ8idqjKiYGbcc6XEbf-HuC0jfZZBrcKGZW4lOqawBVcPmpUVZ0RlucywuZGqsT9l4ZEnMixEq_qIYY8R6styDYcYB0o" },
            ].map((item) => (
              <article key={item.name} className="flex flex-col md:flex-row items-center gap-6 py-6 hover:bg-gray-50 transition-colors px-4 -mx-4 group">
                <div className="flex items-center gap-4 w-full md:w-1/3 min-w-[280px]">
                  <div className="w-16 h-16 bg-gray-200 bg-cover bg-center flex-shrink-0 no-rounded shadow-sm" style={{ backgroundImage: `url('${item.image}')` }} />
                  <div className="flex flex-col gap-1">
                    <h3 className="text-base font-bold text-primary leading-tight group-hover:underline cursor-pointer">{item.name}</h3>
                    <p className="text-sm text-secondary">{item.university}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-1/3">
                  {item.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 text-xs font-medium text-secondary no-rounded">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between md:justify-end gap-8 w-full md:w-1/3 pl-0 md:pl-4">
                  <div className="flex flex-col items-center md:items-end">
                    <span className="text-xs text-secondary font-medium uppercase tracking-wider">Proofスコア</span>
                    <span className="text-2xl font-bold text-accent">{item.score}</span>
                  </div>
                  <button className="bg-primary hover:bg-primary-hover text-white text-sm font-bold py-2.5 px-6 transition-colors no-rounded shadow-sm whitespace-nowrap">オファーを作成</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

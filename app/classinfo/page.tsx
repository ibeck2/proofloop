"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export default function ClassInfoPage() {
  const [department, setDepartment] = useState("");
  const [courseName, setCourseName] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { department, courseName };
    console.log("[授業レビュー・過去問 検索] 送信データ:", payload);
    // Supabase 用: console.log("classinfo_search", payload);
  };

  return (
    <div className="bg-background-light text-slate-900 min-h-screen pb-20 md:pb-0" style={{ backgroundColor: "#f5f7f8" }}>
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="mb-10">
          <h2 className="text-primary text-4xl font-black tracking-tight mb-2">授業レビューと過去問</h2>
          <div className="w-20 h-1 bg-primary" />
        </div>
        {/* Search Area */}
        <section className="bg-white border border-slate-200 p-8 mb-12">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="md:col-span-5">
              <label className="block text-primary font-bold mb-3 text-sm">学部 学科</label>
              <Input
                className="h-14 px-4 bg-slate-50"
                placeholder="学部 学科を入力"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="md:col-span-5">
              <label className="block text-primary font-bold mb-3 text-sm">授業名 教授名</label>
              <Input
                className="h-14 px-4 bg-slate-50"
                placeholder="授業名 教授名を入力"
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="primary" className="w-full h-14">
                <span className="material-symbols-outlined text-lg">search</span>
                検索
              </Button>
            </div>
          </form>
        </section>
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar: Popular Courses */}
          <aside className="w-full lg:w-1/4 order-2 lg:order-1">
            <div className="bg-white border border-slate-200">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
                <h3 className="text-primary font-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">trending_up</span>
                  人気の授業
                </h3>
              </div>
              <ul className="divide-y divide-slate-100">
                <li className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <a className="text-primary font-medium text-sm leading-relaxed block" href="#">経済学入門 第一部</a>
                </li>
                <li className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <a className="text-primary font-medium text-sm leading-relaxed block" href="#">国際政治学 特論</a>
                </li>
                <li className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <a className="text-primary font-medium text-sm leading-relaxed block" href="#">統計アルゴリズム 基礎</a>
                </li>
                <li className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <a className="text-primary font-medium text-sm leading-relaxed block" href="#">現代社会学 A</a>
                </li>
                <li className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <a className="text-primary font-medium text-sm leading-relaxed block" href="#">民法 債権総論</a>
                </li>
                <li className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <a className="text-primary font-medium text-sm leading-relaxed block" href="#">情報リテラシー 演習</a>
                </li>
              </ul>
            </div>
          </aside>
          {/* Main Grid: Search Results */}
          <div className="w-full lg:w-3/4 order-1 lg:order-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course Card 1 */}
              <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-primary font-black text-xl mb-1">マクロ経済学 基礎</h4>
                    <div className="flex flex-col text-secondary-grey text-sm font-medium">
                      <span>田中 太郎 教授</span>
                      <span>経済学部 経済学科</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-secondary-grey block uppercase tracking-tighter">単位取得</span>
                    <span className="text-accent-red text-5xl font-black italic leading-none">A</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex gap-6 text-secondary-grey">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>過去問ファイル数 12</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    <span>レビュー数 48</span>
                  </div>
                </div>
              </div>
              {/* Course Card 2 */}
              <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-primary font-black text-xl mb-1">憲法 第一部</h4>
                    <div className="flex flex-col text-secondary-grey text-sm font-medium">
                      <span>佐藤 結衣 教授</span>
                      <span>法学部 法律学科</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-secondary-grey block uppercase tracking-tighter">単位取得</span>
                    <span className="text-accent-red text-5xl font-black italic leading-none">C</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex gap-6 text-secondary-grey">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>過去問ファイル数 3</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    <span>レビュー数 15</span>
                  </div>
                </div>
              </div>
              {/* Course Card 3 */}
              <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-primary font-black text-xl mb-1">心理学 概論</h4>
                    <div className="flex flex-col text-secondary-grey text-sm font-medium">
                      <span>伊藤 健一 教授</span>
                      <span>文学部 心理学科</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-secondary-grey block uppercase tracking-tighter">単位取得</span>
                    <span className="text-accent-red text-5xl font-black italic leading-none">B</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex gap-6 text-secondary-grey">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>過去問ファイル数 8</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    <span>レビュー数 22</span>
                  </div>
                </div>
              </div>
              {/* Course Card 4 */}
              <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-primary font-black text-xl mb-1">量子力学 A</h4>
                    <div className="flex flex-col text-secondary-grey text-sm font-medium">
                      <span>鈴木 誠 教授</span>
                      <span>理学部 物理学科</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-secondary-grey block uppercase tracking-tighter">単位取得</span>
                    <span className="text-accent-red text-5xl font-black italic leading-none">F</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex gap-6 text-secondary-grey">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>過去問ファイル数 2</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    <span>レビュー数 5</span>
                  </div>
                </div>
              </div>
              {/* Course Card 5 */}
              <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-primary font-black text-xl mb-1">比較政治学</h4>
                    <div className="flex flex-col text-secondary-grey text-sm font-medium">
                      <span>山本 直樹 教授</span>
                      <span>政治経済学部 政治学科</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-secondary-grey block uppercase tracking-tighter">単位取得</span>
                    <span className="text-accent-red text-5xl font-black italic leading-none">A</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex gap-6 text-secondary-grey">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>過去問ファイル数 15</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    <span>レビュー数 34</span>
                  </div>
                </div>
              </div>
              {/* Course Card 6 */}
              <div className="bg-white border border-slate-200 p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-primary font-black text-xl mb-1">データ構造と演習</h4>
                    <div className="flex flex-col text-secondary-grey text-sm font-medium">
                      <span>高橋 明美 教授</span>
                      <span>工学部 情報学科</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-bold text-secondary-grey block uppercase tracking-tighter">単位取得</span>
                    <span className="text-accent-red text-5xl font-black italic leading-none">B</span>
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 flex gap-6 text-secondary-grey">
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>過去問ファイル数 6</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                    <span>レビュー数 19</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Pagination (Abstract) */}
            <div className="mt-12 flex justify-center gap-2">
              <button className="w-12 h-12 flex items-center justify-center border border-slate-200 bg-white text-primary font-bold">1</button>
              <button className="w-12 h-12 flex items-center justify-center border border-slate-200 bg-white text-slate-400 font-bold hover:bg-slate-50">2</button>
              <button className="w-12 h-12 flex items-center justify-center border border-slate-200 bg-white text-slate-400 font-bold hover:bg-slate-50">3</button>
              <button className="w-12 h-12 flex items-center justify-center border border-slate-200 bg-white text-slate-400 font-bold hover:bg-slate-50">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </main>
      {/* Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 h-16 flex items-center justify-around z-50">
        <a className="flex flex-col items-center text-primary" href="/">
          <span className="material-symbols-outlined text-2xl">home</span>
          <span className="text-[10px] font-bold">ホーム</span>
        </a>
        <a className="flex flex-col items-center text-slate-400" href="/search">
          <span className="material-symbols-outlined text-2xl">search</span>
          <span className="text-[10px] font-bold">検索</span>
        </a>
        <a className="flex flex-col items-center text-slate-400" href="#">
          <span className="material-symbols-outlined text-2xl">calendar_month</span>
          <span className="text-[10px] font-bold">カレンダー</span>
        </a>
        <a className="flex flex-col items-center text-slate-400" href="#">
          <span className="material-symbols-outlined text-2xl">person</span>
          <span className="text-[10px] font-bold">マイページ</span>
        </a>
      </nav>
      {/* Footer for Whitespace Balance */}
      <footer className="bg-white border-t border-slate-200 py-12 mt-20 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-2xl">school</span>
            <span className="text-primary text-xl font-black">ProofLoop</span>
          </div>
          <p className="text-secondary-grey text-xs font-bold tracking-widest uppercase">ProofLoop 2024 すべての権利を保有</p>
        </div>
      </footer>
    </div>
  );
}

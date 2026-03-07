"use client";

import { useState } from "react";
import { Button, Input, Textarea } from "@/components/ui";

export default function SchedulePage() {
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      eventTitle: eventTitle.trim(),
      eventDate: eventDate.trim(),
      eventTime: eventTime.trim(),
      location: location.trim(),
      description: description.trim(),
    };
    console.log("[イベント登録 送信] 送信データ:", JSON.stringify(payload, null, 2));
    setEventTitle("");
    setEventDate("");
    setEventTime("");
    setLocation("");
    setDescription("");
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-20 md:pb-0" style={{ backgroundColor: "#f5f7f8" }}>
      <main className="max-w-[800px] mx-auto px-4 pb-24">
        {/* 新規イベント登録フォーム */}
        <section className="mt-6 mb-8 p-6 bg-white dark:bg-slate-800 border border-grey-custom/20 rounded-none">
          <h2 className="text-lg font-bold text-primary mb-4">新規イベントを登録</h2>
          <form onSubmit={handleEventSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">イベント名</label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="例: 新歓説明会"
                className="bg-white dark:bg-slate-700"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">日付</label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="bg-white dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">開始時刻</label>
                <Input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="bg-white dark:bg-slate-700"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">場所</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例: 学生館 1号室"
                className="bg-white dark:bg-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">説明（任意）</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="イベントの詳細を入力"
                className="min-h-[80px] bg-white dark:bg-slate-700"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">
              イベントを登録
            </Button>
          </form>
        </section>
        {/* View Toggle Controls */}
        <div className="flex border-b border-grey-custom/20">
          <button className="flex-1 py-4 text-grey-custom font-medium hover:bg-grey-custom/5 transition-colors">
            月間表示
          </button>
          <button className="flex-1 py-4 text-primary font-bold border-b-2 border-primary bg-primary/5">
            リスト表示
          </button>
        </div>
        {/* Date Section: 四月五日 月 */}
        <section className="mt-8">
          <div className="px-4 py-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">四月五日 月</h2>
            <div className="h-px bg-grey-custom w-full" />
          </div>
          <div className="flex flex-col">
            {/* Event Item 1 */}
            <div className="flex items-start px-4 py-8 hover:bg-white dark:hover:bg-slate-800 transition-colors">
              <div className="w-20 shrink-0">
                <span className="text-primary font-bold text-lg">10:00</span>
              </div>
              <div className="flex-1 px-4">
                <p className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">テニスサークル</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">新歓説明会</h3>
                <div className="flex items-center gap-1 text-grey-custom">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="text-sm">学生館</span>
                </div>
              </div>
              <div className="shrink-0 text-grey-custom">
                <button className="p-2 hover:bg-grey-custom/10">
                  <span className="material-symbols-outlined">calendar_add_on</span>
                </button>
              </div>
            </div>
            {/* Event Item 2 */}
            <div className="flex items-start px-4 py-8 hover:bg-white dark:hover:bg-slate-800 transition-colors border-t border-grey-custom/10">
              <div className="w-20 shrink-0">
                <span className="text-primary font-bold text-lg">13:00</span>
              </div>
              <div className="flex-1 px-4">
                <p className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">軽音部</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">ライブ演奏会</h3>
                <div className="flex items-center gap-1 text-grey-custom">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="text-sm">第一ホール</span>
                </div>
              </div>
              <div className="shrink-0 text-grey-custom">
                <button className="p-2 hover:bg-grey-custom/10">
                  <span className="material-symbols-outlined">calendar_add_on</span>
                </button>
              </div>
            </div>
            {/* Event Item 3 */}
            <div className="flex items-start px-4 py-8 hover:bg-white dark:hover:bg-slate-800 transition-colors border-t border-grey-custom/10">
              <div className="w-20 shrink-0">
                <span className="text-primary font-bold text-lg">16:30</span>
              </div>
              <div className="flex-1 px-4">
                <p className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">茶道研究会</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">体験お茶会</h3>
                <div className="flex items-center gap-1 text-grey-custom">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="text-sm">和室二号</span>
                </div>
              </div>
              <div className="shrink-0 text-grey-custom">
                <button className="p-2 hover:bg-grey-custom/10">
                  <span className="material-symbols-outlined">calendar_add_on</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Date Section: 四月六日 火 */}
        <section className="mt-8">
          <div className="px-4 py-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">四月六日 火</h2>
            <div className="h-px bg-grey-custom w-full" />
          </div>
          <div className="flex flex-col">
            {/* Event Item 4 */}
            <div className="flex items-start px-4 py-8 hover:bg-white dark:hover:bg-slate-800 transition-colors">
              <div className="w-20 shrink-0">
                <span className="text-primary font-bold text-lg">11:00</span>
              </div>
              <div className="flex-1 px-4">
                <p className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">起業サークル</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">交流会</h3>
                <div className="flex items-center gap-1 text-grey-custom">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="text-sm">オンライン</span>
                </div>
              </div>
              <div className="shrink-0 text-grey-custom">
                <button className="p-2 hover:bg-grey-custom/10">
                  <span className="material-symbols-outlined">calendar_add_on</span>
                </button>
              </div>
            </div>
            {/* Event Item 5 */}
            <div className="flex items-start px-4 py-8 hover:bg-white dark:hover:bg-slate-800 transition-colors border-t border-grey-custom/10">
              <div className="w-20 shrink-0">
                <span className="text-primary font-bold text-lg">14:00</span>
              </div>
              <div className="flex-1 px-4">
                <p className="text-primary font-bold text-sm mb-1 uppercase tracking-wider">映画制作サークル</p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">上映会および説明会</h3>
                <div className="flex items-center gap-1 text-grey-custom">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  <span className="text-sm">学生会館視聴覚室</span>
                </div>
              </div>
              <div className="shrink-0 text-grey-custom">
                <button className="p-2 hover:bg-grey-custom/10">
                  <span className="material-symbols-outlined">calendar_add_on</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Date Section: 四月七日 水 */}
        <section className="mt-8">
          <div className="px-4 py-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">四月七日 水</h2>
            <div className="h-px bg-grey-custom w-full" />
          </div>
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <span className="material-symbols-outlined text-grey-custom/30 text-6xl mb-4">event_busy</span>
            <p className="text-grey-custom font-medium">この日の予定はありません</p>
          </div>
        </section>
      </main>
      {/* Bottom Navigation (Mobile/Desktop Fixed) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-grey-custom/20 z-50">
        <div className="max-w-[800px] mx-auto flex">
          <a className="flex-1 flex flex-col items-center justify-center py-3 text-grey-custom hover:text-primary transition-colors" href="/">
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] mt-1 font-bold">ホーム</span>
          </a>
          <a className="flex-1 flex flex-col items-center justify-center py-3 text-grey-custom hover:text-primary transition-colors" href="/search">
            <span className="material-symbols-outlined">search</span>
            <span className="text-[10px] mt-1 font-bold">検索</span>
          </a>
          <a className="flex-1 flex flex-col items-center justify-center py-3 text-primary bg-primary/5 transition-colors" href="/schedule">
            <span className="material-symbols-outlined">calendar_today</span>
            <span className="text-[10px] mt-1 font-bold">カレンダー</span>
          </a>
          <a className="flex-1 flex flex-col items-center justify-center py-3 text-grey-custom hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] mt-1 font-bold">マイページ</span>
          </a>
        </div>
      </nav>
    </div>
  );
}

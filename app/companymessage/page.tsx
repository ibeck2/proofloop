"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Textarea } from "@/components/ui";

export default function CompanymessagePage() {
  const [message, setMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { message: message.trim() };
    console.log("[メッセージ 送信] 送信データ:", JSON.stringify(payload, null, 2));
    setMessage("");
    toast.success("メッセージを送信しました");
  };

  return (
    <div className="bg-background-message font-display text-slate-900 no-rounded flex h-screen w-full overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-navy-custom flex flex-col justify-between p-6 shrink-0">
        <div className="flex flex-col gap-8">
          <nav className="flex flex-col gap-2">
            <Link className="flex items-center gap-4 px-3 py-3 bg-white/10 text-white" href="/companydashborad">
              <span className="material-symbols-outlined">home</span>
              <span className="text-sm font-medium">ホーム</span>
            </Link>
            <Link className="flex items-center gap-4 px-3 py-3 text-white/70 hover:bg-white/5" href="/companymessage">
              <span className="material-symbols-outlined">chat</span>
              <span className="text-sm font-medium">メッセージ</span>
            </Link>
            <Link className="flex items-center gap-4 px-3 py-3 text-white/70 hover:bg-white/5" href="/companysearch">
              <span className="material-symbols-outlined">search</span>
              <span className="text-sm font-medium">学生団体検索</span>
            </Link>
            <Link className="flex items-center gap-4 px-3 py-3 text-white/70 hover:bg-white/5" href="/companydashborad">
              <span className="material-symbols-outlined">handshake</span>
              <span className="text-sm font-medium">協賛管理</span>
            </Link>
            <Link className="flex items-center gap-4 px-3 py-3 text-white/70 hover:bg-white/5 mt-4" href="/companydashborad">
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm font-medium">設定</span>
            </Link>
          </nav>
        </div>
        <button className="flex items-center justify-center gap-2 bg-accent text-white py-3 px-4 font-bold text-sm">
          <span className="material-symbols-outlined text-sm">logout</span>
          <span>ログアウト</span>
        </button>
      </aside>
      {/* Message List */}
      <section className="w-[30%] border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-navy-custom">メッセージ一覧</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-start gap-4 cursor-pointer">
            <div className="w-12 h-12 bg-slate-200 shrink-0 overflow-hidden">
              <img className="w-full h-full object-cover" alt="University club logo placeholder" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFkFO_CXn9HkEk3LGU1l-ew0yXxRSs1Usrwdq5bdEl90oIaGyGZzKuePTTqF03RhsmDEeNMIpI68pZvRQohtJpuA-rCSQuWYExdZntasqLAHZbuGv5igGqLYoyYXH6kYpnBZjQqyqL5C0kH87pmHzaFWSwyYrDMr4EMUj0hb63CJklX9jcPxeWZErcMO5HJGX7Or9ftY1uZyhqhaIRHuIR6Lksijmb7JwXw8MqENnoOM9n5Hc_f66h_UCz0TtkwqjUunKm75Tqw1s" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-bold text-slate-900 truncate">慶應義塾大学 〇〇部</span>
                <span className="text-[10px] text-grey-custom">10:45</span>
              </div>
              <p className="text-xs text-grey-custom line-clamp-1">提案書を確認いたしました</p>
            </div>
          </div>
          <div className="p-5 border-b border-slate-100 hover:bg-slate-50 flex items-start gap-4 cursor-pointer relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-accent" />
            <div className="w-12 h-12 bg-slate-200 shrink-0 overflow-hidden">
              <img className="w-full h-full object-cover" alt="Student organization profile image" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB7mnkImDZzfdmmhUx6VwTUrxSiMqHg8E9Jybz9PJkvmzU5X-CGHN-2QlAuBFajVnzlUcF0vb95B10iqQflRG_KSB-e3xdN30E2QPJZR2kpeoDkZ39SxTvdIQZD1t-zbwpwEZCw10quMMqw2msPcenr8qXKUkn3vJG7qVECLdD0GOJl56N1VBGLz41xXy5NhC9seYj3x9tCqfuGMGYbbYAi1XrKB9bEUsnmLUqZIbP_5xMAj4uwEZfkARtRSmY0dah41ndctUlAtrI" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-bold text-slate-900 truncate">早稲田大学 〇〇サークル</span>
                <span className="text-[10px] text-grey-custom font-bold">12:30</span>
              </div>
              <p className="text-xs font-bold text-slate-900 line-clamp-1">来週の面談について</p>
            </div>
          </div>
          <div className="p-5 border-b border-slate-100 hover:bg-slate-50 flex items-start gap-4 cursor-pointer">
            <div className="w-12 h-12 bg-slate-200 shrink-0 overflow-hidden">
              <img className="w-full h-full object-cover" alt="Organization profile thumbnail" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAobnIIfA3l45-AYrq_pF8x6l-iK-np3LzPHXsLamKQP1nz52z-Biv-BmBf2TQH5qhKa6sYJTMGisGcwtmldIgCmIKYWP2t5NJcp9sDPXPqTiOvI0VnbY7W0fD9d1AhQu3EAcJCnpQwyPialpFo6U7QSSJ-oXRKv_MH2zz20pMeKUifRr1_1DgKkOoiOQhsnOvSs0b7yxF51jiHGjHm3EklxDsgkeiBmaMmGd3SfBaOzr6ENNG_TYvxQ1uuYZrhzwXWFxPfuQGxbhM" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-slate-900 truncate">東京大学 〇〇委員会</span>
                <span className="text-[10px] text-grey-custom">昨日</span>
              </div>
              <p className="text-xs text-grey-custom line-clamp-1">協賛プランのご相談</p>
            </div>
          </div>
          <div className="p-5 border-b border-slate-100 hover:bg-slate-50 flex items-start gap-4 cursor-pointer">
            <div className="w-12 h-12 bg-slate-200 shrink-0 overflow-hidden">
              <img className="w-full h-full object-cover" alt="University organization logo" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIgIYSBaBFK53UYtWTQey4ZMllWJxf2grvkI93CHb0iP81jNTQa0TJBHhGm3NNz_U-AU7A4RmkfAdS68b40gXO4oYmR79Vd9m1BFOiZd7FkdlS9hbYU0ClN7_XjWE6UNvnaIoWY_XpODO2op1La323ZGXxLJaWCI_f8DfNFgU6XXXAZf9WzjkEpVDUVoB93OZ4_3218rFMqE8BHaFxJBD85VwEgo2wYpUX8e6hvaLUw0lTybedvMMjuPBYYzOpgc4fhyTERUGq6-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-medium text-slate-900 truncate">明治大学 〇〇連合</span>
                <span className="text-[10px] text-grey-custom">2日前</span>
              </div>
              <p className="text-xs text-grey-custom line-clamp-1">本年度の活動報告書を送付します</p>
            </div>
          </div>
        </div>
      </section>
      {/* Chat Room */}
      <main className="flex-1 flex flex-col bg-white">
        <header className="h-20 border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-navy-custom">school</span>
            </div>
            <h2 className="text-xl font-bold text-navy-custom">慶應義塾大学 〇〇部</h2>
          </div>
          <button className="border-2 border-navy-custom text-navy-custom px-6 py-2 text-sm font-bold hover:bg-navy-custom hover:text-white transition-colors">
            協賛条件を確認
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-bold text-navy-custom">慶應義塾大学 〇〇部 担当者</span>
              <span className="text-[10px] text-grey-custom">10:00</span>
            </div>
            <div className="text-sm text-slate-800 leading-relaxed">
              お世話になっております
              先日お話しした新しいイベントの提案資料を送付させていただきます
              ご確認いただけますと幸いです
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-accent">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span className="text-xs font-bold uppercase tracking-wider">ProofLoop AI 提案管理</span>
            </div>
            <div className="border-2 border-navy-custom p-6 max-w-xl bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-navy-custom flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl">description</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-custom mb-1">AIが作成した戦略的提案書</h3>
                  <p className="text-[10px] text-grey-custom">PDF形式 2.4MB 更新 2024/05/20</p>
                </div>
              </div>
              <button className="bg-navy-custom text-white px-5 py-2 text-xs font-bold hover:bg-navy-custom/90">
                プレビュー
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 max-w-3xl ml-auto text-right">
            <div className="flex items-baseline justify-end gap-3">
              <span className="text-[10px] text-grey-custom">10:35</span>
              <span className="text-sm font-bold text-accent">企業担当者</span>
            </div>
            <div className="text-sm text-slate-800 leading-relaxed">
              資料の送付ありがとうございます
              AIによる提案書も合わせて確認させていただきます
            </div>
          </div>
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-baseline gap-3">
              <span className="text-sm font-bold text-navy-custom">慶應義塾大学 〇〇部 担当者</span>
              <span className="text-[10px] text-grey-custom">10:45</span>
            </div>
            <div className="text-sm text-slate-800 leading-relaxed">
              承知いたしました
              ご不明点などございましたらいつでもお申し付けください
              よろしくお願いいたします
            </div>
          </div>
        </div>
        <footer className="p-8 border-t border-slate-200 shrink-0">
          <form onSubmit={handleSendMessage} className="flex flex-col border border-slate-300">
            <Textarea
              className="border-0 focus:ring-0 p-4 text-sm min-h-[100px] rounded-none"
              placeholder="メッセージを入力"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex items-center justify-between p-3 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center gap-4 px-2">
                <button type="button" className="text-grey-custom hover:text-navy-custom transition-colors">
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                <button type="button" className="text-grey-custom hover:text-navy-custom transition-colors">
                  <span className="material-symbols-outlined">image</span>
                </button>
              </div>
              <Button type="submit" variant="secondary" className="px-10 tracking-widest">
                送信
              </Button>
            </div>
          </form>
          <div className="mt-3 flex justify-end">
            <p className="text-[10px] text-grey-custom">Enterで送信 Shift+Enterで改行</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

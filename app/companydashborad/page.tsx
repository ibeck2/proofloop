import Link from "next/link";

export default function CompanyDashboardPage() {
  return (
    <div className="bg-[#f5f7f8] text-primary h-screen overflow-hidden flex font-display antialiased">
      {/* Sidebar */}
      <aside className="w-64 h-full bg-primary flex flex-col shrink-0">
        <nav className="flex-1 py-6 flex flex-col gap-1">
          <Link className="relative flex items-center gap-3 px-6 py-3 bg-[#00224a] text-white group hover:bg-[#003366] transition-colors" href="/companydashborad">
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-accent" />
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="text-sm font-medium">ダッシュボード</span>
          </Link>
          <Link className="flex items-center gap-3 px-6 py-3 text-gray-300 hover:text-white hover:bg-[#ffffff0d] transition-colors" href="/companysearch">
            <span className="material-symbols-outlined text-[20px]">search</span>
            <span className="text-sm font-medium">団体検索・スカウト</span>
          </Link>
          <Link className="flex items-center gap-3 px-6 py-3 text-gray-300 hover:text-white hover:bg-[#ffffff0d] transition-colors" href="/companymessage">
            <span className="material-symbols-outlined text-[20px]">mail</span>
            <span className="text-sm font-medium">メッセージ</span>
          </Link>
          <Link className="flex items-center gap-3 px-6 py-3 text-gray-300 hover:text-white hover:bg-[#ffffff0d] transition-colors" href="/companydashborad">
            <span className="material-symbols-outlined text-[20px]">bar_chart</span>
            <span className="text-sm font-medium">協賛実績レポート</span>
          </Link>
          <Link className="flex items-center gap-3 px-6 py-3 text-gray-300 hover:text-white hover:bg-[#ffffff0d] transition-colors" href="/companydashborad">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-sm font-medium">設定</span>
          </Link>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 shrink-0">
          <h2 className="text-primary text-lg font-bold">株式会社○○ 様</h2>
          <button className="relative p-2 text-primary hover:bg-gray-50 transition-colors rounded-none">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border border-white" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-10">
            {/* Summary Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 p-6 flex flex-col gap-2 rounded-none hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-gray text-sm font-medium">進行中の協賛</p>
                  <span className="material-symbols-outlined text-neutral-gray group-hover:text-primary">handshake</span>
                </div>
                <p className="text-primary text-3xl font-bold mt-1">3 <span className="text-base font-normal text-neutral-gray ml-1">件</span></p>
              </div>
              <div className="bg-white border border-gray-200 p-6 flex flex-col gap-2 rounded-none hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-gray text-sm font-medium">新規メッセージ</p>
                  <span className="material-symbols-outlined text-neutral-gray group-hover:text-primary">chat_bubble</span>
                </div>
                <p className="text-primary text-3xl font-bold mt-1">2 <span className="text-base font-normal text-neutral-gray ml-1">件</span></p>
              </div>
              <div className="bg-white border border-gray-200 p-6 flex flex-col gap-2 rounded-none hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-gray text-sm font-medium">累計学生リーチ数</p>
                  <span className="material-symbols-outlined text-neutral-gray group-hover:text-primary">groups</span>
                </div>
                <p className="text-primary text-3xl font-bold mt-1">15400 <span className="text-base font-normal text-neutral-gray ml-1">人</span></p>
              </div>
            </section>
            {/* Matching Status Section */}
            <section className="flex flex-col gap-4">
              <h3 className="text-primary text-xl font-bold">現在オファー中の学生団体</h3>
              <div className="border border-gray-200 bg-white rounded-none overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-4 px-6 text-sm font-semibold text-neutral-gray w-1/2">学生団体名</th>
                      <th className="py-4 px-6 text-sm font-semibold text-neutral-gray w-1/4">オファー種別</th>
                      <th className="py-4 px-6 text-sm font-semibold text-neutral-gray w-1/4">ステータス</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-primary font-medium">
                        <Link href="/companymessage" className="block hover:underline">早稲田大学広告研究会</Link>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-primary border border-blue-100 rounded-none">資金</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-100 rounded-none">承認待ち</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-primary font-medium">
                        <Link href="/companymessage" className="block hover:underline">慶應義塾大学放送研究会</Link>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-800 border border-purple-100 rounded-none">物品</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-green-50 text-green-800 border border-green-100 rounded-none">面談設定済</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 text-primary font-medium">
                        <Link href="/companymessage" className="block hover:underline">東京大学起業サークルTNK</Link>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-primary border border-blue-100 rounded-none">資金</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded-none">検討中</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            {/* AI Recommendation Section */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-primary text-xl font-bold">貴社の課題解決にマッチする注目の学生団体</h3>
                <button className="text-sm text-neutral-gray hover:text-primary font-medium flex items-center gap-1 transition-colors">
                  すべて見る
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group border border-gray-200 bg-white p-0 hover:border-primary transition-all duration-200 rounded-none flex flex-col h-full">
                  <div className="h-32 bg-gray-100 w-full relative overflow-hidden">
                    <img
                      alt="Group of students brainstorming in a bright room"
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOl7UOIS87Lr4Zy83xgLrO-frVDRt2FIBVW951BqsFKKa-NbiWpOYfMbnYbWPghhMKorGq1nEUwrSxeCvzthz-cUha5KS3Z0IqAB3JSIezpVV5wiEe97KhXlqo1Hxl-i34xlPArBEBZkhcvITbeS6yDCu449GwqKB-cHEg0b_cCZpQ2rMbdweUgadsWWCBLr3p8G5q38HBFWGKoxAHKsu5q24FeZtFkpIelGl544qOY5cNQwtuVjMYtNd5lpbhUYWEmT3sGt6aKG8"
                    />
                    <div className="absolute top-0 left-0 bg-primary/90 text-white text-xs font-bold px-3 py-1 m-3">マッチ度 95%</div>
                  </div>
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div>
                      <p className="text-xs text-neutral-gray mb-1">明治大学</p>
                      <h4 className="text-primary font-bold text-lg leading-snug">マーケティング研究会</h4>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">SNS運用とZ世代マーケティングに特化した活動を行っています</p>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="text-xs bg-gray-50 px-2 py-1 text-gray-600 border border-gray-100">広報支援</span>
                        <span className="text-xs bg-gray-50 px-2 py-1 text-gray-600 border border-gray-100">企画立案</span>
                      </div>
                      <button className="text-primary hover:text-accent transition-colors">
                        <span className="material-symbols-outlined">bookmark_add</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="group border border-gray-200 bg-white p-0 hover:border-primary transition-all duration-200 rounded-none flex flex-col h-full">
                  <div className="h-32 bg-gray-100 w-full relative overflow-hidden">
                    <img
                      alt="Students coding together at a hackathon event"
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBv9ycRmJ7_pBFOMYiuClhMgU4tMs66ilMHBTQxAlpydk4TzxAtat9KLofn96w3yh1KVgodnwhDCCvBzbGhdMf_HoTIqUn4IGgeu7sX3lB-XYn7FUno_i2sJEhzH2_3q2R8qVG_Z8q6k_kW-BK7ZcmPygzlLdAnc7J_sXf13Q0Ym_4z5zESLBGM99Cp8LkQ9CsdIMAmpMCgQ1ZaHvppX_kKV6wleicqzWZiQlqMeUDGieb2y2sTi7T2VFHZrTnz6kYFZ-l6pJDUGW4"
                    />
                    <div className="absolute top-0 left-0 bg-primary/90 text-white text-xs font-bold px-3 py-1 m-3">マッチ度 88%</div>
                  </div>
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div>
                      <p className="text-xs text-neutral-gray mb-1">東京工業大学</p>
                      <h4 className="text-primary font-bold text-lg leading-snug">テッククリエイターズ</h4>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">ハッカソン運営やプログラミング教育イベントを主催</p>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="text-xs bg-gray-50 px-2 py-1 text-gray-600 border border-gray-100">エンジニア採用</span>
                        <span className="text-xs bg-gray-50 px-2 py-1 text-gray-600 border border-gray-100">技術</span>
                      </div>
                      <button className="text-primary hover:text-accent transition-colors">
                        <span className="material-symbols-outlined">bookmark_add</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="group border border-gray-200 bg-white p-0 hover:border-primary transition-all duration-200 rounded-none flex flex-col h-full">
                  <div className="h-32 bg-gray-100 w-full relative overflow-hidden">
                    <img
                      alt="Students organizing a cultural festival booth"
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ06auPyOLhHkuuBaxvAuyswavP2MHMo235E0sPrKJQIqFxkOZeFOTXUITFu3qOpE7AtL3jj456YnA5jQX0bOAGO2HIDNRzN73SR5sWniV2wldKen6trxlkAzu-1swU499jYYX60H7NtIw-pC2GDj6e_OyD3QcLgxr6xGZXEz5JHE5Wc1dBclJ8AbL-MrCKlbRliF7QxziI86w7n3BmBYBrnx71J93NfBfOy8rie5WkArXV5arnLbWfThzpMPIUgU2ImSujh91OfY"
                    />
                    <div className="absolute top-0 left-0 bg-primary/90 text-white text-xs font-bold px-3 py-1 m-3">マッチ度 82%</div>
                  </div>
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div>
                      <p className="text-xs text-neutral-gray mb-1">青山学院大学</p>
                      <h4 className="text-primary font-bold text-lg leading-snug">青山祭実行委員会</h4>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">来場者数10万人規模の学園祭を企画・運営する組織</p>
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="text-xs bg-gray-50 px-2 py-1 text-gray-600 border border-gray-100">大規模露出</span>
                        <span className="text-xs bg-gray-50 px-2 py-1 text-gray-600 border border-gray-100">サンプリング</span>
                      </div>
                      <button className="text-primary hover:text-accent transition-colors">
                        <span className="material-symbols-outlined">bookmark_add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <div className="h-10" />
          </div>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";

export default function ClubDashboardPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display antialiased min-h-screen" style={{ backgroundColor: "#f5f5f8" }}>
      <div className="relative flex min-h-screen w-full flex-row overflow-x-hidden">
        {/* Sidebar Navigation */}
        <aside className="hidden w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 lg:flex shrink-0">
          <div className="flex h-full flex-col justify-between p-6">
            <div className="flex flex-col gap-8">
              <p className="text-text-sub text-xs">管理者用</p>
              <nav className="flex flex-col gap-2">
                <Link className="flex items-center gap-3 px-4 py-3 rounded bg-primary/10 text-primary dark:text-blue-200" href="/clubdashboard">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>dashboard</span>
                  <span className="text-sm font-medium">ダッシュボードホーム</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 rounded text-text-sub hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" href="/clubprofile">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>edit_note</span>
                  <span className="text-sm font-medium">プロフィール編集</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 rounded text-text-sub hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" href="/clubdashboard/selection">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>how_to_vote</span>
                  <span className="text-sm font-medium">新歓DX・選考管理</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 rounded text-text-sub hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" href="/clubopenmission">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>task_alt</span>
                  <span className="text-sm font-medium">ミッションボード</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 rounded text-text-sub hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" href="/clubdashboard/reviews">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>rate_review</span>
                  <span className="text-sm font-medium">口コミ・レビュー管理</span>
                </Link>
              </nav>
            </div>
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <Link className="flex items-center gap-3 px-4 py-2 text-text-sub hover:text-primary transition-colors" href="/">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
                <span className="text-sm font-medium">ログアウト</span>
              </Link>
            </div>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark">
          <div className="lg:hidden flex items-center justify-end p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
            <button className="text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full px-6 py-8 lg:px-12 lg:py-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex flex-col gap-2">
                  <p className="text-primary dark:text-white text-lg font-bold">AFPLA 管理ページへようこそ</p>
                  <span className="text-text-sub text-sm font-medium">東京大学 駒場キャンパス / 国際交流・政治</span>
                  <h2 className="text-primary dark:text-white text-3xl font-bold tracking-tight">AFPLA (Asian Future Political Leaders Association)</h2>
                </div>
                <Link className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded shadow-sm transition-all hover:shadow-md whitespace-nowrap" href="/schedule">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                  <span className="font-bold text-sm tracking-wide">新しい新歓イベントを登録する</span>
                </Link>
              </div>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full justify-between group hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm">今月の閲覧数</h3>
                    <span className="material-symbols-outlined text-primary/20" style={{ fontSize: 24 }}>visibility</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-primary dark:text-white text-4xl font-bold tracking-tight group-hover:text-primary transition-colors">1,240</span>
                    <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-xs font-bold">+12%</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full justify-between group hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm">お気に入り登録数</h3>
                    <span className="material-symbols-outlined text-primary/20" style={{ fontSize: 24 }}>bookmark</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-primary dark:text-white text-4xl font-bold tracking-tight group-hover:text-primary transition-colors">58</span>
                    <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-xs font-bold">+5%</span>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full justify-between group hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-text-sub dark:text-slate-400 font-medium text-sm">新着問い合わせ</h3>
                    <div className="relative">
                      <span className="material-symbols-outlined text-primary/20" style={{ fontSize: 24 }}>mail</span>
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-primary dark:text-white text-4xl font-bold tracking-tight group-hover:text-primary transition-colors">3</span>
                    <span className="text-text-sub text-xs">未読</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-primary dark:text-white text-lg font-bold mb-1">ページ閲覧数推移</h3>
                      <p className="text-text-sub text-xs">過去30日間</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-secondary" />
                        <span className="text-xs text-text-sub">閲覧数</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-64 relative">
                    <div className="absolute inset-0 flex flex-col justify-between text-text-sub text-xs pointer-events-none pb-6">
                      <div className="w-full border-b border-slate-100 dark:border-slate-700 h-0" />
                      <div className="w-full border-b border-slate-100 dark:border-slate-700 h-0" />
                      <div className="w-full border-b border-slate-100 dark:border-slate-700 h-0" />
                      <div className="w-full border-b border-slate-100 dark:border-slate-700 h-0" />
                    </div>
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 200">
                      <defs>
                        <linearGradient id="gradientArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#8B0000" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#8B0000" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <path d="M0,150 Q100,100 200,130 T400,80 T600,100 T800,40 V200 H0 Z" fill="url(#gradientArea)" />
                      <path d="M0,150 Q100,100 200,130 T400,80 T600,100 T800,40" fill="none" stroke="#8B0000" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
                      <circle cx="200" cy="130" fill="#ffffff" r="4" stroke="#8B0000" strokeWidth={2} />
                      <circle cx="400" cy="80" fill="#ffffff" r="4" stroke="#8B0000" strokeWidth={2} />
                      <circle cx="600" cy="100" fill="#ffffff" r="4" stroke="#8B0000" strokeWidth={2} />
                    </svg>
                    <div className="absolute bottom-0 w-full flex justify-between text-text-sub text-xs pt-2">
                      <span>4/1</span>
                      <span>4/5</span>
                      <span>4/10</span>
                      <span>4/15</span>
                      <span>4/20</span>
                      <span>4/25</span>
                      <span>4/30</span>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
                  <h3 className="text-primary dark:text-white text-lg font-bold mb-6">直近の実績・イベント</h3>
                  <div className="flex flex-col gap-6 overflow-y-auto max-h-[250px] pr-2">
                    <div className="flex gap-3 items-start group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-text-sub group-hover:text-primary" style={{ fontSize: 16 }}>groups</span>
                      </div>
                      <div>
                        <p className="text-sm text-primary dark:text-white font-medium leading-tight">東京開催 アジア学生国際会議</p>
                        <p className="text-xs text-text-sub mt-1">実施済</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-text-sub group-hover:text-primary" style={{ fontSize: 16 }}>celebration</span>
                      </div>
                      <div>
                        <p className="text-sm text-primary dark:text-white font-medium leading-tight">新入生歓迎 オリエンテーション</p>
                        <p className="text-xs text-text-sub mt-1">予定</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        <span className="material-symbols-outlined text-text-sub group-hover:text-primary" style={{ fontSize: 16 }}>mail</span>
                      </div>
                      <div>
                        <p className="text-sm text-primary dark:text-white font-medium leading-tight">新着問い合わせ: 3件</p>
                        <p className="text-xs text-text-sub mt-1">2時間前</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-6">
                    <Link href="/clubdashboard/reviews" className="block w-full py-2 text-center text-sm font-bold text-primary dark:text-blue-300 border border-slate-200 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      口コミ・レビュー管理へ
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function ClubDashboardReviewsPage() {
  return (
    <div className="bg-[#f5f5f7] text-slate-900 font-display min-h-screen">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-64 flex-col bg-white border-r border-slate-200 lg:flex shrink-0">
          <div className="flex h-full flex-col justify-between p-6">
            <div className="flex flex-col gap-8">
              <p className="text-text-sub text-xs">管理者用</p>
              <nav className="flex flex-col gap-2">
                <Link className="flex items-center gap-3 px-4 py-3 text-text-sub hover:bg-slate-50 transition-colors" href="/clubdashboard">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>dashboard</span>
                  <span className="text-sm font-medium">ダッシュボードホーム</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 text-text-sub hover:bg-slate-50 transition-colors" href="/clubprofile">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>edit_note</span>
                  <span className="text-sm font-medium">プロフィール編集</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 text-text-sub hover:bg-slate-50 transition-colors" href="/clubdashboard/selection">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>how_to_vote</span>
                  <span className="text-sm font-medium">新歓DX・選考管理</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 text-text-sub hover:bg-slate-50 transition-colors" href="/clubopenmission">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>task_alt</span>
                  <span className="text-sm font-medium">ミッションボード</span>
                </Link>
                <Link className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary" href="/clubdashboard/reviews">
                  <span className="material-symbols-outlined" style={{ fontSize: 24 }}>rate_review</span>
                  <span className="text-sm font-medium">口コミ・レビュー管理</span>
                </Link>
              </nav>
            </div>
            <div className="pt-6 border-t border-slate-100">
              <Link className="flex items-center gap-3 px-4 py-2 text-text-sub hover:text-primary transition-colors" href="/">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
                <span className="text-sm font-medium">ログアウト</span>
              </Link>
            </div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 p-6 lg:p-10">
          <h1 className="text-primary text-2xl font-bold tracking-tight">口コミ・レビュー管理の画面</h1>
        </main>
      </div>
    </div>
  );
}

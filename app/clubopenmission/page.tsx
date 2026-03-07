export default function ClubOpenMissionPage() {
  return (
    <div className="font-display text-slate-900 bg-background-light min-h-screen" style={{ backgroundColor: "#f9f9f9" }}>
      {/* Global Navigation Header */}
      <header className="flex items-center justify-end border-b border-slate-200 bg-white px-10 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button className="flex items-center justify-center bg-primary text-white px-6 py-2.5 text-sm font-bold tracking-wider hover:opacity-90 transition-opacity">
            <span>新規タスクを追加</span>
          </button>
          <div className="size-10 bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-primary">account_circle</span>
          </div>
        </div>
      </header>
      {/* Board Content Area */}
      <main className="p-10 pb-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-primary">オープン・ミッション・ボード</h2>
          <p className="text-mission-grey mt-2">組織全体のタスク進捗状況を確認できます</p>
        </div>
        {/* Kanban Board */}
        <div className="flex gap-6 overflow-x-auto pb-8 custom-scrollbar items-start">
          {/* Column: To Do */}
          <div className="kanban-column flex flex-col gap-4">
            <div className="bg-primary text-white p-4">
              <h3 className="font-bold text-base">未着手 タスクプール</h3>
            </div>
            {/* Task Card 1 (AI Recommended) */}
            <div className="bg-white p-5 border-l-4 border-mission-red flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-mission-red/5 px-2 py-1">
                <span className="material-symbols-outlined text-mission-red text-sm">auto_awesome</span>
                <span className="text-[10px] font-bold text-mission-red leading-none">あなたの成長に繋がるタスク AI推奨</span>
              </div>
              <h4 className="text-base font-bold text-slate-900 leading-snug">新歓ビラ作成</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-mission-grey">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">期限 2024/05/20</span>
                </div>
                <div className="size-7 bg-slate-100 flex items-center justify-center border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-lg">person</span>
                </div>
              </div>
            </div>
            {/* Task Card 2 */}
            <div className="bg-white p-5 border-l-4 border-transparent flex flex-col gap-3">
              <h4 className="text-base font-bold text-slate-900 leading-snug">協賛企業リストアップ</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-mission-grey">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">期限 2024/05/25</span>
                </div>
                <div className="size-7 bg-slate-100 flex items-center justify-center border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-lg">person</span>
                </div>
              </div>
            </div>
            {/* Task Card 3 (AI Recommended) */}
            <div className="bg-white p-5 border-l-4 border-mission-red flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-mission-red/5 px-2 py-1">
                <span className="material-symbols-outlined text-mission-red text-sm">auto_awesome</span>
                <span className="text-[10px] font-bold text-mission-red leading-none">あなたの成長に繋がるタスク AI推奨</span>
              </div>
              <h4 className="text-base font-bold text-slate-900 leading-snug">SNS運用マニュアル作成</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-mission-grey">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">期限 2024/05/15</span>
                </div>
                <div className="size-7 bg-slate-100 flex items-center justify-center border border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-lg">person</span>
                </div>
              </div>
            </div>
          </div>
          {/* Column: In Progress */}
          <div className="kanban-column flex flex-col gap-4">
            <div className="bg-primary text-white p-4">
              <h3 className="font-bold text-base">進行中</h3>
            </div>
            <div className="bg-white p-5 border-l-4 border-primary flex flex-col gap-3">
              <h4 className="text-base font-bold text-slate-900 leading-snug">学園祭ステージ企画構成</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-mission-grey">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">期限 2024/05/18</span>
                </div>
                <div className="size-7 bg-primary flex items-center justify-center border border-primary">
                  <span className="material-symbols-outlined text-white text-lg">face</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 border-l-4 border-primary flex flex-col gap-3">
              <h4 className="text-base font-bold text-slate-900 leading-snug">備品発注リスト作成</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-mission-grey">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">期限 2024/05/22</span>
                </div>
                <div className="size-7 bg-primary flex items-center justify-center border border-primary">
                  <span className="material-symbols-outlined text-white text-lg">face_2</span>
                </div>
              </div>
            </div>
          </div>
          {/* Column: Review */}
          <div className="kanban-column flex flex-col gap-4">
            <div className="bg-primary text-white p-4">
              <h3 className="font-bold text-base">確認待ち</h3>
            </div>
            <div className="bg-white p-5 border-l-4 border-slate-300 flex flex-col gap-3">
              <h4 className="text-base font-bold text-slate-900 leading-snug">前月会計報告書</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-mission-grey">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">期限 2024/05/10</span>
                </div>
                <div className="size-7 bg-slate-200 flex items-center justify-center border border-slate-300">
                  <span className="material-symbols-outlined text-slate-600 text-lg">face_3</span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-sm">pending_actions</span>
                <span className="text-[10px] font-bold">承認者確認中</span>
              </div>
            </div>
          </div>
          {/* Column: Done */}
          <div className="kanban-column flex flex-col gap-4">
            <div className="bg-primary text-white p-4">
              <h3 className="font-bold text-base">完了</h3>
            </div>
            <div className="bg-white p-5 border-l-4 border-slate-100 flex flex-col gap-3 opacity-60">
              <h4 className="text-base font-bold text-slate-400 leading-snug line-through">新歓説明会会場予約</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">完了済み 05/08</span>
                </div>
                <div className="size-7 bg-slate-50 flex items-center justify-center border border-slate-100">
                  <span className="material-symbols-outlined text-slate-300 text-lg">check_circle</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-5 border-l-4 border-slate-100 flex flex-col gap-3 opacity-60">
              <h4 className="text-base font-bold text-slate-400 leading-snug line-through">年間スケジュール暫定版</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span className="text-xs font-medium">完了済み 05/01</span>
                </div>
                <div className="size-7 bg-slate-50 flex items-center justify-center border border-slate-100">
                  <span className="material-symbols-outlined text-slate-300 text-lg">check_circle</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-10 py-2 flex items-center justify-between z-40">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="size-2 bg-primary" />
            <span className="text-[10px] text-mission-grey font-bold">総ミッション数 12</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 bg-mission-red" />
            <span className="text-[10px] text-mission-grey font-bold">AI推奨 3</span>
          </div>
        </div>
        <div className="text-[10px] text-mission-grey">最終更新 2024/05/12 14:30</div>
      </footer>
    </div>
  );
}

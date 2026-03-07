"use client";

import Link from "next/link";

// モック: 新入生がエントリー中の団体と選考進捗
const MOCK_MY_SELECTIONS = [
  { clubId: "dummy-id", clubName: "明治大学 広告研究会", currentStep: "ES提出" },
];

export default function MypagePage() {
  return (
    <div className="bg-[#f5f5f7] text-slate-900 font-display min-h-screen pb-20 md:pb-8">
      <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
        <h1 className="text-primary text-2xl font-bold mb-8">マイページ</h1>

        {/* 現在の選考進捗 */}
        <section className="mb-10">
          <h2 className="text-primary text-lg font-bold mb-4">現在の選考進捗</h2>
          <div className="space-y-4">
            {MOCK_MY_SELECTIONS.length === 0 ? (
              <p className="text-text-sub text-sm">エントリー中の団体はありません</p>
            ) : (
              MOCK_MY_SELECTIONS.map((item) => (
                <div
                  key={item.clubId}
                  className="bg-white border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div>
                    <p className="text-primary font-bold">{item.clubName}</p>
                    <p className="text-text-sub text-sm mt-1">現在のステップ: {item.currentStep}</p>
                  </div>
                  <Link
                    href={`/mypage/selection/${item.clubId}`}
                    className="inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 font-bold text-sm hover:bg-[#001f45] transition-colors shrink-0"
                  >
                    詳細を見る
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

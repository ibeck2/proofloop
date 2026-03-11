"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

const KANBAN_COLUMNS = [
  { id: "es-pending", title: "ES未提出" },
  { id: "es-done", title: "ES提出済" },
  { id: "interview", title: "面接待ち" },
  { id: "offer", title: "内定" },
] as const;

type ColumnId = (typeof KANBAN_COLUMNS)[number]["id"];

type ApplicantCard = {
  id: string;
  name: string;
  university: string;
  department: string;
  status: string;
  columnId: ColumnId;
};

const MOCK_APPLICANTS: ApplicantCard[] = [
  { id: "1", name: "山田 太郎", university: "東京大学", department: "法学部", status: "未提出", columnId: "es-pending" },
  { id: "2", name: "佐藤 花子", university: "早稲田大学", department: "政治経済学部", status: "未提出", columnId: "es-pending" },
  { id: "3", name: "鈴木 一郎", university: "慶應義塾大学", department: "商学部", status: "提出済", columnId: "es-done" },
  { id: "4", name: "田中美咲", university: "明治大学", department: "経営学部", status: "提出済", columnId: "es-done" },
  { id: "5", name: "高橋 健太", university: "東京大学", department: "工学部", status: "面接予定", columnId: "interview" },
  { id: "6", name: "伊藤 さくら", university: "早稲田大学", department: "文学部", status: "面接予定", columnId: "interview" },
  { id: "7", name: "渡辺 大輔", university: "慶應義塾大学", department: "法学部", status: "内定", columnId: "offer" },
  { id: "8", name: "中村 あおい", university: "明治大学", department: "情報コミュニケーション学部", status: "内定", columnId: "offer" },
];

type EsMode = "builtin" | "external";
type InterviewMode = "builtin" | "external";

export default function SelectionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [esMode, setEsMode] = useState<EsMode>("builtin");
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("builtin");
  const [esUrl, setEsUrl] = useState("");
  const [interviewUrl, setInterviewUrl] = useState("");
  const [esQuestion1, setEsQuestion1] = useState("志望動機");
  const [esQuestion2, setEsQuestion2] = useState("自己PR");
  const [esQuestion3, setEsQuestion3] = useState("その他（自由記述）");

  return (
    <div className="bg-[#f5f5f7] text-slate-900 font-display min-h-full">
      <div className="flex-1 p-6 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-primary text-2xl font-bold tracking-tight">新歓 選考管理</h1>
            <p className="text-text-sub text-sm mt-1">応募者の選考フローを管理します</p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            className="shrink-0"
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            選考フロー設定
          </Button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[480px]">
          {KANBAN_COLUMNS.map((col) => (
            <div
              key={col.id}
              className="w-[280px] shrink-0 flex flex-col bg-slate-100 border border-slate-200"
            >
              <div className="px-4 py-3 border-b border-slate-200 bg-white">
                <h2 className="text-primary font-bold text-sm">{col.title}</h2>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[320px]">
                {MOCK_APPLICANTS.filter((a) => a.columnId === col.id).map((applicant) => (
                  <div
                    key={applicant.id}
                    className="bg-white border border-slate-200 p-4 hover:border-primary/30 transition-colors"
                  >
                    <p className="text-primary font-bold text-sm mb-1">{applicant.name}</p>
                    <p className="text-text-sub text-xs mb-2">
                      {applicant.university}・{applicant.department}
                    </p>
                    <p className="text-accent text-xs font-medium">{applicant.status}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <>
          <div
            role="presentation"
            className="fixed inset-0 z-[200] bg-black/40"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-[210] w-[min(480px,90vw)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-primary text-lg font-bold">選考フロー設定</h3>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-text-sub hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsModalOpen(false);
              }}
              className="space-y-8"
            >
              <div>
                <h4 className="text-primary font-bold text-sm mb-3">ES（エントリーシート）設定</h4>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="esMode"
                      checked={esMode === "builtin"}
                      onChange={() => setEsMode("builtin")}
                      className="w-4 h-4 border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-slate-800 text-sm font-medium">ProofLoopの標準ESフォームを利用する</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="esMode"
                      checked={esMode === "external"}
                      onChange={() => setEsMode("external")}
                      className="w-4 h-4 border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-slate-800 text-sm font-medium">外部フォーム（Google Form等）を利用する</span>
                  </label>
                </div>
                {esMode === "builtin" && (
                  <div className="pl-6 border-l-2 border-slate-200 space-y-4">
                    <p className="text-text-sub text-xs">質問項目をカスタマイズできます</p>
                    <div>
                      <label className="block text-primary font-bold text-xs mb-1">質問1</label>
                      <Input value={esQuestion1} onChange={(e) => setEsQuestion1(e.target.value)} placeholder="例: 志望動機" className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-primary font-bold text-xs mb-1">質問2</label>
                      <Input value={esQuestion2} onChange={(e) => setEsQuestion2(e.target.value)} placeholder="例: 自己PR" className="text-sm" />
                    </div>
                    <div>
                      <label className="block text-primary font-bold text-xs mb-1">質問3</label>
                      <Input value={esQuestion3} onChange={(e) => setEsQuestion3(e.target.value)} placeholder="例: その他（自由記述）" className="text-sm" />
                    </div>
                  </div>
                )}
                {esMode === "external" && (
                  <div className="pl-6 border-l-2 border-slate-200">
                    <label className="block text-primary font-bold text-xs mb-2">外部フォームのURL</label>
                    <Input type="url" value={esUrl} onChange={(e) => setEsUrl(e.target.value)} placeholder="https://forms.google.com/..." />
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-primary font-bold text-sm mb-3">面接予約設定</h4>
                <div className="space-y-3 mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="interviewMode"
                      checked={interviewMode === "builtin"}
                      onChange={() => setInterviewMode("builtin")}
                      className="w-4 h-4 border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-slate-800 text-sm font-medium">ProofLoop内で面接枠を設定する</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="interviewMode"
                      checked={interviewMode === "external"}
                      onChange={() => setInterviewMode("external")}
                      className="w-4 h-4 border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-slate-800 text-sm font-medium">外部の日程調整ツール（Calendly等）を利用する</span>
                  </label>
                </div>
                {interviewMode === "builtin" && (
                  <div className="pl-6 border-l-2 border-slate-200">
                    <p className="text-text-sub text-xs">面接可能な日時は、この画面の「面接枠設定」から登録できます。</p>
                  </div>
                )}
                {interviewMode === "external" && (
                  <div className="pl-6 border-l-2 border-slate-200">
                    <label className="block text-primary font-bold text-xs mb-2">日程調整ツールのURL</label>
                    <Input type="url" value={interviewUrl} onChange={(e) => setInterviewUrl(e.target.value)} placeholder="https://calendly.com/..." />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" variant="primary" className="flex-1">
                  保存
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

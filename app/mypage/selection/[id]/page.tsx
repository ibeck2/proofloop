"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Video, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui";

const STEPS = ["エントリー", "ES提出", "面接", "最終結果"] as const;
type StepId = (typeof STEPS)[number];

// モック: 応募者の選考進捗（id に応じて変える場合は API に差し替え）
const MOCK_SELECTION = {
  currentStepIndex: 1, // 0: エントリー, 1: ES提出, 2: 面接, 3: 最終結果
  clubName: "明治大学 広告研究会",
  esFormUrl: "https://forms.google.com/example",
  interviewDate: "2024年4月20日（土）14:00",
  interviewZoomUrl: "https://zoom.us/j/example",
};

export default function SelectionTrackerPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { currentStepIndex, clubName, esFormUrl, interviewDate, interviewZoomUrl } = MOCK_SELECTION;

  return (
    <div className="bg-mist text-graphite font-body min-h-screen pb-20 md:pb-8">
      <main className="max-w-[560px] mx-auto px-4 py-8 md:py-12">
        <div className="mb-2">
          <Link href="/clubprofile" className="text-ink text-sm font-bold hover:underline flex items-center gap-1">
            <ArrowLeft className="w-[18px] h-[18px]" aria-hidden="true" />
            プロフィールに戻る
          </Link>
        </div>
        <h1 className="font-mincho text-ink text-xl font-bold mb-1">選考進捗</h1>
        <p className="text-graphite text-sm mb-8">{clubName}</p>

        {/* ステップインジケーター */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((step, index) => (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 flex items-center justify-center text-sm font-bold border-2 ${
                      index === currentStepIndex
                        ? "bg-seal border-seal text-paper"
                        : index < currentStepIndex
                          ? "bg-ink border-ink text-paper"
                          : "bg-paper border-rule text-graphite"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`mt-2 text-xs font-bold ${
                      index === currentStepIndex ? "text-seal" : index < currentStepIndex ? "text-ink" : "text-graphite"
                    }`}
                  >
                    {step}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 min-w-[8px] ${
                      index < currentStepIndex ? "bg-ink" : "bg-rule"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 現在のステップに応じたアクションカード */}
        <div className="bg-paper border border-rule p-6 mb-8">
          {currentStepIndex === 0 && (
            <>
              <h2 className="text-ink font-bold text-lg mb-2">エントリー完了</h2>
              <p className="text-graphite text-sm leading-relaxed mb-6">
                エントリーが完了しました。次のステップ「ES提出」のご案内が届き次第、この画面に表示されます。
              </p>
            </>
          )}
          {currentStepIndex === 1 && (
            <>
              <h2 className="text-ink font-bold text-lg mb-2">エントリーシートを提出してください</h2>
              <p className="text-graphite text-sm leading-relaxed mb-6">
                指定のフォームからエントリーシートを提出してください。提出期限にご注意ください。
              </p>
              <Link
                href={esFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-ink text-paper px-6 py-3 font-bold text-sm hover:bg-ink/90 transition-colors"
              >
                <ExternalLink className="w-[18px] h-[18px]" aria-hidden="true" />
                ESフォームを開く（外部サイト）
              </Link>
            </>
          )}
          {currentStepIndex === 2 && (
            <>
              <h2 className="text-ink font-bold text-lg mb-2">オンライン面接のご案内</h2>
              <p className="text-graphite text-sm leading-relaxed mb-4">
                以下の日時にオンライン面接を実施します。開始時刻の5分前までにZoomにアクセスしてください。
              </p>
              <p className="text-ink font-bold text-base mb-6">{interviewDate}</p>
              <Link
                href={interviewZoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-ink text-paper px-6 py-3 font-bold text-sm hover:bg-ink/90 transition-colors"
              >
                <Video className="w-[18px] h-[18px]" aria-hidden="true" />
                オンライン面接（Zoom）に参加する
              </Link>
            </>
          )}
          {currentStepIndex === 3 && (
            <>
              <h2 className="text-ink font-bold text-lg mb-2">最終結果</h2>
              <p className="text-graphite text-sm leading-relaxed mb-6">
                選考結果は、団体からメッセージでお知らせします。ご不明点は下のボタンから団体へお問い合わせください。
              </p>
            </>
          )}
        </div>

        {/* 団体とのメッセージリンク */}
        <Link
          href={`/companymessage${id ? `?club=${id}` : ""}`}
          className="flex items-center justify-center gap-2 w-full py-4 border-2 border-ink text-ink font-bold text-sm hover:bg-mist transition-colors"
        >
          <MessageCircle className="w-6 h-6" aria-hidden="true" />
          この団体にメッセージを送る
        </Link>
      </main>
    </div>
  );
}

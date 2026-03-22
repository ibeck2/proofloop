import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  Inbox,
  Kanban,
  LayoutGrid,
  ListTodo,
  MessageSquare,
  Rss,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "学生団体の皆様へ | ProofLoop",
  description:
    "新メンバー募集からタスク共有、イベント告知まで。学生団体の運営を一つの画面でスムーズに。ProofLoop。",
};

function MockChrome() {
  return (
    <div className="rounded-t-lg border-b border-slate-200/80 bg-slate-100/90 px-3 py-2 flex items-center gap-1.5">
      <span className="size-2.5 rounded-full bg-red-400/90" />
      <span className="size-2.5 rounded-full bg-amber-400/90" />
      <span className="size-2.5 rounded-full bg-emerald-400/90" />
      <span className="ml-2 text-[10px] text-slate-400 font-medium tracking-wide">
        proofloop.app
      </span>
    </div>
  );
}

/** Inbox + 応募者カンバン */
function MockInboxKanban() {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200/80 rounded-xl aspect-video shadow-inner border border-slate-200/60 overflow-hidden flex flex-col">
      <MockChrome />
      <div className="flex-1 p-4 flex gap-3 min-h-0">
        <div className="w-[38%] rounded-lg bg-white shadow-sm border border-slate-200/80 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-600">
            <Inbox className="size-4 shrink-0 text-primary" strokeWidth={2} />
            <span className="text-[11px] font-bold">Inbox</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-md bg-slate-50 border border-slate-100 p-2 flex gap-2"
            >
              <div className="size-8 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-3/4 rounded bg-slate-200" />
                <div className="h-1.5 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-lg bg-white shadow-sm border border-slate-200/80 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-600">
            <Kanban className="size-4 shrink-0 text-primary" strokeWidth={2} />
            <span className="text-[11px] font-bold">採用ボード</span>
          </div>
          <div className="flex-1 flex gap-2 min-h-0">
            {["新規", "面談中", "内定"].map((label, idx) => (
              <div
                key={label}
                className="flex-1 rounded-md bg-slate-50 border border-dashed border-slate-200 p-2"
              >
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {label}
                </span>
                {idx === 0 && (
                  <div className="mt-2 h-14 rounded bg-white border border-slate-200 shadow-sm" />
                )}
                {idx === 1 && (
                  <div className="mt-2 space-y-2">
                    <div className="h-10 rounded bg-white border border-slate-200" />
                    <div className="h-10 rounded bg-white border border-slate-200" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** タイムライン */
function MockTimeline() {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200/80 rounded-xl aspect-video shadow-inner border border-slate-200/60 overflow-hidden flex flex-col">
      <MockChrome />
      <div className="flex-1 p-4 overflow-hidden">
        <div className="flex items-center gap-2 mb-3 text-slate-600">
          <Rss className="size-4 text-primary" strokeWidth={2} />
          <span className="text-[11px] font-bold">タイムライン</span>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl bg-white border border-slate-200 shadow-sm p-3"
            >
              <div className="flex gap-3">
                <div className="size-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-24 rounded bg-slate-200" />
                    <div className="h-2 w-12 rounded-full bg-emerald-100" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 w-full rounded bg-slate-100" />
                    <div className="h-2 w-[90%] rounded bg-slate-100" />
                    <div className="h-2 w-[70%] rounded bg-slate-100" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** カレンダー + 詳細 */
function MockCalendarEvent() {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200/80 rounded-xl aspect-video shadow-inner border border-slate-200/60 overflow-hidden flex flex-col">
      <MockChrome />
      <div className="flex-1 p-4 flex gap-3 min-h-0">
        <div className="w-[52%] rounded-lg bg-white border border-slate-200/80 shadow-sm p-3">
          <div className="flex items-center gap-2 text-slate-600 mb-3">
            <CalendarDays className="size-4 text-primary" strokeWidth={2} />
            <span className="text-[11px] font-bold">イベントカレンダー</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[8px] text-slate-400 font-medium mb-1">
            {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded text-[9px] flex items-center justify-center ${
                  i === 10
                    ? "bg-primary text-white font-bold shadow"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-white border border-slate-200/80 shadow-sm p-3 flex flex-col">
          <div className="h-20 rounded-lg bg-slate-100 mb-3 flex items-center justify-center">
            <LayoutGrid className="size-8 text-slate-300" strokeWidth={1.5} />
          </div>
          <div className="h-2.5 w-3/4 rounded bg-slate-200 mb-2" />
          <div className="h-2 w-full rounded bg-slate-100 mb-1" />
          <div className="h-2 w-[85%] rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

/** タスク + メンバー招待 */
function MockTasksInvite() {
  return (
    <div className="bg-gradient-to-br from-slate-100 to-slate-200/80 rounded-xl aspect-video shadow-inner border border-slate-200/60 overflow-hidden flex flex-col">
      <MockChrome />
      <div className="flex-1 p-4 flex gap-3 min-h-0">
        <div className="flex-1 rounded-lg bg-white border border-slate-200/80 shadow-sm p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-600">
            <ListTodo className="size-4 text-primary" strokeWidth={2} />
            <span className="text-[11px] font-bold">タスク</span>
          </div>
          <div className="flex gap-2 flex-1 min-h-0">
            {["未対応", "進行中"].map((t) => (
              <div
                key={t}
                className="flex-1 rounded-md bg-slate-50 border border-slate-100 p-2"
              >
                <span className="text-[9px] text-slate-400 font-bold">{t}</span>
                <div className="mt-2 space-y-2">
                  <div className="h-8 rounded border border-slate-200 bg-white" />
                  <div className="h-8 rounded border border-slate-200 bg-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[40%] rounded-lg bg-white border border-slate-200/80 shadow-sm p-3 flex flex-col">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <UserPlus className="size-4 text-primary" strokeWidth={2} />
            <span className="text-[11px] font-bold">招待</span>
          </div>
          <div className="rounded-lg border-2 border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center gap-2 p-2">
            <Users className="size-10 text-slate-300" strokeWidth={1.25} />
            <div className="h-6 w-full max-w-[100px] rounded bg-slate-100" />
            <div className="h-5 w-16 rounded bg-primary/90" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForClubsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-display antialiased break-keep">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,43,92,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-28 md:pt-32 md:pb-36 text-center">
          <p className="text-sm font-bold tracking-widest text-primary/80 uppercase mb-8 leading-relaxed">
            For student organizations
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.5] md:leading-[1.3] text-center max-w-4xl mx-auto">
            「知ってもらう」から「仲間になる」、
            <br className="hidden md:inline" />
            そして「活動を広げる」まで。
            <br />
            <span className="block mt-4 md:mt-6 text-2xl md:text-4xl font-bold text-primary leading-snug md:leading-[1.35] tracking-tight">
              学生団体の運営を劇的にラクにする
              <br className="md:hidden" />
              プラットフォーム、ProofLoop。
            </span>
          </h1>
          <p className="mt-12 max-w-3xl mx-auto text-base md:text-lg text-slate-600 leading-loose text-pretty break-keep">
            SNSのDM管理、バラバラのツールでの名簿作成、誰が何をやっているか分からないタスク管理……。毎年繰り返される煩雑な作業はもう終わりにしましょう。ProofLoopなら、新メンバーの募集から日々のタスク共有、イベントの告知まで、一つの画面でスムーズに完結します。
          </p>
          <div className="mt-14">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-white leading-relaxed shadow-lg shadow-primary/20 transition hover:bg-[#001f42] hover:shadow-xl hover:shadow-primary/25"
            >
              無料で団体を登録する
              <ArrowRight className="size-5 shrink-0" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Z-layout */}
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32 space-y-28 md:space-y-40">
        {/* ① */}
        <section className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="order-2 lg:order-1 space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-primary leading-relaxed">
              <MessageSquare className="size-3.5 shrink-0" />
              01
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-primary leading-relaxed text-balance break-keep">
              興味を持ってくれた人を、スムーズに「仲間」へ。
            </h2>
            <p className="text-base md:text-lg text-slate-600 leading-loose text-pretty break-keep">
              SNSで質問が来たけど、返信が遅れて他サークルに流れてしまった……。そんなすれ違いを防ぎます。学生はワンタップで応募が可能。その後のメッセージのやり取りや、面談の進み具合もすべてProofLoop上で一覧できるため、連絡漏れをなくし、せっかくの縁を確実につなぎます。
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="bg-gray-100 rounded-xl aspect-video p-4 md:p-6 shadow-sm border border-slate-200/60">
              <MockInboxKanban />
            </div>
            <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed break-keep">
              Inboxと応募者管理カンバンボード（イメージ）
            </p>
          </div>
        </section>

        {/* ② */}
        <section className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="order-1">
            <div className="bg-gray-100 rounded-xl aspect-video p-4 md:p-6 shadow-sm border border-slate-200/60">
              <MockTimeline />
            </div>
            <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed break-keep">
              タイムライン（フィード）（イメージ）
            </p>
          </div>
          <div className="order-2 space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-primary leading-relaxed">
              <Rss className="size-3.5 shrink-0" />
              02
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-primary leading-relaxed text-balance break-keep">
              春の公式オリエンテーションに頼らない。いつでも学生の目に留まる。
            </h2>
            <p className="text-base md:text-lg text-slate-600 leading-loose text-pretty break-keep">
              大学の公式な新歓期間は4月で終わってしまいますが、ProofLoopなら時期を問わず新しいメンバーを歓迎できます。普段の活動風景や「おすすめの授業」などの情報をタイムラインに投稿することで、年間を通じて学生にあなたの団体を知ってもらうチャンスが圧倒的に増えます。
            </p>
          </div>
        </section>

        {/* ③ */}
        <section className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="order-2 lg:order-1 space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-primary leading-relaxed">
              <CalendarDays className="size-3.5 shrink-0" />
              03
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-primary leading-relaxed text-balance break-keep">
              新歓も、日々の「イベント集客」も。人を集めたいすべての活動に。
            </h2>
            <p className="text-base md:text-lg text-slate-600 leading-loose text-pretty break-keep">
              メンバー募集はもちろん、学園祭の出し物、定期公演、学生向けセミナーなど、人を集めたいイベントの情報も自由に発信できます。ProofLoopの団体ページやカレンダー機能を使って、同じ大学の学生へ向けてイベントの魅力を効果的にアピールしましょう。
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="bg-gray-100 rounded-xl aspect-video p-4 md:p-6 shadow-sm border border-slate-200/60">
              <MockCalendarEvent />
            </div>
            <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed break-keep">
              イベントカレンダーと詳細ページ（イメージ）
            </p>
          </div>
        </section>

        {/* ④ */}
        <section className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="order-1">
            <div className="bg-gray-100 rounded-xl aspect-video p-4 md:p-6 shadow-sm border border-slate-200/60">
              <MockTasksInvite />
            </div>
            <p className="mt-4 text-center text-xs text-slate-400 leading-relaxed break-keep">
              タスク管理ボードとメンバー招待（イメージ）
            </p>
          </div>
          <div className="order-2 space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-bold text-primary leading-relaxed">
              <Users className="size-3.5 shrink-0" />
              04
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-primary leading-relaxed text-balance break-keep">
              新歓期も、それ以外の日常も。運営メンバー全員で状況を共有。
            </h2>
            <p className="text-base md:text-lg text-slate-600 leading-loose text-pretty break-keep">
              複数の運営メンバーを招待し、権限を分けて安全にアカウントを共有できます。新歓期の忙しい連絡対応だけでなく、1年を通じた日々の活動に向けたタスクも全員で可視化。「誰がどの作業をやっているか分からない」という引き継ぎのトラブルをなくし、代表者や一部のメンバーだけに負担が偏るのを防ぎます。
            </p>
          </div>
        </section>
      </div>

      {/* Killer content — 穏やかな背景 + 赤はアクセントのみ */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-gray-50 border-y border-slate-100/80">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(0,43,92,0.06),transparent)]"
          aria-hidden
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-red-950/5 border border-red-950/10 mb-10">
            <Sparkles className="size-7 text-red-950/90" strokeWidth={2} />
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-[2rem] font-bold text-red-950 leading-loose text-balance break-keep">
            【今後の新機能】日々の活動実績が、企業からの「協賛金」に変わる。
          </h2>
          <p className="mt-10 text-base md:text-lg text-slate-700 leading-loose text-pretty max-w-3xl mx-auto break-keep">
            ProofLoopは、ただの便利ツールで終わるつもりはありません。ダッシュボードに貯まっていく「ページの閲覧数」や「日々の投稿を通じた活発な活動実績」は、将来的にリリース予定の【協賛マッチング機能】において、企業へ団体の魅力を伝える強力なアピール材料になります。日々の運営をProofLoopで行い、実績を積み重ねておくことが、未来の活動資金獲得への第一歩になります。
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-slate-50 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary leading-loose text-balance break-keep">
            これからの学生団体運営の、新しいスタンダード。初期設定は数分で完了。まずは無料で、あなたの団体のページを作成してみませんか？
          </h2>
          <div className="mt-14">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-white leading-relaxed shadow-lg shadow-primary/15 transition hover:bg-[#001f42]"
            >
              無料で団体を登録する
              <ArrowRight className="size-5 shrink-0" strokeWidth={2.5} />
            </Link>
          </div>
          <p className="mt-10 text-sm text-slate-500 leading-relaxed break-keep">
            すでにアカウントをお持ちの方は{" "}
            <Link
              href="/login"
              className="font-bold text-primary underline-offset-4 hover:underline"
            >
              ログイン
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

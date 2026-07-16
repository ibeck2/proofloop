import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, CalendarDays, Inbox, Kanban, LayoutGrid,
  ListTodo, MessageSquare, Rss, Sparkles, UserPlus, Users,
  CheckCircle2, TrendingUp, Shield, Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "学生団体の運営を、もっとスマートに | ProofLoop",
  description:
    "新メンバー募集・タスク管理・イベント告知まで一つの画面で完結。LINEのDM管理・バラバラのスプレッドシートから卒業しよう。ProofLoop——学生団体のための無料プラットフォーム。",
};

// ─────────────────────────────────────────────
// Mock UI Components
// ─────────────────────────────────────────────
function MockChrome() {
  return (
    <div className="rounded-t-lg border-b border-slate-200/80 bg-slate-100/90 px-3 py-2 flex items-center gap-1.5">
      <span className="size-2.5 rounded-full bg-red-400/90" />
      <span className="size-2.5 rounded-full bg-amber-400/90" />
      <span className="size-2.5 rounded-full bg-emerald-400/90" />
      <span className="ml-2 text-[10px] text-slate-400 font-medium tracking-wide">proofloop.app</span>
    </div>
  );
}

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
            <div key={i} className="rounded-md bg-slate-50 border border-slate-100 p-2 flex gap-2">
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
              <div key={label} className="flex-1 rounded-md bg-slate-50 border border-dashed border-slate-200 p-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                {idx === 0 && <div className="mt-2 h-14 rounded bg-white border border-slate-200 shadow-sm" />}
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
            <div key={i} className="rounded-xl bg-white border border-slate-200 shadow-sm p-3">
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
            {["日","月","火","水","木","金","土"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i}
                className={`aspect-square rounded text-[9px] flex items-center justify-center ${
                  i === 10 ? "bg-primary text-white font-bold shadow" : "bg-slate-50 text-slate-500"
                }`}>
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
              <div key={t} className="flex-1 rounded-md bg-slate-50 border border-slate-100 p-2">
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

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function ForClubsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 antialiased break-keep">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,43,92,0.10),transparent)]" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary mb-8">
            学生団体・サークル向け　完全無料
          </div>

          <h1 className="text-3xl md:text-[2.75rem] lg:text-5xl font-black text-slate-900 tracking-tight leading-tight md:leading-tight max-w-4xl mx-auto">
            LINEのDM管理、もう限界じゃないですか。
          </h1>
          <p className="mt-6 text-lg md:text-xl text-primary font-bold">
            新メンバー募集・タスク管理・イベント告知を、一つの画面で。
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-base text-slate-600 leading-relaxed">
            「返信漏れで候補者を逃した」「誰が何をやっているかわからない」「毎年の新歓で同じ失敗を繰り返す」——
            学生団体あるあるを、ProofLoopがまとめて解決します。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-primary px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-[#001f42] hover:shadow-xl">
              無料で団体を登録する
              <ArrowRight className="size-5 shrink-0" strokeWidth={2.5} />
            </Link>
            <a href="#features" className="text-sm font-bold text-primary/70 hover:text-primary transition underline underline-offset-4">
              機能を見る
            </a>
          </div>

          {/* 信頼指標 */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            {[
              { icon: <CheckCircle2 className="size-4 text-emerald-500" />, text: "無料で始められる" },
              { icon: <Shield className="size-4 text-blue-500" />, text: "メンバー招待・権限管理あり" },
              { icon: <Zap className="size-4 text-amber-500" />, text: "登録5分で即公開" },
              { icon: <TrendingUp className="size-4 text-primary" />, text: "将来の協賛獲得にも繋がる" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 font-medium">
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 課題提起：Before ── */}
      <section className="bg-slate-50 border-b border-slate-100 py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-bold tracking-widest text-slate-400 uppercase mb-8">こんな悩み、ありませんか？</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "SNSのDMで応募が来るが、誰がどこまで対応したか把握できない",
              "スプレッドシートの名簿が古くなって、どれが最新版かわからない",
              "新歓のLINEグループが毎年増えて、過去の連絡が見つからない",
              "タスクを口頭で振ったが、締め切り当日に「忘れてた」と言われた",
              "代替わりのたびに引き継ぎがぐちゃぐちゃになる",
              "せっかくのイベントも告知が上手くいかず、集客に失敗した",
            ].map((pain, i) => (
              <div key={i} className="flex items-start gap-3 bg-white border border-slate-200 p-4">
                <span className="text-slate-300 font-black text-lg leading-none shrink-0 mt-0.5">×</span>
                <p className="text-sm text-slate-600 leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm font-bold text-primary">
            これ、全部ProofLoopで解決できます。
          </p>
        </div>
      </section>

      {/* ── 機能紹介 Zレイアウト ── */}
      <div id="features" className="max-w-6xl mx-auto px-6 py-20 md:py-32 space-y-24 md:space-y-36">

        {/* ① 応募管理 */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 text-xs font-bold text-primary">
              <MessageSquare className="size-3.5 shrink-0" />01 ／ 応募・採用管理
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-primary leading-snug">
              「あの子、もう連絡した？」を<br />なくす。
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              学生はワンタップで応募。その後のメッセージのやり取りから面談の進捗まで、カンバンボードで全員分を一覧管理。返信漏れで候補者を逃すことがなくなります。
            </p>
            <ul className="flex flex-col gap-2">
              {["応募フォームを自動生成", "Inboxで連絡を一元管理", "採用ステータスをカンバンで可視化"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <MockInboxKanban />
            <p className="mt-3 text-center text-xs text-slate-400">Inboxと応募者管理カンバンボード（イメージ）</p>
          </div>
        </section>

        {/* ② タイムライン */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-1">
            <MockTimeline />
            <p className="mt-3 text-center text-xs text-slate-400">タイムライン（イメージ）</p>
          </div>
          <div className="order-2 space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 text-xs font-bold text-primary">
              <Rss className="size-3.5 shrink-0" />02 ／ タイムライン発信
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-primary leading-snug">
              4月だけじゃない。<br />年間を通じて目に留まる。
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              大学の新歓期間は4月で終わっても、ProofLoopなら通年でメンバーを募集できます。普段の活動風景・イベント報告・お役立ち情報を投稿して、学生との接点を増やし続けましょう。
            </p>
            <ul className="flex flex-col gap-2">
              {["写真・テキストを投稿してフォロワーに届く", "新歓期以外もメンバー募集を継続できる", "投稿が団体の実績として蓄積される"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ③ イベント */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 text-xs font-bold text-primary">
              <CalendarDays className="size-3.5 shrink-0" />03 ／ イベント告知・集客
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-primary leading-snug">
              新歓も、公演も、勉強会も。<br />人が集まる仕組みを作る。
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              メンバー募集だけでなく、学園祭・定期公演・セミナーなどのイベント告知もProofLoopで一元化。カレンダーページで同じ大学の学生に向けて効果的に発信できます。
            </p>
            <ul className="flex flex-col gap-2">
              {["イベントページをワンクリックで作成", "日時・場所・参加申込フォームを設定", "学内の学生のカレンダーに表示される"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <MockCalendarEvent />
            <p className="mt-3 text-center text-xs text-slate-400">イベントカレンダーと詳細ページ（イメージ）</p>
          </div>
        </section>

        {/* ④ タスク・メンバー管理 */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-1">
            <MockTasksInvite />
            <p className="mt-3 text-center text-xs text-slate-400">タスク管理ボードとメンバー招待（イメージ）</p>
          </div>
          <div className="order-2 space-y-6">
            <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 text-xs font-bold text-primary">
              <Users className="size-3.5 shrink-0" />04 ／ タスク・メンバー管理
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-primary leading-snug">
              「誰が何をやるか」を<br />全員で見える化する。
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              運営メンバーを招待し、権限を分けて安全にアカウントを共有。タスクをカンバンで管理することで「言った・言ってない」をなくし、代替わりの引き継ぎも格段にスムーズになります。
            </p>
            <ul className="flex flex-col gap-2">
              {["複数メンバーを招待・権限設定", "タスクをカンバンで全員と共有", "引き継ぎ資料として活用できる"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ── 協賛マッチング（Coming Soon） ── */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-primary">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.08),transparent)]" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-white/80 mb-8">
            近日公開予定
          </div>
          <div className="inline-flex items-center justify-center size-14 bg-white/10 border border-white/20 mb-6">
            <Sparkles className="size-7 text-white" strokeWidth={2} />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white leading-snug mb-6">
            日々の活動実績が、<br />企業からの「協賛金」に変わる。
          </h2>
          <p className="text-base text-white/70 leading-relaxed max-w-2xl mx-auto">
            ProofLoopで活動を続けることで蓄積される「閲覧数」「投稿実績」「メンバー数」は、
            将来リリース予定の<strong className="text-white">協賛マッチング機能</strong>で企業へのアピール材料になります。
            今から使い始めることが、未来の活動資金獲得への最短ルートです。
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-slate-50 border-y border-slate-100 py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-xl md:text-2xl font-black text-primary text-center mb-12">よくある質問</h2>
          <div className="flex flex-col divide-y divide-slate-200">
            {[
              { q: "本当に無料ですか？", a: "はい、現在提供しているすべての機能を無料でご利用いただけます。将来的に有料プランを追加する場合も、無料プランは継続する予定です。" },
              { q: "何人まで運営メンバーを招待できますか？", a: "現在は人数制限なく招待できます。権限（管理者・編集者・閲覧者）を設定できるため、安心して複数人での運営が可能です。" },
              { q: "登録から公開までどのくらいかかりますか？", a: "アカウント作成・団体情報の入力・プロフィール設定まで最短5分で完了します。登録後すぐに団体ページが公開されます。" },
              { q: "どんな学生団体でも登録できますか？", a: "サークル・部活・学生NPO・ゼミ・インカレ団体など、学生が主体となって活動する団体であれば基本的にご利用いただけます。" },
              { q: "既存のSNSやLINEと併用できますか？", a: "もちろん可能です。ProofLoopをメンバー管理・タスク管理の中心にしつつ、拡散はSNSで行うというハイブリッドな使い方をされている団体が多いです。" },
            ].map((item, i) => (
              <div key={i} className="py-5">
                <p className="font-bold text-primary text-sm mb-2">{item.q}</p>
                <p className="text-text-grey text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-primary leading-snug mb-4">
            まず、あなたの団体の<br />ページを作ってみませんか？
          </h2>
          <p className="text-slate-600 text-base mb-10 leading-relaxed">
            登録無料・5分で完了・クレジットカード不要。
            いつでも削除できます。
          </p>
          <Link href="/signup"
            className="inline-flex items-center justify-center gap-2 bg-primary px-10 py-4 text-base font-black text-white shadow-lg shadow-primary/20 transition hover:bg-[#001f42] hover:shadow-xl">
            無料で団体を登録する
            <ArrowRight className="size-5 shrink-0" strokeWidth={2.5} />
          </Link>
          <p className="mt-6 text-sm text-slate-500">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="font-bold text-primary hover:underline underline-offset-4">
              ログイン
            </Link>
          </p>
          <p className="mt-3 text-sm text-slate-500">
            使い方を確認したい方は{" "}
            <Link href="/manual" className="font-bold text-primary hover:underline underline-offset-4">
              運営マニュアル
            </Link>
          </p>
        </div>
      </section>

    </main>
  );
}
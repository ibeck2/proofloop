import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import {
  ArrowRight, CalendarDays, Inbox, Kanban,
  MessageSquare, Rss, Sparkles, Users,
  CheckCircle2, TrendingUp, Shield, Zap, Wallet,
} from "lucide-react";
import FinanceDemo from "@/components/for-clubs/FinanceDemo";
import { aggregateByCategory, summarize } from "@/lib/finance/aggregate";
import {
  DEMO_BUDGETS,
  DEMO_CATEGORIES,
  DEMO_OPENING_BALANCE,
  DEMO_ORG_NAME,
  DEMO_TRANSACTIONS,
} from "@/lib/for-clubs/financeDemoData";

const yen = new Intl.NumberFormat("ja-JP");

export const metadata: Metadata = {
  // 末尾に「| ProofLoop」を付けない。app/layout.tsx が
  // title.template = "%s | ProofLoop" を持っており自動で付与されるため、
  // ここに書くと「… | ProofLoop | ProofLoop」と二重になる。
  // （openGraph.title にはテンプレートが効かないので、そちらは明示する）
  title: "サークル・学生団体の運営を、もっとスマートに",
  description:
    "会計・新メンバー募集・タスク管理・イベント告知まで一つの画面で完結。LINEのDM管理・バラバラのスプレッドシートから卒業しよう。ProofLoop——サークル・学生団体のための無料プラットフォーム。",
  openGraph: {
    type: "website",
    url: `${SITE_URL}/for-clubs`,
    siteName: "ProofLoop",
    title: "サークル・学生団体の運営を、もっとスマートに | ProofLoop",
    description:
      "会計・新メンバー募集・タスク管理・イベント告知まで一つの画面で完結。サークル・学生団体のための無料プラットフォームです。",
    locale: "ja_JP",
  },
  alternates: { canonical: `${SITE_URL}/for-clubs` },
};

// ─────────────────────────────────────────────
// Mock UI Components
// ─────────────────────────────────────────────
function MockChrome({ path }: { path: string }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-rule bg-mist px-3 py-2">
      <span className="size-2.5 rounded-full bg-rule" />
      <span className="size-2.5 rounded-full bg-rule" />
      <span className="size-2.5 rounded-full bg-rule" />
      <span className="ml-2 text-[10px] font-medium tracking-wide text-graphite/70">
        proofloop.jp{path}
      </span>
    </div>
  );
}

const DEMO_APPLICANTS = [
  { name: "佐藤 みなみ", faculty: "文学部1年", stage: "新規" },
  { name: "鈴木 大地", faculty: "経済学部2年", stage: "面談中" },
  { name: "高橋 あやか", faculty: "理工学部1年", stage: "面談中" },
  { name: "田中 りく", faculty: "法学部1年", stage: "内定" },
];

function MockInboxKanban() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubats" />
      <div className="flex min-h-0 flex-1 gap-3 p-4">
        <div className="flex w-[38%] flex-col gap-2 border border-rule bg-paper p-3">
          <div className="flex items-center gap-2 text-ink">
            <Inbox className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-bold">
              応募 <span className="font-numeric tabular-nums">4</span>件
            </span>
          </div>
          {DEMO_APPLICANTS.map((a) => (
            <div key={a.name} className="border border-rule bg-mist p-2">
              <p className="text-[11px] font-bold text-ink">{a.name}</p>
              <p className="text-[10px] text-graphite">{a.faculty}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2 border border-rule bg-paper p-3">
          <div className="flex items-center gap-2 text-ink">
            <Kanban className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="text-[11px] font-bold">応募ボード</span>
          </div>
          <div className="flex min-h-0 flex-1 gap-2">
            {["新規", "面談中", "内定"].map((stage) => (
              <div key={stage} className="flex-1 border border-dashed border-rule bg-mist p-2">
                <span className="text-[9px] font-bold tracking-wider text-graphite/70">
                  {stage}
                </span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {DEMO_APPLICANTS.filter((a) => a.stage === stage).map((a) => (
                    <div key={a.name} className="border border-rule bg-paper px-2 py-1.5">
                      <p className="truncate text-[10px] font-bold text-ink">{a.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const DEMO_POSTS = [
  { title: "夏合宿、無事に終わりました！", date: "8月2日", likes: 24 },
  { title: "新歓公演のリハーサル風景", date: "7月28日", likes: 17 },
  { title: "初心者歓迎の体験練習やります", date: "7月21日", likes: 31 },
];

function MockTimeline() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/timeline" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {DEMO_POSTS.map((p) => (
          <div key={p.title} className="flex gap-3 border border-rule bg-paper p-3">
            <div className="size-9 shrink-0 border border-rule bg-mist" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-ink">{DEMO_ORG_NAME}</p>
              <p className="truncate text-[11px] text-graphite">{p.title}</p>
              <p className="mt-1 text-[10px] text-graphite/70">
                {p.date} ・ いいね <span className="font-numeric tabular-nums">{p.likes}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEMO_EVENTS = [
  { day: "9/14", title: "新歓体験練習", place: "第2体育館", participants: 18 },
  { day: "9/21", title: "OB・OG交流会", place: "学生会館 3F", participants: 12 },
  { day: "10/5", title: "学祭ステージ本番", place: "中央広場", participants: 36 },
];

function MockCalendarEvent() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubevents" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {DEMO_EVENTS.map((e) => (
          <div key={e.title} className="flex items-center gap-3 border border-rule bg-paper p-3">
            <div className="flex size-11 shrink-0 flex-col items-center justify-center border border-rule bg-mist">
              <span className="font-numeric tabular-nums text-[11px] font-black text-ink">
                {e.day}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-ink">{e.title}</p>
              <p className="text-[10px] text-graphite">{e.place}</p>
            </div>
            <span className="shrink-0 text-[10px] text-graphite">
              参加 <span className="font-numeric tabular-nums">{e.participants}</span>人
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEMO_TASKS = [
  { title: "学祭の申請書を提出", owner: "田中", done: true },
  { title: "衣装の見積もりを取る", owner: "佐藤", done: true },
  { title: "音源を編集して共有", owner: "鈴木", done: false },
  { title: "OB会の案内を送る", owner: "高橋", done: false },
];

function MockTasksInvite() {
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubtasks" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        {DEMO_TASKS.map((t) => (
          <div key={t.title} className="flex items-center gap-3 border border-rule bg-paper p-2.5">
            <span
              className={`size-3.5 shrink-0 border ${
                t.done ? "border-ink bg-ink" : "border-rule bg-paper"
              }`}
              aria-hidden="true"
            />
            <p
              className={`min-w-0 flex-1 truncate text-[11px] ${
                t.done ? "text-graphite/60 line-through" : "text-ink"
              }`}
            >
              {t.title}
            </p>
            <span className="shrink-0 text-[10px] text-graphite">{t.owner}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockFinance() {
  const summary = summarize(DEMO_OPENING_BALANCE, DEMO_TRANSACTIONS);
  const rows = aggregateByCategory(DEMO_CATEGORIES, DEMO_TRANSACTIONS, DEMO_BUDGETS);
  return (
    <div className="flex flex-col overflow-hidden border border-rule bg-mist">
      <MockChrome path="/clubfinance" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="border border-rule bg-paper p-3">
          <p className="text-[10px] text-graphite">現在の残高</p>
          <p className="font-numeric tabular-nums text-xl font-black text-ink">
            ¥{yen.format(summary.closingBalance)}
          </p>
        </div>
        <div className="flex flex-col gap-2 border border-rule bg-paper p-3">
          <p className="text-[10px] font-bold text-ink">費目別の予算対比</p>
          {rows.map((r) => {
            const ratio = r.planned > 0 ? Math.min(r.actual / r.planned, 1) : 0;
            return (
              <div key={r.category_id} className="flex flex-col gap-1">
                <span className="text-[10px] text-graphite">{r.category_name}</span>
                <div className="h-1.5 w-full bg-mist">
                  <div className="h-1.5 bg-ink" style={{ width: `${ratio * 100}%` }} />
                </div>
              </div>
            );
          })}
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
    <main className="min-h-screen bg-paper text-ink antialiased break-keep font-body">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-rule">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,43,92,0.10),transparent)]" aria-hidden />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32 text-center">
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 border border-ink/20 bg-mist px-4 py-1.5 text-xs font-bold text-ink mb-8">
            サークル・学生団体向け　完全無料
          </div>

          <h1 className="font-mincho text-3xl md:text-[2.75rem] lg:text-5xl font-black text-ink tracking-tight leading-tight md:leading-tight max-w-4xl mx-auto">
            LINEのDM管理、もう限界じゃないですか。
          </h1>
          <p className="mt-6 text-lg md:text-xl text-ink font-bold">
            会計・新メンバー募集・タスク管理・イベント告知を、一つの画面で。
          </p>
          <p className="mt-4 max-w-2xl mx-auto text-base text-graphite leading-relaxed">
            「返信漏れで候補者を逃した」「誰が何をやっているかわからない」「毎年の新歓で同じ失敗を繰り返す」——
            サークル・学生団体あるあるを、ProofLoopがまとめて解決します。
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-seal px-8 py-4 text-base font-bold text-paper shadow-lg shadow-seal/20 transition hover:bg-[#600000] hover:shadow-xl">
              無料で団体を登録する
              <ArrowRight className="size-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            </Link>
            <a href="#features" className="text-sm font-bold text-ink/70 hover:text-ink transition underline underline-offset-4">
              機能を見る
            </a>
          </div>

          {/* 信頼指標 */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-graphite/70">
            {[
              { icon: <CheckCircle2 className="size-4 text-ink" aria-hidden="true" />, text: "無料で始められる" },
              { icon: <Shield className="size-4 text-ink" aria-hidden="true" />, text: "メンバー招待・権限管理あり" },
              { icon: <Zap className="size-4 text-ink" aria-hidden="true" />, text: "登録5分で即公開" },
              { icon: <TrendingUp className="size-4 text-ink" aria-hidden="true" />, text: "将来の協賛獲得にも繋がる" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 font-medium">
                {item.icon}
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 触れる会計デモ ── */}
      <section id="demo" className="border-b border-rule bg-paper py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8 text-center">
            <h2 className="font-mincho text-2xl font-black leading-snug text-ink md:text-3xl">
              まず、触ってみてください。
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-graphite">
              下は会計機能のデモです。金額を入れて「記録する」を押すと、残高・費目別の集計・予算対比がその場で動きます。登録もログインも要りません。
            </p>
          </div>
          <FinanceDemo />
        </div>
      </section>

      {/* ── 課題提起：Before ── */}
      <section className="bg-mist border-b border-rule py-16 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-bold tracking-widest text-graphite/70 uppercase mb-8">こんな悩み、ありませんか？</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "SNSのDMで応募が来るが、誰がどこまで対応したか把握できない",
              "スプレッドシートの名簿が古くなって、どれが最新版かわからない",
              "新歓のLINEグループが毎年増えて、過去の連絡が見つからない",
              "タスクを口頭で振ったが、締め切り当日に「忘れてた」と言われた",
              "代替わりのたびに引き継ぎがぐちゃぐちゃになる",
              "せっかくのイベントも告知が上手くいかず、集客に失敗した",
            ].map((pain, i) => (
              <div key={i} className="flex items-start gap-3 bg-paper border border-rule p-4">
                <span className="text-graphite/40 font-black text-lg leading-none shrink-0 mt-0.5">×</span>
                <p className="text-sm text-graphite leading-relaxed">{pain}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm font-bold text-ink">
            これ、全部ProofLoopで解決できます。
          </p>
        </div>
      </section>

      {/* ── 機能紹介 Zレイアウト ── */}
      <div id="features" className="max-w-6xl mx-auto px-6 py-20 md:py-32 space-y-24 md:space-y-36">

        {/* ① 会計・財務 */}
        <section className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="order-2 space-y-6 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-mist px-3 py-1.5 text-xs font-bold text-ink">
              <Wallet className="size-3.5 shrink-0" aria-hidden="true" />01 ／ 会計・財務
            </div>
            <h2 className="font-mincho text-2xl font-black leading-snug text-ink md:text-3xl">
              代替わりで消える帳簿を、<br />なくす。
            </h2>
            <p className="text-base leading-relaxed text-graphite">
              大学へ提出する年次の収支報告は、紙のレシートと手集計で毎年つくり直しになります。ProofLoopなら記録した時点で残高・費目別集計・予算対比が出そろい、そのままExcelで書き出せます。
            </p>
            <ul className="flex flex-col gap-2">
              {["出納帳・費目別集計・予算対比を自動で計算", "領収書の写真を取引に添付", "収支報告書と出納帳をExcelで出力", "会計担当だけが記録／閲覧は全員（透明性）"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-graphite">
                  <CheckCircle2 className="size-4 shrink-0 text-ink" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <a href="#demo" className="inline-block text-sm font-bold text-ink underline underline-offset-4">
              上のデモで実際に試す
            </a>
          </div>
          <div className="order-1 lg:order-1">
            <MockFinance />
            <p className="mt-3 text-center text-xs text-graphite/70">会計・財務の画面イメージ</p>
          </div>
        </section>

        {/* ② 応募管理 */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-mist px-3 py-1.5 text-xs font-bold text-ink">
              <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />02 ／ 入会応募者管理
            </div>
            <h2 className="font-mincho text-2xl md:text-3xl font-black text-ink leading-snug">
              「あの子、もう連絡した？」を<br />なくす。
            </h2>
            <p className="text-base text-graphite leading-relaxed">
              学生はワンタップで応募。その後のメッセージのやり取りから面談の進捗まで、カンバンボードで全員分を一覧管理。返信漏れで候補者を逃すことがなくなります。
            </p>
            <ul className="flex flex-col gap-2">
              {["応募フォームを自動生成", "Inboxで連絡を一元管理", "応募ステータスをカンバンで可視化"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-graphite">
                  <CheckCircle2 className="size-4 text-ink shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <MockInboxKanban />
            <p className="mt-3 text-center text-xs text-graphite/70">Inboxと応募者管理カンバンボード（イメージ）</p>
          </div>
        </section>

        {/* ③ タイムライン */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-1">
            <MockTimeline />
            <p className="mt-3 text-center text-xs text-graphite/70">タイムライン（イメージ）</p>
          </div>
          <div className="order-2 space-y-6">
            <div className="inline-flex items-center gap-2 bg-mist px-3 py-1.5 text-xs font-bold text-ink">
              <Rss className="size-3.5 shrink-0" aria-hidden="true" />03 ／ タイムライン発信
            </div>
            <h2 className="font-mincho text-2xl md:text-3xl font-black text-ink leading-snug">
              4月だけじゃない。<br />年間を通じて目に留まる。
            </h2>
            <p className="text-base text-graphite leading-relaxed">
              大学の新歓期間は4月で終わっても、ProofLoopなら通年でメンバーを募集できます。普段の活動風景・イベント報告・お役立ち情報を投稿して、学生との接点を増やし続けましょう。
            </p>
            <ul className="flex flex-col gap-2">
              {["写真・テキストを投稿してフォロワーに届く", "新歓期以外もメンバー募集を継続できる", "投稿が団体の実績として蓄積される"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-graphite">
                  <CheckCircle2 className="size-4 text-ink shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ④ イベント */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-mist px-3 py-1.5 text-xs font-bold text-ink">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />04 ／ イベント告知・集客
            </div>
            <h2 className="font-mincho text-2xl md:text-3xl font-black text-ink leading-snug">
              新歓も、公演も、勉強会も。<br />人が集まる仕組みを作る。
            </h2>
            <p className="text-base text-graphite leading-relaxed">
              メンバー募集だけでなく、学園祭・定期公演・セミナーなどのイベント告知もProofLoopで一元化。イベント一覧ページで同じ大学の学生に向けて効果的に発信できます。
            </p>
            <ul className="flex flex-col gap-2">
              {["イベントページをワンクリックで作成", "日時・場所・参加申込フォームを設定", "学内の学生のカレンダーに表示される"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-graphite">
                  <CheckCircle2 className="size-4 text-ink shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 lg:order-2">
            <MockCalendarEvent />
            <p className="mt-3 text-center text-xs text-graphite/70">イベント一覧（イメージ）</p>
          </div>
        </section>

        {/* ⑤ タスク・メンバー管理 */}
        <section className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-1">
            <MockTasksInvite />
            <p className="mt-3 text-center text-xs text-graphite/70">タスク一覧と進捗状況（イメージ）</p>
          </div>
          <div className="order-2 space-y-6">
            <div className="inline-flex items-center gap-2 bg-mist px-3 py-1.5 text-xs font-bold text-ink">
              <Users className="size-3.5 shrink-0" aria-hidden="true" />05 ／ タスク・メンバー管理
            </div>
            <h2 className="font-mincho text-2xl md:text-3xl font-black text-ink leading-snug">
              「誰が何をやるか」を<br />全員で見える化する。
            </h2>
            <p className="text-base text-graphite leading-relaxed">
              運営メンバーを招待し、権限を分けて安全にアカウントを共有。タスクに担当者と完了状況を紐づけて一覧管理することで「言った・言ってない」をなくし、代替わりの引き継ぎも格段にスムーズになります。
            </p>
            <ul className="flex flex-col gap-2">
              {["複数メンバーを招待・権限設定", "タスクを担当者・完了状況つきで全員に共有", "引き継ぎ資料として活用できる"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-graphite">
                  <CheckCircle2 className="size-4 text-ink shrink-0" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* ── 協賛マッチング（Coming Soon） ── */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-ink">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(255,255,255,0.08),transparent)]" aria-hidden />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 border border-paper/20 bg-paper/10 px-4 py-1.5 text-xs font-bold text-paper/80 mb-8">
            近日公開予定
          </div>
          <div className="inline-flex items-center justify-center size-14 bg-paper/10 border border-paper/20 mb-6">
            <Sparkles className="size-7 text-paper" strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 className="font-mincho text-2xl md:text-3xl font-black text-paper leading-snug mb-6">
            日々の活動実績が、<br />企業からの「協賛金」に変わる。
          </h2>
          <p className="text-base text-paper/70 leading-relaxed max-w-2xl mx-auto">
            ProofLoopで活動を続けることで蓄積される「閲覧数」「投稿実績」「メンバー数」は、
            将来リリース予定の<strong className="text-paper">協賛マッチング機能</strong>で企業へのアピール材料になります。
            今から使い始めることが、未来の活動資金獲得への最短ルートです。
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-mist border-y border-rule py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-mincho text-xl md:text-2xl font-black text-ink text-center mb-12">よくある質問</h2>
          <div className="flex flex-col divide-y divide-rule">
            {[
              { q: "本当に無料ですか？", a: "はい、現在提供しているすべての機能を無料でご利用いただけます。将来的に有料プランを追加する場合も、無料プランは継続する予定です。" },
              { q: "何人まで運営メンバーを招待できますか？", a: "現在は人数制限なく招待できます。権限（管理者・編集者・閲覧者）を設定できるため、安心して複数人での運営が可能です。" },
              { q: "登録から公開までどのくらいかかりますか？", a: "アカウント作成・団体情報の入力・プロフィール設定まで最短5分で完了します。登録後すぐに団体ページが公開されます。" },
              { q: "どんな団体でも登録できますか？", a: "サークル・部活・学生NPO・ゼミ・インカレ団体など、学生が主体となって活動する団体であれば基本的にご利用いただけます。" },
              { q: "既存のSNSやLINEと併用できますか？", a: "もちろん可能です。ProofLoopをメンバー管理・タスク管理の中心にしつつ、拡散はSNSで行うというハイブリッドな使い方をされている団体が多いです。" },
              { q: "会計担当以外にも帳簿が見えてしまいませんか？", a: "記録・編集ができるのは会計担当の権限を持つ方だけですが、閲覧はメンバー全員が可能です。お金の流れが見えることは学生団体の信頼の土台になるため、あえてこの設計にしています。" },
            ].map((item, i) => (
              <div key={i} className="py-5">
                <p className="font-bold text-ink text-sm mb-2">{item.q}</p>
                <p className="text-graphite text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="py-20 md:py-28 bg-paper">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-mincho text-2xl md:text-3xl font-black text-ink leading-snug mb-4">
            まず、あなたの団体の<br />ページを作ってみませんか？
          </h2>
          <p className="text-graphite text-base mb-10 leading-relaxed">
            登録無料・5分で完了・クレジットカード不要。
            いつでも削除できます。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-seal px-10 py-4 text-base font-black text-paper shadow-lg shadow-seal/20 transition hover:bg-[#600000] hover:shadow-xl">
              無料で団体を登録する
              <ArrowRight className="size-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            </Link>
            <Link href="/manual" className="text-sm font-bold text-ink/70 underline underline-offset-4 transition hover:text-ink">
              登録後の使い方を見る
            </Link>
          </div>
          <p className="mt-6 text-sm text-graphite/70">
            すでにアカウントをお持ちの方は{" "}
            <Link href="/login" className="font-bold text-ink hover:underline underline-offset-4">
              ログイン
            </Link>
          </p>
        </div>
      </section>

    </main>
  );
}

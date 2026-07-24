import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import {
  BookOpen,
  ChevronRight,
  Inbox,
  ListTodo,
  CalendarDays,
  Rss,
  MessageSquare,
  Images,
  Users,
  IdCard,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  // 末尾に「| ProofLoop」を付けない。app/layout.tsx が
  // title.template = "%s | ProofLoop" を持っており自動で付与されるため、
  // ここに書くと「… | ProofLoop | ProofLoop」と二重になる。
  // （openGraph.title にはテンプレートが効かないので、そちらは明示する）
  title: "運営マニュアル｜学生団体向けの使い方ガイド",
  description:
    "ProofLoopを学生団体で使うための手順書。アカウント登録から団体プロフィールの公開、新歓の応募管理、タスク・イベント・メンバー権限の使い方までを、実際の画面の流れに沿ってまとめています。",
  keywords: [
    "学生団体 運営",
    "サークル 運営 ツール",
    "新歓 管理",
    "学生団体 タスク管理",
    "ProofLoop 使い方",
  ],
  openGraph: {
    type: "website",
    url: `${SITE_URL}/manual`,
    siteName: "ProofLoop",
    title: "運営マニュアル｜学生団体向けの使い方ガイド | ProofLoop",
    description:
      "アカウント登録から団体プロフィールの公開、新歓の応募管理、タスク・イベント・メンバー権限まで。ProofLoopを学生団体で使うための手順書です。",
    locale: "ja_JP",
  },
  alternates: { canonical: `${SITE_URL}/manual` },
};

// ─────────────────────────────────────────────
// セットアップ手順（登録直後にやること）
// ─────────────────────────────────────────────
const SETUP_STEPS = [
  {
    n: "1",
    title: "アカウントを登録する",
    body: "団体の代表者がアカウントを作成します。登録後、運営が団体情報を確認して承認します。承認されるまでは団体ページは公開されません。",
    href: "/signup",
    linkLabel: "新規登録へ",
  },
  {
    n: "2",
    title: "団体プロフィールを埋める",
    body: "団体名・大学・分野に加えて、活動内容の説明や公式サイト・SNSを登録します。ここが検索結果と団体ページに出る情報なので、最初にきちんと埋めるほど後が楽です。",
    href: "/clubprofile",
    linkLabel: "団体プロフィール",
  },
  {
    n: "3",
    title: "メンバーを招待する",
    body: "招待リンクを発行して幹部やメンバーを追加します。権限を分けられるので、会計や新歓担当だけに必要な画面を渡せます。",
    href: "/clubsettings/members",
    linkLabel: "メンバー・権限設定",
  },
];

// ─────────────────────────────────────────────
// 機能別の使い方
// ─────────────────────────────────────────────
const FEATURES = [
  {
    Icon: Inbox,
    name: "新歓の応募管理（ATS）",
    href: "/clubats",
    body: "説明会や体験入会の応募を一覧で管理します。応募者ごとに選考の進み具合を移動させられるので、「誰にまだ連絡していないか」が一目で分かります。LINEのDMを遡る作業がなくなります。",
  },
  {
    Icon: ListTodo,
    name: "タスク管理",
    href: "/clubtasks",
    body: "担当者と期限をつけてタスクを並べます。ドラッグで状態を動かせるので、定例の前に進捗を確認する用途に向いています。",
  },
  {
    Icon: CalendarDays,
    name: "イベント",
    href: "/clubevents",
    body: "説明会・合宿・定例などの予定を登録します。公開したイベントは学生側のトップページにも出るため、新歓期の告知に使えます。",
  },
  {
    Icon: Rss,
    name: "投稿",
    href: "/clubposts",
    body: "活動報告やお知らせを投稿します。団体ページに時系列で並ぶので、「活動していることが外から見える」状態を保てます。",
  },
  {
    Icon: MessageSquare,
    name: "メッセージ",
    href: "/clubmessages",
    body: "興味を持った学生や企業とのやり取りをここに集約します。個人のLINEを教えずに連絡を取れます。",
  },
  {
    Icon: Images,
    name: "写真",
    href: "/clubphotos",
    body: "活動写真をまとめて団体ページに載せます。文章より雰囲気が伝わるので、新歓前に数枚でも入れておくと効果があります。",
  },
];

export default function ManualPage() {
  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[900px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-14">
        {/* ── パンくず ── */}
        <nav aria-label="パンくず" className="flex items-center gap-1.5 text-xs text-graphite">
          <Link href="/" className="hover:underline">
            ホーム
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <Link href="/for-clubs" className="hover:underline">
            学生団体の方へ
          </Link>
          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-ink font-bold">運営マニュアル</span>
        </nav>

        {/* ── ヒーロー ── */}
        <section className="flex flex-col gap-6 max-w-2xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-ink" aria-hidden="true" />
            <span className="text-ink text-sm font-bold tracking-widest uppercase">Manual</span>
          </div>
          <h1 className="text-ink text-3xl md:text-5xl font-black leading-tight tracking-tight font-mincho">
            運営マニュアル
          </h1>
          <p className="text-graphite leading-relaxed">
            ProofLoopを学生団体で使うための手順書です。登録から新歓の応募管理までを、実際に触る順番で並べています。
            上から順にやれば設定は終わります。分からないところだけ読む使い方でも構いません。
          </p>
        </section>

        {/* ── 最初にやること ── */}
        <section className="flex flex-col gap-6">
          <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">
            まず、この3つを終わらせる
          </h2>
          <p className="text-graphite text-sm leading-relaxed">
            ここまで終われば団体ページが公開され、学生から見つけてもらえる状態になります。所要時間は15分ほどです。
          </p>
          <ol className="flex flex-col gap-4">
            {SETUP_STEPS.map((s) => (
              <li key={s.n} className="border border-rule bg-paper p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 bg-ink text-paper text-sm font-black shrink-0">
                    {s.n}
                  </span>
                  <h3 className="text-ink font-bold text-base">{s.title}</h3>
                </div>
                <p className="text-graphite text-sm leading-relaxed">{s.body}</p>
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:underline underline-offset-4 self-start"
                >
                  {s.linkLabel}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
          <div className="border border-rule bg-mist p-5">
            <p className="text-ink font-bold text-sm">承認されるまで団体ページは公開されません</p>
            <p className="text-graphite text-sm leading-relaxed mt-2">
              登録内容は運営が確認しています。掲載されている団体はすべて承認済みなので、
              学生から見たときの信頼性を保つための仕組みです。承認までに時間がかかる場合があります。
            </p>
          </div>
        </section>

        {/* ── 機能別 ── */}
        <section className="flex flex-col gap-6">
          <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">機能ごとの使い方</h2>
          <p className="text-graphite text-sm leading-relaxed">
            全部を使う必要はありません。新歓期はATSとイベント、通常期はタスクと投稿、というように必要なものだけ使ってください。
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.name} className="border border-rule bg-paper p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <f.Icon className="w-5 h-5 text-ink shrink-0" aria-hidden="true" />
                  <h3 className="text-ink font-bold text-base">{f.name}</h3>
                </div>
                <p className="text-graphite text-sm leading-relaxed flex-1">{f.body}</p>
                <Link
                  href={f.href}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:underline underline-offset-4 self-start"
                >
                  開く
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── 権限 ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">メンバーと権限</h2>
          <p className="text-graphite text-sm leading-relaxed">
            代表が全機能を扱えます。メンバーには必要な画面だけを渡せるので、新歓担当には応募管理、会計にはタスクだけ、といった分け方ができます。
            代替わりのときは、新しい代表を追加してから前の代表を外してください。先に外すと団体を編集できる人がいなくなります。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/clubsettings/members"
              className="inline-flex items-center gap-2 border border-rule px-4 py-2 text-sm font-bold text-ink hover:bg-mist transition-colors"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              メンバー・権限設定
            </Link>
            <Link
              href="/clubprofile"
              className="inline-flex items-center gap-2 border border-rule px-4 py-2 text-sm font-bold text-ink hover:bg-mist transition-colors"
            >
              <IdCard className="w-4 h-4" aria-hidden="true" />
              団体プロフィール
            </Link>
          </div>
        </section>

        {/* ── 導線 ── */}
        <section className="border border-rule p-6 flex flex-col gap-4">
          <h2 className="text-ink font-black text-base">まだ登録していない方へ</h2>
          <p className="text-graphite text-sm leading-relaxed">
            ProofLoopは学生団体は無料で使えます。何ができるかを先に知りたい場合は、学生団体向けのご案内をご覧ください。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/for-clubs"
              className="inline-flex items-center gap-2 border border-rule px-4 py-2 text-sm font-bold text-ink hover:bg-mist transition-colors"
            >
              学生団体の方へ
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 text-sm font-bold hover:bg-ink/90 transition-colors"
            >
              無料で登録する
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

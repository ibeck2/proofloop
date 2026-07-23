import type { Metadata } from "next";
import Link from "next/link";
import {
  Dumbbell,
  Palette,
  FlaskConical,
  Briefcase,
  Globe,
  HeartHandshake,
  Search,
  PartyPopper,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  PiggyBank,
  Scale,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "サークルどうする？新入生のためのサークル選び完全ガイド | ProofLoop",
  description:
    "大学のサークルはいつ入る？新歓の仕組み・複数掛け持ちの注意点・途中でやめる方法・サークルの選び方まで。ProofLoopが新入生向けにサークル選びを徹底解説。",
  keywords: ["大学 サークル 入り方", "新歓 いつ", "サークル 選び方", "サークル 掛け持ち", "サークル やめ方"],
  openGraph: {
    title: "サークルどうする？新入生のためのサークル選び完全ガイド | ProofLoop",
    description: "新歓の仕組みからサークルの選び方・やめ方まで。ProofLoopが新入生向けにまとめました。",
    url: `${SITE_URL}/guide/circle`,
  },
  alternates: { canonical: `${SITE_URL}/guide/circle` },
};

// ─────────────────────────────────────────────
// データ定数
// ─────────────────────────────────────────────
const CIRCLE_TYPES = [
  {
    category: "運動系（スポーツ・アウトドア）",
    Icon: Dumbbell,
    merit: "体力づくり・友人の輪が広がりやすい",
    demerit: "練習が週複数回ある場合はバイトと両立が難しいことも",
    suit: "体を動かすのが好き・同じ競技仲間を作りたい人",
    searchQuery: "運動系（スポーツ・アウトドア）",
  },
  {
    category: "文化系（音楽・演劇・アート）",
    Icon: Palette,
    merit: "発表会・公演など目標があり達成感が大きい",
    demerit: "本番前は練習が集中するため時間管理が必要",
    suit: "趣味を深めたい・表現活動が好きな人",
    searchQuery: "文化系（音楽・演劇・アート）",
  },
  {
    category: "学術・研究（ゼミ・研究会）",
    Icon: FlaskConical,
    merit: "専門知識が深まり就活・大学院でアピールしやすい",
    demerit: "活動が地味に見えることもあり、仲間づくりに時間がかかる",
    suit: "学問が好き・大学院・研究職を視野に入れている人",
    searchQuery: "学術・研究（ゼミ・研究会・勉強会）",
  },
  {
    category: "ビジネス・キャリア（起業・就活）",
    Icon: Briefcase,
    merit: "インターンや就活との親和性が高く実践的なスキルが身につく",
    demerit: "意識高い系のプレッシャーを感じる場合も",
    suit: "将来起業したい・ビジネススキルを早めに身につけたい人",
    searchQuery: "ビジネス・キャリア（起業・就活）",
  },
  {
    category: "国際交流・語学",
    Icon: Globe,
    merit: "英語力向上・留学生との交流・異文化理解が深まる",
    demerit: "英語力がないと最初は入りにくい雰囲気のところも",
    suit: "留学を検討している・語学力を伸ばしたい人",
    searchQuery: "国際交流・語学",
  },
  {
    category: "ボランティア・NPO",
    Icon: HeartHandshake,
    merit: "社会課題への理解が深まり就活のガクチカになりやすい",
    demerit: "やりがい重視なため収入を伴わない活動が多い",
    suit: "社会貢献に興味がある・ESで差をつけたい人",
    searchQuery: "ボランティア・NPO",
  },
] as const;

const TIMELINE = [
  { month: "3月", event: "新歓情報のリサーチ開始", detail: "SNSやProofLoopでサークルの雰囲気を調べ始める。気になるサークルはフォローorお気に入り登録しておこう。", Icon: Search },
  { month: "4月上旬", event: "新歓イベントに参加", detail: "新歓コンパ・体験入部が集中する時期。無料で参加できることが多いので気軽に複数参加してOK。断るのも自由。", Icon: PartyPopper },
  { month: "4月中旬", event: "仮入部・お試し期間", detail: "気になるサークルを2〜3個に絞って仮入部。雰囲気・先輩・活動頻度を実際に体感して判断する。", Icon: Compass },
  { month: "4月下旬〜5月", event: "正式入部を決定", detail: "入部届や会費の支払いが発生する。複数入る場合はスケジュールと費用の両面で無理がないか確認する。", Icon: CheckCircle2 },
] as const;

const FAQ_ITEMS = [
  {
    q: "サークルはいくつ入っていいですか？",
    a: "上限はありません。ただし現実的には2〜3つが限界です。それぞれの活動頻度・費用・必須参加の行事を把握した上で、授業・バイトと合わせてスケジュールが成り立つかを確認しましょう。体育会と文化系の掛け持ちは時間的に厳しいことが多いです。",
  },
  {
    q: "新歓に参加したら必ず入らないといけませんか？",
    a: "全く問題ありません。新歓は「お互いを知るための場」です。ご飯をごちそうになっても断ることができます。「他も見てみたい」「もう少し考えたい」と伝えれば問題なく、それを理由に強引に勧誘するサークルは逆に要注意です。",
  },
  {
    q: "途中でサークルをやめることはできますか？",
    a: "できます。退部の手続きはサークルによって異なりますが、多くの場合は幹部に伝えるだけです。年会費を払った後でも返金されないケースがほとんどなので、正式入部前によく見極めることが大切です。",
  },
  {
    q: "インカレサークルと学内サークルの違いは？",
    a: "インカレ（インターカレッジ）は複数の大学の学生が合同で活動するサークルです。他大学の友人ができる・出会いの幅が広がるメリットがある一方、交通費がかかる・スケジュール調整が複雑になるデメリットもあります。",
  },
  {
    q: "サークルに入らないのはアリですか？",
    a: "もちろんアリです。アルバイトや自己学習・インターンに時間を使いたい人はサークルに入らない選択も十分合理的です。ただし「友人を作る機会」という観点では、特に1年生のうちはサークルが最も友人ができやすい場の一つです。",
  },
  {
    q: "サークルの雰囲気はどうやって事前に調べられますか？",
    a: "SNS（Instagram・X）でサークル名を検索するのが手軽です。また、ProofLoopのサークル検索では活動頻度・メンバー数・選考の有無など詳細情報が確認できます。先輩に直接話を聞く新歓イベントへの参加も有効です。",
  },
] as const;

// ─────────────────────────────────────────────
// FAQアコーディオン（クライアントコンポーネントを避けてシンプルに）
// ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="border-b border-rule last:border-0 group">
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none">
        <span className="font-bold text-ink text-sm leading-snug">{q}</span>
        <ChevronDown
          className="w-4 h-4 text-graphite shrink-0 group-open:rotate-180 transition-transform duration-200"
          aria-hidden="true"
        />
      </summary>
      <p className="text-graphite text-sm leading-relaxed pb-5">{a}</p>
    </details>
  );
}

// ─────────────────────────────────────────────
// メインページ（Server Component）
// ─────────────────────────────────────────────
export default function CircleGuidePage() {
  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">
        {/* パンくず */}
        <nav className="flex items-center gap-2 text-xs text-graphite -mb-10">
          <Link href="/" className="hover:text-ink transition-colors">
            ホーム
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <Link href="/guide" className="hover:text-ink transition-colors">
            新入生ガイド
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-ink font-bold">サークルどうする？</span>
        </nav>

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-ink" aria-hidden="true" />
            <span className="text-ink text-sm font-bold tracking-widest uppercase">Circle Guide</span>
          </div>
          <h1 className="text-ink text-3xl md:text-5xl font-black leading-tight tracking-tight font-mincho">
            サークル、どうする？
          </h1>
          <p className="text-graphite text-base md:text-lg leading-relaxed">
            新歓の仕組み・サークルの選び方・掛け持ちの注意点・やめ方まで。大学入学後に誰もがぶつかる「サークルどうする問題」をまとめて解決します。
          </p>
          {/* クイックナビ */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: "新歓スケジュール", href: "#timeline" },
              { label: "サークルの種類", href: "#types" },
              { label: "選び方のポイント", href: "#howto" },
              { label: "よくある質問", href: "#faq" },
              { label: "サークルを探す", href: "#search" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs px-3 py-1.5 border border-ink/20 text-ink hover:bg-ink hover:text-paper transition-colors font-bold"
              >
                {item.label}
              </a>
            ))}
          </div>
        </section>

        {/* 新歓タイムライン */}
        <section id="timeline" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">新歓スケジュール：いつ何をするべきか</h2>
            <p className="text-graphite text-sm">4月は怒涛の新歓シーズン。流れを把握して乗り遅れないようにしましょう。</p>
          </div>
          <div className="flex flex-col gap-0">
            {TIMELINE.map((item, i) => (
              <div key={i} className="flex gap-4">
                {/* 左：タイムライン線 */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 bg-ink flex items-center justify-center shrink-0">
                    <item.Icon className="w-4 h-4 text-paper" aria-hidden="true" />
                  </div>
                  {i < TIMELINE.length - 1 && <div className="w-0.5 bg-rule flex-1 my-1" />}
                </div>
                {/* 右：内容 */}
                <div className="flex flex-col gap-1 pb-8 pt-2">
                  <span className="text-xs font-bold text-ink font-numeric">{item.month}</span>
                  <h3 className="font-black text-ink text-base">{item.event}</h3>
                  <p className="text-graphite text-sm leading-relaxed">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 注意ボックス（警告） */}
          <div className="border border-rule border-l-4 border-l-seal bg-mist p-5 flex gap-3">
            <AlertTriangle className="w-[18px] h-[18px] text-seal shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-ink font-bold text-sm">新歓の勧誘トラブルに注意</p>
              <p className="text-graphite text-xs leading-relaxed mt-1">
                「今日決めないと入れない」「SNSをフォローしないと新歓に来られない」など強引な勧誘をするサークルは要注意です。
                宗教・投資・マルチ商法への勧誘を目的とした団体が新入生をターゲットにするケースもあります。少しでも違和感を感じたら、すぐに距離を置きましょう。
              </p>
            </div>
          </div>
        </section>

        {/* サークルの種類 */}
        <section id="types" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">サークルの種類と特徴</h2>
            <p className="text-graphite text-sm">大学のサークルは大きく6種類に分かれます。自分の目的に合ったカテゴリを確認しましょう。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CIRCLE_TYPES.map((type, i) => (
              <div key={i} className="border border-rule p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                    <type.Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                  </div>
                  <h3 className="font-black text-ink text-base">{type.category}</h3>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex gap-2">
                    <span className="text-ink font-bold shrink-0">◎ メリット</span>
                    <span className="text-graphite leading-relaxed">{type.merit}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-ink font-bold shrink-0">△ 注意点</span>
                    <span className="text-graphite leading-relaxed">{type.demerit}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-ink font-bold shrink-0">→ 向いている人</span>
                    <span className="text-graphite leading-relaxed">{type.suit}</span>
                  </div>
                </div>
                <Link
                  href={`/search?category=${encodeURIComponent(type.searchQuery)}`}
                  className="text-ink text-xs font-bold flex items-center gap-1 hover:underline"
                >
                  {type.category}のサークルを探す
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 選び方のポイント */}
        <section id="howto" className="flex flex-col gap-6 scroll-mt-20">
          <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">失敗しないサークルの選び方</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                Icon: Clock,
                title: "活動頻度を先に確認する",
                body: "週1回と週5回では大学生活への影響が全く違います。入部前に「週何回・何時間の活動か」「合宿・遠征はあるか」を必ず確認しましょう。",
              },
              {
                Icon: Users,
                title: "先輩の雰囲気を見る",
                body: "どんなに活動内容が好きでも、一緒にいる先輩との相性が合わないと続きません。新歓イベントで先輩の振る舞い・言葉遣い・後輩への接し方を観察しましょう。",
              },
              {
                Icon: PiggyBank,
                title: "年会費・遠征費を計算する",
                body: "サークルには入会費・年会費・合宿費などがかかります。複数のサークルに入る場合は合計で月いくらになるかを計算し、バイト代と合わせて無理のない範囲か確認を。",
              },
              {
                Icon: Scale,
                title: "バイト・授業との両立を考える",
                body: "特に体育会系や劇団など活動頻度の高いサークルは、バイトとの両立が難しいことがあります。ProofLoopのシミュレーターで時間の内訳を計算してみましょう。",
              },
            ].map((item, i) => (
              <div key={i} className="border border-rule p-6 flex gap-4">
                <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                  <item.Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-ink text-sm font-bold">{item.title}</h3>
                  <p className="text-graphite text-sm leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* シミュレーター導線（主要CTA） */}
          <div className="bg-ink p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
            <div>
              <p className="font-black text-base text-paper">
                サークル×バイト×授業、全部両立できる？
              </p>
              <p className="text-sm mt-1 text-paper/70">
                3問答えるだけで可処分時間・月収を自動計算します。
              </p>
            </div>
            <Link
              href="/baito/simulator"
              className="shrink-0 inline-flex items-center gap-2 bg-seal text-paper hover:bg-seal/90 transition-colors px-6 py-3 font-bold text-sm whitespace-nowrap"
            >
              シミュレートしてみる
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-ink" aria-hidden="true" />
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">よくある質問</h2>
          </div>
          <div className="border border-rule px-6">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* サークル検索への導線 */}
        <section id="search" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-2">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">実際にサークルを探してみよう</h2>
            <p className="text-graphite text-sm leading-relaxed">
              ProofLoopでは全国の学生団体の情報を掲載しています。活動頻度・メンバー数・選考の有無・SNSリンクまで、入部前に必要な情報をまとめて確認できます。
            </p>
          </div>
          {/* カテゴリ別ショートカット */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CIRCLE_TYPES.map((type) => (
              <Link
                key={type.category}
                href={`/search?category=${encodeURIComponent(type.searchQuery)}`}
                className="group border border-rule hover:border-ink/40 hover:shadow-sm transition-all p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-mist flex items-center justify-center shrink-0">
                  <type.Icon className="w-[18px] h-[18px] text-ink" aria-hidden="true" />
                </div>
                <span className="text-ink text-xs font-bold leading-tight">
                  {type.category.split("（")[0]}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/search"
            className="w-full md:w-auto self-start inline-flex items-center justify-center gap-2 bg-ink text-paper hover:bg-ink/90 transition-colors px-8 py-4 font-black text-base"
          >
            すべてのサークルを検索する
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </section>

        {/* 他のガイドへ */}
        <section className="border border-rule p-6 flex flex-col gap-4">
          <h3 className="text-ink font-black text-base">他のガイドも読む</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/baito"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <Briefcase className="w-4 h-4" aria-hidden="true" />
              バイト・インターンどうする？
            </Link>
            <Link
              href="/guide"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              新入生ガイド一覧へ
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

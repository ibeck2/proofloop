import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import {
  BookOpen,
  SquarePen,
  Pencil,
  RefreshCw,
  ChevronRight,
  GraduationCap,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Briefcase,
  Users,
  Plane,
  Home,
  Asterisk,
  ListChecks,
  SlidersHorizontal,
  PiggyBank,
  PlaneTakeoff,
  RotateCcw,
  ClipboardCheck,
  ArrowLeftRight,
  TrendingDown,
  Clock,
  LayoutGrid,
  FileCheck2,
  MessageCircle,
} from "lucide-react";

export const metadata: Metadata = {
  title: "単位どうする？履修・GPA・卒業要件で失敗しないための完全ガイド | ProofLoop",
  description:
    "大学の履修登録の手順・必修と選択の違い・GPAの仕組みと使い場・単位を落としたときの対処まで。ProofLoopが新入生向けに大学の単位制度を徹底解説。",
  keywords: [
    "大学 履修登録",
    "大学 GPA 計算",
    "大学 単位 落とした",
    "必修 選択",
    "卒業要件",
    "大学 留年",
    "大学 単位 取り方",
  ],
  openGraph: {
    title: "単位どうする？履修・GPA・卒業要件で失敗しないための完全ガイド | ProofLoop",
    description: "履修登録・必修と選択・GPA・単位を落としたとき。大学の単位制度を新入生向けにまとめました。",
    url: `${SITE_URL}/guide/credits`,
  },
  alternates: { canonical: `${SITE_URL}/guide/credits` },
};

// ─────────────────────────────────────────────
// データ定数
// ─────────────────────────────────────────────
const REGISTRATION_TIMELINE = [
  {
    month: "3月下旬〜4月上旬",
    event: "シラバス公開・履修ガイダンス",
    detail:
      "大学から履修ガイダンス（学部・学科ごと）の日程が告知される。シラバスが公開されるので、必修科目と興味のある科目を一通り確認しておく。",
    Icon: BookOpen,
  },
  {
    month: "4月上旬〜中旬",
    event: "前期（春学期）履修登録",
    detail:
      "履修登録システム（Web）で時間割を確定。多くの大学で1〜2週間しか期間がない。期間内に登録しないとその学期は単位を取れない学部もあるので最優先で対応。",
    Icon: SquarePen,
  },
  {
    month: "4月中旬〜下旬",
    event: "履修修正・追加期間",
    detail:
      "授業を実際に受けてみて「自分に合わない」「想定より重い」と感じたら、修正期間内に履修を変更できる。期間を過ぎると取消も追加も基本不可。",
    Icon: Pencil,
  },
  {
    month: "9月（後期）",
    event: "後期（秋学期）履修登録",
    detail:
      "前期と同じ流れを後期にも繰り返す。前期の成績を見てから後期の負荷を調整できるので、前期はあえて余裕を持たせるのも戦略の一つ。",
    Icon: RefreshCw,
  },
] as const;

const UNIT_TYPES = [
  {
    name: "必修科目",
    Icon: Asterisk,
    description:
      "卒業のために必ず取らないといけない科目。落とすと翌年再履修になり、最悪の場合留年に直結する。",
    note: "落単リスクが最も高い。最優先で出席・課題提出を死守。",
  },
  {
    name: "選択必修",
    Icon: ListChecks,
    description:
      "指定されたグループの中から「N単位以上」取るタイプ。例：第二外国語の中からどれか1つ、専門基礎科目から4単位以上 等。",
    note: "選び方の自由度はあるが「合計N単位」の制約は厳守。",
  },
  {
    name: "選択科目",
    Icon: SlidersHorizontal,
    description:
      "卒業要件の総単位数の範囲で自由に選べる科目。興味分野を深掘りしたり、GPA稼ぎ・他学部聴講に活用できる。",
    note: "履修の自由度が高い反面、計画を立てないと卒業要件未達になりやすい。",
  },
  {
    name: "教養（一般教育）",
    Icon: Users,
    description:
      "専門分野以外の幅広い教養を学ぶ科目。多くの大学で卒業までに一定単位の取得が必須。",
    note: "1〜2年次に集中して取る大学が多い。3年以降に残すと取りにくい。",
  },
] as const;

const GPA_USE_CASES = [
  {
    Icon: PiggyBank,
    title: "奨学金の選考",
    body: "日本学生支援機構（JASSO）の給付・貸与型ともに、継続採用にはGPAや成績順位が条件。民間奨学金はさらにGPA重視のものが多い。",
  },
  {
    Icon: PlaneTakeoff,
    title: "交換留学・認定留学",
    body: "ほぼ全ての交換留学プログラムにGPA下限がある（例：GPA 2.7以上、3.0以上）。1年次の成績で出願資格が決まるため早期から重要。",
  },
  {
    Icon: GraduationCap,
    title: "推薦入試・大学院進学",
    body: "学部内推薦で大学院に進む場合、GPAが評価軸になる。研究室配属の希望順もGPAで決まる学部が多い。",
  },
  {
    Icon: Briefcase,
    title: "就活（一部企業）",
    body: "外資系・コンサル・総合商社など一部企業はESや面接でGPAを聞く。一般の日系大企業ではあまり重視されないが、ESに記入欄がある企業は対策しておくと安心。",
  },
] as const;

const FAIL_RECOVERY = [
  {
    title: "再履修（次年度に取り直す）",
    Icon: RotateCcw,
    body: "最も一般的な対応。同じ科目を翌年度（または翌学期）にもう一度受講する。時間割が他の科目とかぶると詰むので、必修を落とした場合は即時のリカバリ計画が必要。",
  },
  {
    title: "追試・再試験",
    Icon: ClipboardCheck,
    body: "大学・科目によっては落単者向けの再試験を実施。ただし対象は「出席要件は満たしたが点数が足りない」ケース限定が多い。出席不足は再試験対象外になることが多いので注意。",
  },
  {
    title: "代替科目で要件を埋める",
    Icon: ArrowLeftRight,
    body: "選択科目を落とした場合は、別の選択科目で卒業要件を埋めることも可能。必修・選択必修は代替不可なので再履修一択。",
  },
  {
    title: "進級・留年の判定",
    Icon: TrendingDown,
    body: "学部によっては「進級要件」が別途設定され、必修を落とすと2年に上がれない（医・歯・薬・理工系で多い）。学部の便覧で進級要件を必ず確認しておく。",
  },
] as const;

const HOWTO_ITEMS = [
  {
    Icon: Clock,
    title: "1限・5限を入れすぎない",
    body: "1限は朝の遅刻で出席率が落ちやすく、5限以降はバイト・サークルとの両立が難しい。やむを得ず入れる場合は週1〜2コマに留めるのが無難。",
  },
  {
    Icon: LayoutGrid,
    title: "空きコマを2コマ以上連続で作らない",
    body: "空きコマが3〜4コマ連続すると拘束時間ばかり伸びて消耗する。可能なら連続させる、または午前/午後で固める時間割を意識する。",
  },
  {
    Icon: FileCheck2,
    title: "シラバスは「評価方法」と「出席要件」を必ず見る",
    body: "シラバスには「期末試験50%、レポート30%、出席20%」等の評価配分が書かれている。出席要件（2/3以上等）も明記されているので、サボれる科目かを事前に判断できる。",
  },
  {
    Icon: MessageCircle,
    title: "先輩・同期に評判を聞く",
    body: "「単位が取りやすい」「課題が多い」「テストが厳しい」などの実情はシラバスに書かれない。先輩のリアルな評判が最も信頼できる情報源。ProofLoopの授業情報機能（準備中）で今後一覧化予定。",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "卒業には何単位必要ですか？",
    a: "学部・大学によりますが、4年制大学の学士課程は概ね124単位前後が標準です（大学設置基準）。学部によっては140単位以上必要な場合や、必修科目の比率が高い場合があります。正確な数字は所属学部の「履修要項」「学生便覧」を必ず確認してください。",
  },
  {
    q: "GPAは本当に就活で見られますか？",
    a: "業界によります。日系大手の総合職ではあまり見られないことが多い一方、外資系・コンサル・総合商社・金融の一部・研究職などはES記入や面接で聞かれることがあります。「業界によっては評価対象になる」と認識して、極端に下げない（2.5未満を避ける）程度を意識すれば十分です。",
  },
  {
    q: "必修を落としたらどうなりますか？",
    a: "翌年度に同じ授業を再履修するのが基本です。問題は「必修同士の時間割がかぶる」ケース。例えば1年必修と2年必修が同じ曜日・時限だと片方しか取れず、留年や卒業延期に直結します。落とした瞬間にリカバリの時間割を確認しましょう。",
  },
  {
    q: "履修登録の修正期間を過ぎてしまいました。どうすれば？",
    a: "原則として追加・取消はできません。ただし大学事務局に相談すると、システム障害や手続き不備など特殊事情で個別対応してくれることもあります。早めに教務課に相談を。「とりあえず取った科目」を放置すると不可（落単）になり、GPAが下がるので、出席して単位を取りに行くのが現実的です。",
  },
  {
    q: "単位互換とは何ですか？留学に使えますか？",
    a: "単位互換は「他大学（海外含む）で取った単位を、所属大学の卒業単位として認定する制度」です。交換留学・認定留学・国内単位互換協定校への聴講などで使えます。ただし認定される科目数や種類に上限があるので、留学前に教務課で必ず確認してください。",
  },
  {
    q: "W（履修取消）と F（不可・落単）の違いは？",
    a: "W（withdrawal、履修取消）は履修自体をキャンセルする扱いで、成績証明書に「W」と記載されGPA計算には含まれません。F（不可）は履修したけど合格点に達しなかった成績で、GPAに0点として算入されます。途中で「単位取れなさそう」と判断したら、修正期間内にWで取り消した方がGPAは守れます（取消期限は大学による）。",
  },
] as const;

// ─────────────────────────────────────────────
// FAQアコーディオン
// ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="border-b border-rule last:border-0 group">
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none">
        <span className="font-bold text-ink text-sm leading-snug">{q}</span>
        <ChevronDown className="w-4 h-4 text-graphite shrink-0 group-open:rotate-180 transition-transform duration-200" aria-hidden="true" />
      </summary>
      <p className="text-graphite text-sm leading-relaxed pb-5">{a}</p>
    </details>
  );
}

// ─────────────────────────────────────────────
// メインページ（Server Component）
// ─────────────────────────────────────────────
export default function CreditsGuidePage() {
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
          <span className="text-ink font-bold">単位・授業どうする？</span>
        </nav>

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-ink" aria-hidden="true" />
            <span className="text-ink text-sm font-bold tracking-widest uppercase">Credits Guide</span>
          </div>
          <h1 className="text-ink text-3xl md:text-5xl font-black leading-tight tracking-tight font-mincho">
            単位・授業、どうする？
          </h1>
          <p className="text-graphite text-base md:text-lg leading-relaxed">
            履修登録のスケジュール・必修と選択の違い・GPAの仕組みと使い場・単位を落としたときの対処まで。大学の単位制度でつまずかないために、新入生が押さえておくべき基礎を一気にまとめました。
          </p>
          {/* クイックナビ */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: "履修登録", href: "#registration" },
              { label: "単位の仕組み", href: "#units" },
              { label: "GPA", href: "#gpa" },
              { label: "落としたら", href: "#fail" },
              { label: "コツ", href: "#howto" },
              { label: "よくある質問", href: "#faq" },
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

        {/* §1 履修登録スケジュール */}
        <section id="registration" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">履修登録：いつ・何をするか</h2>
            <p className="text-graphite text-sm">
              履修登録の期間は短く、ミスると1学期分の単位が丸ごと取れません。スケジュールを先に押さえましょう。
            </p>
          </div>
          <div className="flex flex-col gap-0">
            {REGISTRATION_TIMELINE.map((item, i) => {
              const Icon = item.Icon;
              return (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 bg-ink flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-paper" aria-hidden="true" />
                    </div>
                    {i < REGISTRATION_TIMELINE.length - 1 && (
                      <div className="w-0.5 bg-rule flex-1 my-1" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 pb-8 pt-2">
                    <span className="text-xs font-bold text-ink">{item.month}</span>
                    <h3 className="font-black text-ink text-base">{item.event}</h3>
                    <p className="text-graphite text-sm leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 注意ボックス */}
          <div className="border border-rule border-l-4 border-l-seal bg-mist p-5 flex gap-3">
            <AlertCircle className="w-[18px] h-[18px] text-seal shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-ink font-bold text-sm">履修登録忘れは即・単位ゼロ</p>
              <p className="text-graphite text-xs leading-relaxed mt-1">
                履修登録をしないまま授業に出ても、その科目の単位は一切取れません。登録期間は1〜2週間しかなく、入学直後で忙しい時期と重なります。ガイダンスの日程と登録締切は必ずカレンダーに入れて、初日にシラバスを開く習慣をつけましょう。
              </p>
            </div>
          </div>
        </section>

        {/* §2 単位の仕組み */}
        <section id="units" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">単位の仕組み（必修・選択・卒業要件）</h2>
            <p className="text-graphite text-sm">
              卒業に必要な単位は4年制大学で概ね124単位前後。その中身は「必修 / 選択必修 / 選択 / 教養」の4区分が一般的です。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {UNIT_TYPES.map((type, i) => {
              const Icon = type.Icon;
              return (
                <div key={i} className="border border-rule p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                    </div>
                    <h3 className="font-black text-ink text-base">{type.name}</h3>
                  </div>
                  <p className="text-graphite text-sm leading-relaxed">{type.description}</p>
                  <div className="flex gap-2 text-xs pt-1 border-t border-rule">
                    <span className="text-ink font-bold shrink-0">→ ポイント</span>
                    <span className="text-graphite leading-relaxed">{type.note}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 学年別ペース */}
          <div className="border border-rule p-6 flex flex-col gap-4">
            <h3 className="text-ink font-black text-base">学年別の単位取得ペース（目安）</h3>
            <p className="text-graphite text-sm leading-relaxed">
              卒業要件124単位を4年で均等に割ると31単位/年ですが、現実には<strong className="text-ink">1〜2年で前倒し</strong>して取るのが定石です。3〜4年はゼミ・卒論・就活で授業を入れにくくなるためです。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { year: "1年", target: "40〜44", note: "必修と教養を一気に消化" },
                { year: "2年", target: "40〜44", note: "選択必修・専門基礎中心" },
                { year: "3年", target: "30〜36", note: "ゼミ・専門科目・就活と両立" },
                { year: "4年", target: "8〜16", note: "卒論・残り単位・就活" },
              ].map((row) => (
                <div key={row.year} className="bg-mist p-3 flex flex-col gap-1">
                  <span className="font-black text-ink">{row.year}</span>
                  <span className="text-ink font-bold text-base font-numeric tabular-nums">{row.target}単位</span>
                  <span className="text-graphite leading-snug">{row.note}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-graphite">
              ※ 学部・大学により変動。正確な数字は所属学部の「履修要項」「学生便覧」を確認してください。
            </p>
          </div>
        </section>

        {/* §3 GPA */}
        <section id="gpa" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">GPAの仕組みと効く場面</h2>
            <p className="text-graphite text-sm">
              GPA（Grade Point Average）は成績の平均点。奨学金・留学・進学・就活と、思った以上に多くの場面で見られます。
            </p>
          </div>

          {/* GPA計算表 */}
          <div className="border border-rule p-6 flex flex-col gap-4">
            <h3 className="text-ink font-black text-base">GPAの計算方法（4.0スケール）</h3>
            <p className="text-graphite text-sm leading-relaxed">
              一般的な4.0スケールでは、各科目の成績にポイントを割り当て、単位数で重みを付けて平均します。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-rule">
                <thead className="bg-mist">
                  <tr>
                    <th className="px-4 py-2 text-left font-bold text-ink">成績評価</th>
                    <th className="px-4 py-2 text-left font-bold text-ink">点数の目安</th>
                    <th className="px-4 py-2 text-left font-bold text-ink">グレードポイント</th>
                  </tr>
                </thead>
                <tbody className="text-graphite">
                  {[
                    { grade: "秀（S / A+）", score: "90〜100点", gp: "4.0" },
                    { grade: "優（A）", score: "80〜89点", gp: "3.0" },
                    { grade: "良（B）", score: "70〜79点", gp: "2.0" },
                    { grade: "可（C）", score: "60〜69点", gp: "1.0" },
                    { grade: "不可（D / F）", score: "59点以下", gp: "0.0" },
                  ].map((row) => (
                    <tr key={row.grade} className="border-t border-rule">
                      <td className="px-4 py-2">{row.grade}</td>
                      <td className="px-4 py-2 font-numeric tabular-nums">{row.score}</td>
                      <td className="px-4 py-2 font-bold text-ink font-numeric tabular-nums">{row.gp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-graphite">
              ※ 大学によっては5段階（5.0スケール）や独自の換算式を使う場合があります。所属大学の規定を確認してください。
            </p>
          </div>

          {/* GPAが効く場面 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GPA_USE_CASES.map((item, i) => {
              const Icon = item.Icon;
              return (
                <div key={i} className="border border-rule p-5 flex gap-4">
                  <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-ink text-sm font-bold">{item.title}</h3>
                    <p className="text-graphite text-sm leading-relaxed">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* GPAを下げないコツ */}
          <div className="border border-rule border-l-4 border-l-ink bg-mist p-5 flex gap-3">
            <Lightbulb className="w-[18px] h-[18px] text-ink shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-ink font-bold text-sm">GPAを下げないための3原則</p>
              <ul className="text-graphite text-xs leading-relaxed mt-1 flex flex-col gap-1 list-disc pl-4">
                <li>「捨て科目」を作らない。0点を1つ含むだけで平均が大きく下がる</li>
                <li>「合わない」と感じたら修正期間内にW（履修取消）で逃げる</li>
                <li>難易度が読めない科目は1年次にまとめて挑戦し、データを集める</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 border border-rule border-l-4 border-l-ink bg-mist p-4">
            <p className="font-body text-base font-bold text-ink">
              自分のGPAを計算してみる
            </p>
            <p className="mt-2 text-sm text-graphite">
              大学ごとに異なる換算方式に対応したGPA計算機を用意しています。出典つきで正確に計算できます。
            </p>
            <Link href="/gpa" className="mt-3 inline-block text-sm font-bold text-ink underline">
              GPA計算機を使う
            </Link>
          </div>
        </section>

        {/* §4 落としたら */}
        <section id="fail" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">単位を落としたら：再履修・再試験・留年</h2>
            <p className="text-graphite text-sm">
              単位を落とすこと自体は珍しくありません。問題は「落としたあとの動き」。早く動けば留年は十分回避できます。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAIL_RECOVERY.map((item, i) => {
              const Icon = item.Icon;
              return (
                <div key={i} className="border border-rule p-5 flex gap-4">
                  <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-ink text-sm font-bold">{item.title}</h3>
                    <p className="text-graphite text-sm leading-relaxed">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 進級要件の注意 */}
          <div className="border border-rule border-l-4 border-l-seal bg-mist p-5 flex gap-3">
            <AlertTriangle className="w-[18px] h-[18px] text-seal shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-ink font-bold text-sm">「進級要件」がある学部は要注意</p>
              <p className="text-graphite text-xs leading-relaxed mt-1">
                医・歯・薬・理工系などの一部学部では、卒業要件とは別に「進級要件」が課されています。例えば「2年次に進級するには1年次の必修を全て取得していること」など。1単位足りないだけで丸1年留年するケースもあるため、入学直後に学生便覧で進級要件を必ず確認しておきましょう。
              </p>
            </div>
          </div>
        </section>

        {/* §5 コツ */}
        <section id="howto" className="flex flex-col gap-6 scroll-mt-20">
          <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">失敗しない履修のコツ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {HOWTO_ITEMS.map((item, i) => {
              const Icon = item.Icon;
              return (
                <div key={i} className="border border-rule p-6 flex gap-4">
                  <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-ink text-sm font-bold">{item.title}</h3>
                    <p className="text-graphite text-sm leading-relaxed">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* §6 FAQ */}
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

        {/* §7 classinfo 送客 */}
        <section className="bg-ink p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-black text-xl md:text-2xl text-paper font-mincho">
              授業の評判は ProofLoop で
            </h2>
            <p className="text-sm leading-relaxed text-paper/70">
              シラバスに書かれない「単位の取りやすさ」「課題の重さ」「テストの傾向」を、先輩の口コミと過去の履修者データで可視化する授業情報機能を準備中。リリース時にお知らせします。
            </p>
          </div>
          <Link
            href="/classinfo"
            className="shrink-0 inline-flex items-center gap-2 bg-seal text-paper hover:bg-seal/90 transition-colors px-8 py-4 font-black text-base whitespace-nowrap"
          >
            授業情報を見る
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </section>

        {/* 他のガイド */}
        <section className="border border-rule p-6 flex flex-col gap-4">
          <h3 className="text-ink font-black text-base">他のガイドも読む</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/baito"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink hover:text-ink/70 transition-colors"
            >
              <Briefcase className="w-4 h-4" aria-hidden="true" />
              バイト・インターンどうする？
            </Link>
            <Link
              href="/guide/circle"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink hover:text-ink/70 transition-colors"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              サークルどうする？
            </Link>
            <Link
              href="/guide/study-abroad"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink hover:text-ink/70 transition-colors"
            >
              <Plane className="w-4 h-4" aria-hidden="true" />
              留学どうする？
            </Link>
            <Link
              href="/guide/living-alone"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink hover:text-ink/70 transition-colors"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              一人暮らしどうする？
            </Link>
            <Link
              href="/guide"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink hover:text-ink/70 transition-colors"
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

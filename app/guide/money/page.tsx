import type { Metadata } from "next";
import Link from "next/link";
import {
  PiggyBank,
  House,
  UtensilsCrossed,
  Zap,
  BookOpen,
  TrainFront,
  PartyPopper,
  Landmark,
  Users,
  GraduationCap,
  Globe,
  Gift,
  TrendingUp,
  Tag,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  Search,
  Building2,
  BadgeCheck,
  LifeBuoy,
  HelpCircle,
  ArrowRight,
  Briefcase,
  Plane,
} from "lucide-react";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "お金・奨学金どうする？大学生の生活費・JASSO・民間奨学金まとめ | ProofLoop",
  description:
    "大学生の生活費の目安、奨学金の種類（JASSO給付・第一種・第二種・民間・自治体・大学独自）、申請時期、返済の基本まで。お金の不安を解消する基礎知識をProofLoopが新入生向けにまとめました。",
  keywords: [
    "大学生 生活費",
    "大学生 奨学金 種類",
    "JASSO 第一種 第二種",
    "給付型奨学金",
    "民間奨学金 大学生",
    "学費 払えない",
    "大学生 一人暮らし 費用",
  ],
  openGraph: {
    title: "お金・奨学金どうする？大学生の生活費・奨学金まとめ | ProofLoop",
    description: "生活費の目安・奨学金の種類・JASSO・民間・自治体・返済の基本まで、お金の不安を解消する基礎知識。",
    url: `${SITE_URL}/guide/money`,
  },
  alternates: { canonical: `${SITE_URL}/guide/money` },
};

// ─────────────────────────────────────────────
// データ定数
// ─────────────────────────────────────────────
const LIVING_COST_BREAKDOWN = [
  {
    label: "家賃",
    home: "0円（家庭負担）",
    alone: "5〜7万円",
    Icon: House,
    note: "地域差が大きい。首都圏は6〜8万、地方は3〜5万が目安。",
  },
  {
    label: "食費",
    home: "1〜2万円",
    alone: "2〜3万円",
    Icon: UtensilsCrossed,
    note: "自炊で大幅に下げられる。学食活用も有効。",
  },
  {
    label: "光熱費・通信費",
    home: "0.5〜1万円",
    alone: "1〜1.5万円",
    Icon: Zap,
    note: "格安SIM・学割プランで月5,000円以下も可能。",
  },
  {
    label: "教材・書籍",
    home: "0.5〜1万円",
    alone: "0.5〜1万円",
    Icon: BookOpen,
    note: "中古・電子書籍・図書館の活用で大幅圧縮。",
  },
  {
    label: "交通費",
    home: "0.5〜1万円",
    alone: "0.5〜1万円",
    Icon: TrainFront,
    note: "通学定期は学割適用。アルバイト先までの交通費も計算に入れる。",
  },
  {
    label: "娯楽・交際費",
    home: "1〜3万円",
    alone: "1〜2万円",
    Icon: PartyPopper,
    note: "サークル費・飲み会・趣味。最も増減幅が大きい項目。",
  },
] as const;

const SCHOLARSHIP_PROVIDERS = [
  {
    name: "JASSO（日本学生支援機構）",
    Icon: Landmark,
    feature: "国の公的奨学金。最大規模で利用者が多い。",
    types: "給付型 / 第一種（無利子） / 第二種（有利子）",
    note: "最初に検討すべき選択肢。所属大学の窓口から申請。",
  },
  {
    name: "民間財団・企業奨学金",
    Icon: Users,
    feature: "企業や財団が運営。給付型が多く返済不要が魅力。",
    types: "ほぼ給付型（返済不要）",
    note: "年間予算が限られ競争率は高め。JASSOと併願可能。",
  },
  {
    name: "大学独自奨学金",
    Icon: GraduationCap,
    feature: "所属大学が独自に運営。授業料減免・給付など多様。",
    types: "給付型・授業料減免が中心",
    note: "大学の学生支援課（学生課）に直接問い合わせるのが最速。",
  },
  {
    name: "地方自治体奨学金",
    Icon: Globe,
    feature: "都道府県・市区町村が運営。地元出身者向けが多い。",
    types: "給付型・貸与型の両方あり",
    note: "出身地の自治体ホームページや学事課で確認。",
  },
] as const;

const JASSO_DETAILS = [
  {
    name: "給付型奨学金",
    Icon: Gift,
    monthly: "月 2〜7.5万円",
    repay: "返済不要",
    criteria: "家計基準（住民税課税状況）と学力基準",
    description:
      "返済不要の給付型。世帯収入により第Ⅰ〜第Ⅳ区分に分かれ、給付額が変動。授業料減免と併用できる場合あり。",
  },
  {
    name: "第一種奨学金（無利子）",
    Icon: PiggyBank,
    monthly: "月 2〜6.4万円",
    repay: "無利子で返済",
    criteria: "家計基準＋学業優秀（高校評定平均3.5以上目安）",
    description:
      "無利子の貸与型。国公私立・自宅/自宅外で月額が変動。返済は卒業後7か月目から。",
  },
  {
    name: "第二種奨学金（有利子）",
    Icon: TrendingUp,
    monthly: "月 2〜12万円",
    repay: "有利子で返済（上限年3%・近年は1%未満）",
    criteria: "家計基準は第一種より緩やか・学業要件も柔軟",
    description:
      "有利子の貸与型。借りやすく金額の選択肢が広い。医歯薬系は月16万円まで増額可。返済は卒業後7か月目から。",
  },
] as const;

const SAVING_TIPS = [
  {
    Icon: BookOpen,
    title: "教科書代を抑える",
    body: "新品で揃えると年間3〜5万円。先輩・友人からの譲り受け、中古市場（メルカリ・古本屋）、電子書籍、図書館の貸出を組み合わせれば半額以下も可能。シラバスで「指定書籍」と「参考書」を見分けてから買う。",
  },
  {
    Icon: UtensilsCrossed,
    title: "食費を抑える",
    body: "学食は栄養バランスが取れて1食300〜500円。自炊なら1食100〜200円も可能。コンビニ・カフェの常用は月1〜2万円の出費差になる。日中の自販機・カフェ習慣を見直すだけで効く。",
  },
  {
    Icon: Tag,
    title: "学割サブスクを活用する",
    body: "Amazon Prime Student（月300円）、Apple Music学割（月580円）、Spotify学割（月480円）、Microsoft 365（無料・大学契約）、Adobe学割（通常の約60%オフ）など。年間で数万円の差になる。",
  },
  {
    Icon: TrainFront,
    title: "学生定期・学割証を使う",
    body: "通学定期は通常の30〜60%オフ。実家への帰省も「学割証」をJRで使えば101km以上の片道で20%引き。学割証は学生課で年複数枚発行可能。",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "給付型と貸与型、どちらを優先すべき？",
    a: "迷うことなく給付型が最優先です。返済不要のため将来の負担にならず、家計基準を満たすなら必ず申請しましょう。給付型と第一種は併用できないケースが多いですが、給付型と第二種は併用可能な場合があります（区分により異なる）。所属大学の学生支援課で確認を。",
  },
  {
    q: "奨学金は借金ですか？",
    a: "貸与型（JASSO第一種・第二種、一部の民間・自治体）は法律上「借金」と同じ扱いです。返済義務があり、延滞すると信用情報に記録されます（住宅ローン・自動車ローンに影響）。給付型は返済不要のため借金ではありません。第二種（有利子）の場合、借りた額より総返済額は多くなるので、必要最小限の金額に絞るのが鉄則です。",
  },
  {
    q: "JASSO以外の奨学金も申請すべき？",
    a: "申請すべきです。民間・自治体・大学独自の奨学金は給付型が多く、JASSOと併用できるものも多いです。1つあたりの金額は少なくても、複数組み合わせれば年間数十万円の差になります。JASSOの「民間団体奨学金検索」、自治体ホームページ、所属大学の学生支援課を月1回はチェックする習慣をつけましょう。",
  },
  {
    q: "親に頼らずに学費を払う方法はありますか？",
    a: "現実的には「給付型奨学金＋第一種奨学金＋アルバイト＋授業料減免」の組み合わせが基本です。授業料減免は給付型奨学金と連動して自動適用される大学が多く、最大で授業料全額免除になります。これだけで国立大学なら年間54万円、私立でも年間30〜80万円の支援を受けられるケースがあります。ただし家計基準を満たす必要があるため、入学前に大学の窓口に相談を。",
  },
  {
    q: "学費が払えなくなったらどうすればいい？",
    a: "まず所属大学の学生支援課（学生課）にすぐ相談してください。家計急変による特別な授業料減免・分納・延納の制度を持つ大学が多くあります。JASSOにも「家計急変採用」という年度途中の追加申請制度があります。放置して納付期限を過ぎると除籍になるケースがあるため、迷ったら早めに窓口へ。",
  },
  {
    q: "在学中にバイトをしながら奨学金は受けられますか？",
    a: "受けられます。JASSO・民間問わず、アルバイト収入が奨学金の家計基準に直接影響することは基本的にありません（学生本人の収入は世帯収入と別扱い）。ただし、年103万円を超えると親の扶養から外れ、世帯収入が増えて翌年の家計基準が厳しくなる場合があります。バイトと奨学金の両立は問題ないですが、年収管理は意識しましょう。",
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
export default function MoneyGuidePage() {
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
          <span className="text-ink font-bold">お金・奨学金どうする？</span>
        </nav>

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-6 h-6 text-ink" aria-hidden="true" />
            <span className="text-ink text-sm font-bold tracking-widest uppercase">Money Guide</span>
          </div>
          <h1 className="text-ink text-3xl md:text-5xl font-black leading-tight tracking-tight font-mincho">
            お金・奨学金、どうする？
          </h1>
          <p className="text-graphite text-base md:text-lg leading-relaxed">
            大学生の生活費の目安・奨学金の種類（JASSO・民間・自治体・大学独自）・申請時期・返済の基本まで。お金の不安を解消するために、新入生が押さえておくべき基礎知識をまとめました。
          </p>
          {/* クイックナビ */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: "生活費", href: "#living-cost" },
              { label: "奨学金の全体像", href: "#overview" },
              { label: "JASSO", href: "#jasso" },
              { label: "民間・自治体", href: "#private" },
              { label: "返済", href: "#repay" },
              { label: "節約・学割", href: "#saving" },
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

        {/* §1 生活費 */}
        <section id="living-cost" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">大学生の生活費はいくら？</h2>
            <p className="text-graphite text-sm">
              自宅生か一人暮らしかで月の生活費は2〜3倍違います。まずは自分のケースの目安を把握しましょう。
            </p>
          </div>

          {/* 比較表 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-rule">
              <thead className="bg-mist">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-ink">項目</th>
                  <th className="px-4 py-3 text-left font-bold text-ink">自宅生（月）</th>
                  <th className="px-4 py-3 text-left font-bold text-ink">一人暮らし（月）</th>
                </tr>
              </thead>
              <tbody className="text-graphite">
                {LIVING_COST_BREAKDOWN.map((row) => (
                  <tr key={row.label} className="border-t border-rule">
                    <td className="px-4 py-3 font-bold text-ink">{row.label}</td>
                    <td className="px-4 py-3 font-numeric tabular-nums">{row.home}</td>
                    <td className="px-4 py-3 font-numeric tabular-nums">{row.alone}</td>
                  </tr>
                ))}
                <tr className="border-t border-rule bg-ink/5">
                  <td className="px-4 py-3 font-black text-ink">合計</td>
                  <td className="px-4 py-3 font-black text-ink font-numeric tabular-nums">約 3〜8万円</td>
                  <td className="px-4 py-3 font-black text-ink font-numeric tabular-nums">約 10〜15万円</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-graphite">
            ※ 目安は学生生活実態調査（JASSO・全国大学生協連等の公開データ）と地域別相場をもとにした概算。実際の金額は地域・大学・ライフスタイルで大きく変動します。
          </p>

          {/* 内訳カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {LIVING_COST_BREAKDOWN.map((item, i) => (
              <div key={i} className="border border-rule p-5 flex gap-4">
                <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                  <item.Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-ink text-sm font-bold">{item.label}</h3>
                  <p className="text-graphite text-xs leading-relaxed">{item.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* バイト送客（補足） */}
          <div className="border border-rule border-l-4 border-l-ink bg-mist p-5 flex gap-3">
            <Lightbulb className="w-[18px] h-[18px] text-ink shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-ink font-bold text-sm">不足分はバイトで補える？</p>
              <p className="text-graphite text-xs leading-relaxed mt-1">
                月10万の収入はバイト週20時間程度（時給1,200円×20時間×4週）で到達可能。ただし103万円の壁・授業との両立を考慮する必要があります。
                <Link href="/baito/simulator" className="text-ink font-bold underline ml-1">
                  シミュレーターで試算してみる →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* §2 奨学金の全体像 */}
        <section id="overview" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">奨学金の全体像（4つの提供元）</h2>
            <p className="text-graphite text-sm">
              奨学金には大きく分けて4つの提供元があります。JASSOだけでなく、複数を組み合わせて活用するのが鉄則です。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SCHOLARSHIP_PROVIDERS.map((provider, i) => (
              <div key={i} className="border border-rule p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                    <provider.Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                  </div>
                  <h3 className="font-black text-ink text-sm leading-tight">{provider.name}</h3>
                </div>
                <p className="text-graphite text-sm leading-relaxed">{provider.feature}</p>
                <div className="flex gap-2 text-xs">
                  <span className="text-ink font-bold shrink-0">種類：</span>
                  <span className="text-graphite leading-relaxed">{provider.types}</span>
                </div>
                <div className="flex gap-2 text-xs pt-2 border-t border-rule">
                  <span className="text-ink font-bold shrink-0">→ Tips</span>
                  <span className="text-graphite leading-relaxed">{provider.note}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 注意ボックス（警告） */}
          <div className="border border-rule border-l-4 border-l-seal bg-mist p-5 flex gap-3">
            <AlertTriangle className="w-[18px] h-[18px] text-seal shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-ink font-bold text-sm">「給付型」を装う有料サービスに注意</p>
              <p className="text-graphite text-xs leading-relaxed mt-1">
                「申請代行で給付型を必ず通します（手数料○万円）」のようなサービスは原則すべて避けてください。
                正規の奨学金申請は無料です。所属大学の学生支援課 → JASSO公式 → 信頼できる自治体・財団HP の順で確認しましょう。
              </p>
            </div>
          </div>
        </section>

        {/* §3 JASSO */}
        <section id="jasso" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">JASSO奨学金（給付・第一種・第二種）</h2>
            <p className="text-graphite text-sm">
              JASSO（日本学生支援機構）は国の公的奨学金で、最大規模・最多利用者数。3種類の中身を理解しましょう。
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {JASSO_DETAILS.map((item, i) => (
              <div key={i} className="border border-rule p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-ink flex items-center justify-center shrink-0">
                    <item.Icon className="w-5 h-5 text-paper" aria-hidden="true" />
                  </div>
                  <h3 className="font-black text-ink text-base">{item.name}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-mist p-3 flex flex-col gap-1">
                    <span className="text-graphite font-bold">月額</span>
                    <span className="text-ink font-black text-sm font-numeric tabular-nums">{item.monthly}</span>
                  </div>
                  <div className="bg-mist p-3 flex flex-col gap-1">
                    <span className="text-graphite font-bold">返済</span>
                    <span className="text-ink font-black text-sm">{item.repay}</span>
                  </div>
                  <div className="bg-mist p-3 flex flex-col gap-1">
                    <span className="text-graphite font-bold">主な基準</span>
                    <span className="text-ink font-black text-sm leading-tight">{item.criteria}</span>
                  </div>
                </div>
                <p className="text-graphite text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          {/* 申請時期 */}
          <div className="border border-rule p-6 flex flex-col gap-4">
            <h3 className="text-ink font-black text-base">申請時期：予約採用と在学採用</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-[18px] h-[18px] text-ink" aria-hidden="true" />
                  <h4 className="text-ink font-bold text-sm">予約採用（高校在学中に申請）</h4>
                </div>
                <p className="text-graphite text-xs leading-relaxed">
                  高校3年生の春・秋に高校経由で申請。大学合格後に手続きし、入学後に振込開始。早期に確保したい人向け。
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-[18px] h-[18px] text-ink" aria-hidden="true" />
                  <h4 className="text-ink font-bold text-sm">在学採用（大学入学後に申請）</h4>
                </div>
                <p className="text-graphite text-xs leading-relaxed">
                  大学入学後の4月頃に大学経由で申請。予約採用に出していなくてもここで申請できる。家計急変による途中採用もあり。
                </p>
              </div>
            </div>
            <p className="text-[11px] text-graphite">
              ※ 最新の正確な情報は <strong>JASSO公式サイト</strong> および所属大学の学生支援課で必ず確認してください。月額・基準は年度により変動します。
            </p>
          </div>
        </section>

        {/* §4 民間・自治体 */}
        <section id="private" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">民間・自治体・大学独自奨学金の探し方</h2>
            <p className="text-graphite text-sm">
              JASSO以外にも給付型の選択肢は多数あります。公式情報源を組み合わせて漏れなく探しましょう。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                Icon: Search,
                title: "民間奨学金を探す",
                body: "JASSO公式サイトの「奨学金検索」で民間団体奨学金を一覧検索できます。給付型中心で返済不要のものが多い反面、競争率は高め。複数応募が基本。",
                source: "JASSO「民間団体奨学金検索」（公式）",
              },
              {
                Icon: Building2,
                title: "自治体奨学金を探す",
                body: "出身地の都道府県・市区町村のホームページで「奨学金」を検索。地元出身者限定の制度が多く、応募者数も少ないため通りやすい傾向があります。",
                source: "各都道府県・市区町村の公式サイト",
              },
              {
                Icon: GraduationCap,
                title: "大学独自の奨学金・授業料減免",
                body: "所属大学の学生支援課・学生課に直接問い合わせるのが最速・最確実。授業料減免（最大全額）と独自給付奨学金の両方が用意されている大学が多いです。",
                source: "所属大学 学生支援課（学生課）",
              },
              {
                Icon: BadgeCheck,
                title: "JASSO公式の家計基準シミュレーション",
                body: "JASSO公式に「進学資金シミュレーター」があり、世帯収入・家族構成を入力すると給付・貸与の対象になるかが事前に分かります。申請前に必ずチェック。",
                source: "JASSO「進学資金シミュレーター」（公式）",
              },
            ].map((item, i) => (
              <div key={i} className="border border-rule p-5 flex gap-4">
                <div className="w-10 h-10 bg-mist flex items-center justify-center shrink-0">
                  <item.Icon className="w-5 h-5 text-ink" aria-hidden="true" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-ink text-sm font-bold">{item.title}</h3>
                  <p className="text-graphite text-sm leading-relaxed">{item.body}</p>
                  <p className="text-[11px] text-graphite mt-1">
                    <span className="font-bold">情報源：</span>
                    {item.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* §5 返済 */}
        <section id="repay" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">奨学金返済の基本</h2>
            <p className="text-graphite text-sm">
              貸与型を借りる前に、卒業後の返済額をシミュレーションしておきましょう。「思ったより重い」ことが多い項目です。
            </p>
          </div>

          {/* 返済シミュレーション例 */}
          <div className="border border-rule p-6 flex flex-col gap-4">
            <h3 className="text-ink font-black text-base">返済シミュレーション例</h3>
            <p className="text-graphite text-sm leading-relaxed">
              第二種奨学金（有利子）で月5万円を4年間借りた場合の概算：
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { label: "借入総額", value: "240万円", sub: "月5万 × 48か月" },
                { label: "返済期間", value: "約13年", sub: "標準的な返還期間" },
                { label: "月返済額", value: "約 1.6万円", sub: "卒業7か月後から" },
                { label: "総返済額", value: "約 250万円", sub: "利率0.5%想定" },
              ].map((row) => (
                <div key={row.label} className="bg-mist p-3 flex flex-col gap-1">
                  <span className="font-bold text-graphite">{row.label}</span>
                  <span className="text-ink font-black text-base font-numeric tabular-nums">{row.value}</span>
                  <span className="text-graphite leading-snug">{row.sub}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-graphite">
              ※ 概算値。実際の返済額・利率はJASSO公式の「奨学金返還シミュレーション」で必ず最新値を確認してください。
            </p>
          </div>

          {/* 救済制度（補足） */}
          <div className="border border-rule border-l-4 border-l-ink bg-mist p-5 flex gap-3">
            <LifeBuoy className="w-[18px] h-[18px] text-ink shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-ink font-bold text-sm">返済が苦しくなったら：減額返還・返還期限猶予</p>
              <p className="text-graphite text-xs leading-relaxed mt-1">
                JASSOには「減額返還制度（月額の1/2 or 1/3に減らして返還期間を延長）」「返還期限猶予（最大10年返還を停止）」があります。失業・病気・災害などで返済が困難な場合は、放置せず必ずJASSOに申請を。延滞すると個人信用情報に登録され、将来の住宅ローン・自動車ローンに影響します。
              </p>
            </div>
          </div>
        </section>

        {/* §6 節約・学割 */}
        <section id="saving" className="flex flex-col gap-6 scroll-mt-20">
          <h2 className="text-ink text-xl md:text-2xl font-black font-mincho">節約術・学割を活用する</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAVING_TIPS.map((item, i) => (
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
        </section>

        {/* §7 FAQ */}
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

        {/* バイト送客（主要CTA） */}
        <section className="bg-ink p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-black text-xl md:text-2xl text-paper font-mincho">
              バイトで収入を補うなら
            </h2>
            <p className="text-sm leading-relaxed text-paper/70">
              授業・サークルと両立できるバイトの選び方、103万円の壁、シフトの組み方まで。3問の診断で月収と自由時間を可視化できます。
            </p>
          </div>
          <Link
            href="/baito/simulator"
            className="shrink-0 inline-flex items-center gap-2 bg-seal text-paper hover:bg-seal/90 transition-colors px-8 py-4 font-black text-base whitespace-nowrap"
          >
            シミュレートしてみる
            <ArrowRight className="w-5 h-5" aria-hidden="true" />
          </Link>
        </section>

        {/* 他のガイド */}
        <section className="border border-rule p-6 flex flex-col gap-4">
          <h3 className="text-ink font-black text-base">他のガイドも読む</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/guide/living-alone"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <House className="w-4 h-4" aria-hidden="true" />
              一人暮らしどうする？
            </Link>
            <Link
              href="/baito"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <Briefcase className="w-4 h-4" aria-hidden="true" />
              バイト・インターンどうする？
            </Link>
            <Link
              href="/guide/credits"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              単位・授業どうする？
            </Link>
            <Link
              href="/guide/circle"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <Users className="w-4 h-4" aria-hidden="true" />
              サークルどうする？
            </Link>
            <Link
              href="/guide/study-abroad"
              className="flex items-center gap-2 px-4 py-2 border border-rule hover:border-ink/40 text-sm font-bold text-ink transition-colors"
            >
              <Plane className="w-4 h-4" aria-hidden="true" />
              留学どうする？
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

import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "大学生の一人暮らし、費用はいくら？初期費用・生活費・部屋探し完全ガイド | ProofLoop",
  description:
    "大学生の一人暮らしにかかる初期費用・毎月の生活費・家賃相場・食費の目安から、部屋探しのコツ・必要なものチェックリスト・仕送りなしで暮らす方法まで。一人暮らしの不安を解消する基礎知識をProofLoopが新入生向けにまとめました。",
  keywords: [
    "大学生 一人暮らし 費用",
    "大学生 一人暮らし",
    "一人暮らし 食費 大学生",
    "大学生 一人暮らし 家賃",
    "大学生 一人暮らし 初期費用",
    "大学生 一人暮らし 必要なもの",
    "大学生 一人暮らし きつい",
  ],
  openGraph: {
    title: "大学生の一人暮らし、費用はいくら？初期費用・生活費・部屋探し完全ガイド | ProofLoop",
    description:
      "初期費用・毎月の生活費・家賃相場・食費・必要なものチェックリスト・仕送りなしで暮らす方法まで、大学生の一人暮らしの疑問をまとめて解決。",
    url: `${SITE_URL}/guide/living-alone`,
  },
  alternates: { canonical: `${SITE_URL}/guide/living-alone` },
};

// ─────────────────────────────────────────────
// データ定数
// ─────────────────────────────────────────────
const INITIAL_COSTS = [
  { label: "敷金", amount: "家賃1〜2か月分", icon: "shield", note: "退去時の原状回復に充当。返還される場合もある。" },
  { label: "礼金", amount: "家賃0〜1か月分", icon: "redeem", note: "大家へのお礼で返還なし。ゼロ物件も増えている。" },
  { label: "仲介手数料", amount: "家賃0.5〜1か月分＋税", icon: "real_estate_agent", note: "不動産会社への手数料。半額・無料の会社もある。" },
  { label: "前家賃", amount: "家賃1か月分", icon: "event", note: "入居する月の家賃を前払い。" },
  { label: "火災保険料", amount: "1.5〜2万円（2年）", icon: "local_fire_department", note: "加入必須のことが多い。自分で安い保険を選べる場合も。" },
  { label: "保証会社利用料", amount: "家賃0.5〜1か月分", icon: "verified_user", note: "連帯保証人の代わり。近年はほぼ必須。" },
  { label: "鍵交換費用", amount: "1.5〜2万円", icon: "key", note: "防犯のための鍵交換。" },
  { label: "家具・家電", amount: "10〜20万円", icon: "chair", note: "冷蔵庫・洗濯機・電子レンジ・ベッド等。実家からの転用で圧縮可。" },
  { label: "引越し費用", amount: "3〜8万円", icon: "local_shipping", note: "距離と時期で変動。3〜4月の繁忙期は高い。" },
] as const;

const MONTHLY_COST = [
  { label: "家賃", value: "5〜7万円", note: "地域差が最大。首都圏は6〜8万、地方は3〜5万。" },
  { label: "食費", value: "2〜3万円", note: "自炊で1〜1.5万円まで圧縮可能。" },
  { label: "光熱費・通信費", value: "1〜1.5万円", note: "格安SIM・学割で通信費は大きく下げられる。" },
  { label: "日用品・雑費", value: "0.5〜1万円", note: "洗剤・トイレットペーパー等の消耗品。" },
  { label: "娯楽・交際費", value: "1〜2万円", note: "サークル・趣味・交際。増減幅が最も大きい。" },
] as const;

const RENT_BY_AREA = [
  { area: "東京23区", range: "6.5〜9万円", note: "大学が集中し需要が高い。少し離れた駅で下げる工夫を。" },
  { area: "首都圏近郊（埼玉・千葉・神奈川）", range: "5〜7万円", note: "都心へ電車1本の駅を選べば家賃と通学のバランス良し。" },
  { area: "地方の政令市（札幌・仙台・福岡等）", range: "4〜6万円", note: "都市機能と家賃のバランスが良い。" },
  { area: "地方大学の最寄り", range: "3〜5万円", note: "大学生協物件・学生マンションが狙い目。" },
] as const;

const CHECKLIST = [
  {
    category: "家電",
    icon: "kitchen",
    color: "text-sky-600",
    bg: "bg-sky-50",
    must: ["冷蔵庫", "洗濯機", "電子レンジ", "照明器具", "ドライヤー"],
    later: ["炊飯器", "掃除機", "電気ケトル", "テレビ"],
  },
  {
    category: "家具・寝具",
    icon: "chair",
    color: "text-amber-600",
    bg: "bg-amber-50",
    must: ["ベッド or 布団", "カーテン", "収納棚"],
    later: ["デスク・椅子", "テーブル", "本棚"],
  },
  {
    category: "キッチン用品",
    icon: "restaurant",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    must: ["フライパン・鍋", "包丁・まな板", "食器類", "菜箸・お玉"],
    later: ["水切りかご", "保存容器", "調味料一式"],
  },
  {
    category: "日用品・防災",
    icon: "cleaning_services",
    color: "text-violet-600",
    bg: "bg-violet-50",
    must: ["トイレ・掃除用品", "タオル類", "ゴミ箱", "洗剤類"],
    later: ["防災グッズ（水・懐中電灯）", "常備薬", "延長コード"],
  },
] as const;

const FOOD_MINI_FAQ = [
  {
    q: "食費3万円は無理？",
    a: "無理ではありません。外食・コンビニ中心だと月4〜5万円になりますが、週の半分を自炊にすれば3万円前後は十分現実的です。米・卵・鶏むね肉・もやし・豆腐など安い食材を軸にすると安定します。",
  },
  {
    q: "食費2万円は無理？",
    a: "ほぼ毎日自炊・作り置きを前提にすれば可能ですが、栄養が偏りやすく無理は禁物です。学食（1食300〜500円）を昼に使い、夜だけ自炊するハイブリッドが続けやすくおすすめです。",
  },
  {
    q: "自炊と外食どちらが安い？",
    a: "自炊が圧倒的に安いです。自炊は1食100〜200円、外食は1食600〜1,000円が目安で、月に換算すると2〜3万円の差になります。ただし自炊は時間コストがかかるため、忙しい時期は無理せず学食・惣菜も併用しましょう。",
  },
] as const;

const FAQ_ITEMS = [
  {
    q: "一人暮らしと実家、結局いくら違う？",
    a: "自宅生の生活費が月3〜8万円なのに対し、一人暮らしは月10〜15万円が目安で、月あたり5〜8万円ほど多くかかります。加えて入居時に初期費用30〜50万円が別途必要です。年間では100万円以上の差になることもあり、仕送り・奨学金・バイトでどう賄うかを入学前に計画しておくのが重要です。",
  },
  {
    q: "仕送りなしでも大学に通えますか？",
    a: "通えます。現実的には「給付型奨学金＋第一種奨学金＋アルバイト＋授業料減免」の組み合わせが基本です。家賃の安い物件を選び、食費を自炊で抑えれば、仕送りゼロでも生活は成り立ちます。ただし学業との両立のためバイトは週15〜20時間を目安にし、詳しくは奨学金ガイドを確認してください。",
  },
  {
    q: "初期費用を抑えるにはどうすればいい？",
    a: "①礼金・仲介手数料ゼロの物件を選ぶ、②家具家電付き物件やフリーレント物件を狙う、③家電は実家からの転用や中古（リサイクルショップ・メルカリ）を活用する、④引越しは3〜4月の繁忙期を避ける、の4つが効きます。大学生協が紹介する物件は初期費用を抑えた学生向けプランが多く、まず相談する価値があります。",
  },
  {
    q: "部屋探しはいつから始めればいい？",
    a: "合格発表後すぐ、遅くとも入学の1〜2か月前には動き始めましょう。1〜3月は学生の需要が集中し、良い物件から埋まっていきます。推薦・総合型で早く合格が決まっている人は、12〜1月から情報収集を始めると有利です。",
  },
  {
    q: "女子の部屋選びで気をつけることは？",
    a: "防犯を最優先に。①2階以上、②オートロック、③モニター付きインターホン、④駅から明るい道、⑤周辺にコンビニがある、といった条件を意識しましょう。家賃は上がりますが、安全は削らないのが鉄則です。内見は必ず日没後の周辺環境も確認するのがおすすめです。",
  },
  {
    q: "住民票は移したほうがいい？",
    a: "原則として移すのが望ましいです。選挙・免許更新・各種証明書の取得が現住所でできるようになります。ただし実家の扶養や地元での成人式などの都合で移さない学生もいます。詳しくは下の「手続きミニ知識」を参照してください。",
  },
] as const;

// ─────────────────────────────────────────────
// FAQアコーディオン
// ─────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="border-b border-[#f0f2f5] last:border-0 group">
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none">
        <span className="font-bold text-primary text-sm leading-snug">{q}</span>
        <span className="material-symbols-outlined text-text-grey shrink-0 group-open:rotate-180 transition-transform duration-200">
          expand_more
        </span>
      </summary>
      <p className="text-text-grey text-sm leading-relaxed pb-5">{a}</p>
    </details>
  );
}

// ─────────────────────────────────────────────
// メインページ（Server Component）
// ─────────────────────────────────────────────
export default function LivingAloneGuidePage() {
  return (
    <div className="bg-white text-primary min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">
        {/* パンくず */}
        <nav className="flex items-center gap-2 text-xs text-text-grey -mb-10">
          <Link href="/" className="hover:text-primary transition-colors">
            ホーム
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/guide" className="hover:text-primary transition-colors">
            新入生ガイド
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-primary font-bold">一人暮らしどうする？</span>
        </nav>

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-2xl">cottage</span>
            <span className="text-accent text-sm font-bold tracking-widest uppercase">Living Alone Guide</span>
          </div>
          <h1 className="text-primary text-3xl md:text-5xl font-black leading-tight tracking-tight">
            大学生の一人暮らし、どうする？
          </h1>
          <p className="text-text-grey text-base md:text-lg leading-relaxed">
            初期費用はいくら？毎月の生活費は？部屋探しはいつから？——大学生の一人暮らしでぶつかる疑問を、費用の全体像から必要なものチェックリスト、仕送りなしで暮らす方法まで、新入生向けにまとめました。
          </p>
          {/* クイックナビ */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: "費用の全体像", href: "#cost" },
              { label: "初期費用", href: "#initial" },
              { label: "家賃の相場", href: "#rent" },
              { label: "食費・自炊", href: "#food" },
              { label: "必要なもの", href: "#checklist" },
              { label: "仕送りとバイト", href: "#income" },
              { label: "きつい時は", href: "#tough" },
              { label: "手続き", href: "#admin" },
              { label: "よくある質問", href: "#faq" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-xs px-3 py-1.5 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors font-bold"
              >
                {item.label}
              </a>
            ))}
          </div>
        </section>

        {/* §1 費用の全体像 */}
        <section id="cost" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">一人暮らしにかかるお金の全体像</h2>
            <p className="text-text-grey text-sm">
              一人暮らしの費用は「入居時に一度だけかかる初期費用」と「毎月かかる生活費」の2つに分けて考えます。まず全体像を把握しましょう。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#f0f2f5] p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-accent text-xl">receipt_long</span>
                <h3 className="text-primary font-black text-base">初期費用（入居時に一度）</h3>
              </div>
              <p className="text-accent font-black text-2xl">約 30〜50万円</p>
              <p className="text-text-grey text-xs leading-relaxed">
                敷金・礼金・仲介手数料・家具家電・引越しなどの合計。家賃の約4〜6か月分が目安。
              </p>
            </div>
            <div className="border border-[#f0f2f5] p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-accent text-xl">calendar_month</span>
                <h3 className="text-primary font-black text-base">毎月の生活費</h3>
              </div>
              <p className="text-accent font-black text-2xl">約 10〜15万円</p>
              <p className="text-text-grey text-xs leading-relaxed">
                家賃・食費・光熱通信費・交際費などの合計。自宅生（月3〜8万円）の約2倍。
              </p>
            </div>
          </div>

          <p className="text-[11px] text-text-grey">
            ※ 目安は学生生活実態調査（全国大学生協連・JASSO等の公開データ）と地域別相場をもとにした概算。実際の金額は地域・大学・ライフスタイルで大きく変動します。年間では自宅生との差が100万円を超えることもあります。
          </p>

          {/* money送客 */}
          <div className="border border-rose-200 bg-rose-50 p-5 flex gap-3">
            <span className="material-symbols-outlined text-rose-700 text-lg shrink-0 mt-0.5">savings</span>
            <div className="flex-1">
              <p className="text-rose-900 font-bold text-sm">この費用、どうやって用意する？</p>
              <p className="text-rose-800 text-xs leading-relaxed mt-1">
                奨学金の種類・申請時期・生活費の内訳は「お金・奨学金ガイド」で詳しく解説しています。
                <Link href="/guide/money" className="text-accent font-bold underline ml-1">
                  お金・奨学金どうする？ →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* §2 初期費用の内訳 */}
        <section id="initial" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">初期費用の内訳</h2>
            <p className="text-text-grey text-sm">
              入居時にまとめて必要になるお金の内訳です。家賃4.5万円の物件を借りる場合で、合計約30〜50万円が目安になります。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INITIAL_COSTS.map((item) => (
              <div key={item.label} className="border border-[#f0f2f5] p-5 flex gap-4">
                <div className="w-10 h-10 bg-primary/5 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-xl">{item.icon}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="text-primary text-sm font-bold">{item.label}</h3>
                    <span className="text-accent text-xs font-black">{item.amount}</span>
                  </div>
                  <p className="text-text-grey text-xs leading-relaxed">{item.note}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 節約Tips */}
          <div className="border border-emerald-200 bg-emerald-50 p-5 flex gap-3">
            <span className="material-symbols-outlined text-emerald-700 text-lg shrink-0 mt-0.5">tips_and_updates</span>
            <div>
              <p className="text-emerald-900 font-bold text-sm">初期費用を抑える4つのコツ</p>
              <p className="text-emerald-800 text-xs leading-relaxed mt-1">
                ①礼金・仲介手数料ゼロの物件を選ぶ ②家具家電付き・フリーレント物件を狙う ③家電は実家転用や中古（リサイクルショップ・メルカリ）を活用 ④引越しは3〜4月の繁忙期を避ける。大学生協が紹介する学生向け物件は初期費用を抑えたプランが多く、まず相談する価値があります。
              </p>
            </div>
          </div>
        </section>

        {/* §3 家賃の相場 */}
        <section id="rent" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">家賃の相場とエリア選び</h2>
            <p className="text-text-grey text-sm">
              家賃は生活費のなかで最も大きく、地域差が最大の項目です。大学最寄りにこだわらず、少し離れた駅を選ぶだけで大きく変わります。
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-[#f0f2f5]">
              <thead className="bg-primary/5">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-primary">エリア</th>
                  <th className="px-4 py-3 text-left font-bold text-primary">家賃の目安（月）</th>
                  <th className="px-4 py-3 text-left font-bold text-primary hidden md:table-cell">ポイント</th>
                </tr>
              </thead>
              <tbody className="text-text-grey">
                {RENT_BY_AREA.map((row) => (
                  <tr key={row.area} className="border-t border-[#f0f2f5]">
                    <td className="px-4 py-3 font-bold text-primary">{row.area}</td>
                    <td className="px-4 py-3 font-black text-accent whitespace-nowrap">{row.range}</td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-[#f0f2f5] p-6 flex flex-col gap-3">
            <h3 className="text-primary font-black text-base">女子の部屋選びは防犯を最優先に</h3>
            <p className="text-text-grey text-sm leading-relaxed">
              家賃は多少上がっても、①2階以上 ②オートロック ③モニター付きインターホン ④駅から明るい道 ⑤周辺にコンビニ、といった防犯条件は削らないのが鉄則です。内見時は日没後の周辺の明るさも必ず確認しましょう。
            </p>
            <p className="text-[11px] text-text-grey">
              ※ 相場は概算です。最新の物件情報は大学生協・不動産会社の公式サイトで確認してください。
            </p>
          </div>
        </section>

        {/* §4 食費・自炊 */}
        <section id="food" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">食費と自炊</h2>
            <p className="text-text-grey text-sm">
              食費は工夫しだいで最も差がつく項目です。一人暮らし大学生の平均は月2〜3万円。自炊を取り入れれば月1〜1.5万円まで下げられます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "外食・コンビニ中心", value: "月 4〜5万円", icon: "storefront", tone: "text-rose-600" },
              { label: "自炊と外食の併用", value: "月 2〜3万円", icon: "restaurant", tone: "text-amber-600" },
              { label: "ほぼ自炊・作り置き", value: "月 1〜1.5万円", icon: "local_dining", tone: "text-emerald-600" },
            ].map((row) => (
              <div key={row.label} className="border border-[#f0f2f5] p-5 flex flex-col gap-2 items-start">
                <span className={`material-symbols-outlined text-2xl ${row.tone}`}>{row.icon}</span>
                <h3 className="text-primary text-sm font-bold">{row.label}</h3>
                <p className="text-primary font-black text-lg">{row.value}</p>
              </div>
            ))}
          </div>

          <p className="text-text-grey text-sm leading-relaxed">
            米・卵・鶏むね肉・もやし・豆腐などの安い食材を軸にし、昼は学食（1食300〜500円）を使うと無理なく続きます。コンビニ・カフェの常用は月1〜2万円の出費差になるため、日中の習慣を見直すだけでも効果的です。
          </p>

          {/* PAA対応ミニFAQ */}
          <div className="border border-[#f0f2f5] px-6">
            {FOOD_MINI_FAQ.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* §5 必要なものチェックリスト */}
        <section id="checklist" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">一人暮らしで必要なものチェックリスト</h2>
            <p className="text-text-grey text-sm">
              「入学までに揃える必須アイテム」と「後から買い足せばよいもの」に分けました。全部を最初に買う必要はありません。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHECKLIST.map((group) => (
              <div key={group.category} className="border border-[#f0f2f5] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${group.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-xl ${group.color}`}>{group.icon}</span>
                  </div>
                  <h3 className="font-black text-primary text-sm">{group.category}</h3>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-accent">入学までに揃える</span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.must.map((item) => (
                      <span key={item} className="text-xs px-2 py-1 bg-primary/5 text-primary border border-primary/10">
                        {item}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-text-grey mt-1">後から買い足す</span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.later.map((item) => (
                      <span key={item} className="text-xs px-2 py-1 bg-slate-50 text-text-grey border border-slate-100">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-text-grey text-sm leading-relaxed">
            パソコンは大学生活の必需品です。文系・理系別の選び方やスペックの目安は、別途「大学生のパソコン選びガイド」で解説予定です。それまでは所属大学の生協が案内する推奨スペックも参考になります。
          </p>
        </section>

        {/* §6 仕送りとバイト */}
        <section id="income" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">仕送りとバイトでどう賄う？</h2>
            <p className="text-text-grey text-sm">
              一人暮らしの生活費は「仕送り＋バイト＋奨学金」で組み立てます。仕送りなしでも、組み合わせしだいで十分に成り立ちます。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#f0f2f5] p-6 flex flex-col gap-2">
              <h3 className="text-primary font-black text-base">仕送りの平均額</h3>
              <p className="text-accent font-black text-2xl">月 約7〜8万円</p>
              <p className="text-text-grey text-xs leading-relaxed">
                全国大学生協連の調査では一人暮らし学生への仕送りは月7万円前後。家賃を仕送りで、生活費をバイトで賄うのが典型的なモデルです。
              </p>
            </div>
            <div className="border border-[#f0f2f5] p-6 flex flex-col gap-2">
              <h3 className="text-primary font-black text-base">仕送りなしのモデルケース</h3>
              <p className="text-text-grey text-sm leading-relaxed">
                給付型奨学金（月2〜7.5万円）＋第一種奨学金＋バイト（月5〜8万円）＋授業料減免、の組み合わせで仕送りゼロでも生活は可能。家賃の安い物件と自炊が前提です。
              </p>
            </div>
          </div>

          {/* シミュレーター送客 */}
          <div className="border border-emerald-200 bg-emerald-50 p-5 flex gap-3">
            <span className="material-symbols-outlined text-emerald-700 text-lg shrink-0 mt-0.5">tips_and_updates</span>
            <div className="flex-1">
              <p className="text-emerald-900 font-bold text-sm">バイトでいくら稼げば足りる？</p>
              <p className="text-emerald-800 text-xs leading-relaxed mt-1">
                月10万円の収入はバイト週20時間程度（時給1,200円×20時間×4週）で到達可能。ただし103万円の壁・授業との両立を考慮する必要があります。
                <Link href="/baito/simulator" className="text-accent font-bold underline ml-1">
                  シミュレーターで試算してみる →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* §7 きつい時は */}
        <section id="tough" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">「一人暮らしがきつい」と感じたら</h2>
            <p className="text-text-grey text-sm">
              金欠・孤独・生活リズムの崩れは、一人暮らしを始めた多くの人がぶつかる壁です。ひとりで抱え込まないための対処法を紹介します。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: "payments",
                title: "金欠がきつい",
                body: "固定費（家賃・通信費）から見直すのが先決。格安SIM・学割サブスク・自炊で毎月の支出を数万円下げられます。奨学金の追加申請も検討を。",
              },
              {
                icon: "sentiment_dissatisfied",
                title: "孤独・寂しさがきつい",
                body: "一人暮らしは人とのつながりが減りがち。サークルやコミュニティに1つ所属するだけで生活の充実度が大きく変わります。",
              },
              {
                icon: "bedtime",
                title: "生活リズムがきつい",
                body: "自由なぶん昼夜逆転しやすいのが一人暮らし。1限の授業・朝バイト・友人との予定など「外の予定」を意識的に入れると整います。",
              },
            ].map((item) => (
              <div key={item.title} className="border border-[#f0f2f5] p-5 flex flex-col gap-2">
                <span className="material-symbols-outlined text-accent text-2xl">{item.icon}</span>
                <h3 className="text-primary text-sm font-bold">{item.title}</h3>
                <p className="text-text-grey text-xs leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          {/* サークル送客 */}
          <div className="border border-violet-200 bg-violet-50 p-5 flex gap-3">
            <span className="material-symbols-outlined text-violet-700 text-lg shrink-0 mt-0.5">groups</span>
            <div className="flex-1">
              <p className="text-violet-900 font-bold text-sm">居場所を作るならサークルから</p>
              <p className="text-violet-800 text-xs leading-relaxed mt-1">
                サークルの選び方・入り方は「サークルガイド」で、全国の学生団体の検索はProofLoopでできます。
                <Link href="/guide/circle" className="text-accent font-bold underline ml-1">
                  サークルどうする？ →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* §8 手続きミニ知識 */}
        <section id="admin" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">手続きミニ知識（住民票・世帯主）</h2>
            <p className="text-text-grey text-sm">
              引越しにともなう行政手続きの基本です。細かいですが、後で困らないよう押さえておきましょう。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-[#f0f2f5] p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">description</span>
                <h3 className="text-primary text-sm font-bold">住民票は移すべき？</h3>
              </div>
              <p className="text-text-grey text-xs leading-relaxed">
                原則は移すのが望ましく、選挙・免許更新・証明書取得が現住所でできるようになります。ただし実家の扶養や地元の成人式の都合で移さない人もいます。法律上は「生活の本拠地」に置くのが建前です。
              </p>
            </div>
            <div className="border border-[#f0f2f5] p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">badge</span>
                <h3 className="text-primary text-sm font-bold">世帯主はどうなる？</h3>
              </div>
              <p className="text-text-grey text-xs leading-relaxed">
                住民票を移して一人暮らしをする場合、自分自身が「世帯主」になります。各種申請書で世帯主を書く欄では自分の名前を記入します。健康保険（扶養のままか国保か）は親と相談して決めましょう。
              </p>
            </div>
          </div>
          <p className="text-[11px] text-text-grey">
            ※ 手続きの詳細・必要書類は、引越し先の市区町村の公式サイトで必ず確認してください。
          </p>
        </section>

        {/* §9 FAQ */}
        <section id="faq" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-xl">help</span>
            <h2 className="text-primary text-xl md:text-2xl font-black">よくある質問</h2>
          </div>
          <div className="border border-[#f0f2f5] px-6">
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* シミュレーター送客 */}
        <section style={{ backgroundColor: "#002b5c" }} className="p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-black text-xl md:text-2xl" style={{ color: "#ffffff" }}>
              一人暮らしの収支、足りるか試算しよう
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              家賃・仕送り・バイトの条件から、毎月の収支と自由時間を可視化。3問の診断で無理のない生活プランが見えてきます。
            </p>
          </div>
          <Link
            href="/baito/simulator"
            className="shrink-0 inline-flex items-center gap-2 bg-accent text-white hover:bg-[#600000] transition-colors px-8 py-4 font-black text-base whitespace-nowrap"
          >
            シミュレートしてみる
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </section>

        {/* 他のガイド */}
        <section className="border border-[#f0f2f5] p-6 flex flex-col gap-4">
          <h3 className="text-primary font-black text-base">他のガイドも読む</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/guide/money"
              className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <span className="material-symbols-outlined text-sm">savings</span>
              お金・奨学金どうする？
            </Link>
            <Link
              href="/baito"
              className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <span className="material-symbols-outlined text-sm">work</span>
              バイト・インターンどうする？
            </Link>
            <Link
              href="/guide/credits"
              className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <span className="material-symbols-outlined text-sm">school</span>
              単位・授業どうする？
            </Link>
            <Link
              href="/guide/circle"
              className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <span className="material-symbols-outlined text-sm">groups</span>
              サークルどうする？
            </Link>
            <Link
              href="/guide"
              className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors"
            >
              <span className="material-symbols-outlined text-sm">menu_book</span>
              新入生ガイド一覧へ
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

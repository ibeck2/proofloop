import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion from "./FaqAccordion";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "留学どうする？大学生の留学完全ガイド2025 | ProofLoop",
  description:
    "交換留学・認定留学・休学留学の違い、費用の目安、学年別タイムライン、奨学金情報まで。大学生の留学に関する疑問をProofLoopがまとめて解決。",
  keywords: ["大学生 留学", "交換留学 費用", "認定留学 単位", "休学 留学", "留学 いつ", "留学 奨学金"],
  openGraph: {
    title: "留学どうする？大学生の留学完全ガイド | ProofLoop",
    description: "留学の種類・費用・時期・単位・奨学金まで、新入生の疑問をまとめて解決。",
    url: `${SITE_URL}/guide/study-abroad`,
  },
  alternates: { canonical: `${SITE_URL}/guide/study-abroad` },
};

// ─────────────────────────────────────────────
// データ定数
// ─────────────────────────────────────────────

const RYUGAKU_TYPES = [
  {
    name: "交換留学",
    icon: "swap_horiz",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    cost: "安い",
    costDetail: "日本の授業料のみ（留学先免除）",
    unit: "◎ 認定されやすい",
    graduation: "△ 原則遅れないが実態は要確認",
    freedom: "低（協定校のみ・選考あり）",
    suit: "GPA高め・競争を突破できる・費用を抑えたい人",
    caution: "倍率が高く、希望の大学に行けるとは限らない。協定校以外は選べない。",
  },
  {
    name: "認定留学",
    icon: "verified",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    cost: "中〜高",
    costDetail: "日本の授業料＋留学先の学費",
    unit: "△ 条件付き（専攻関連・上限30単位等）",
    graduation: "⚠️ 制度上は遅れないが、単位条件が厳しく遅れるケースが多い",
    freedom: "中（協定校から選択・選考あり）",
    suit: "自分で留学先を選びたい・4年で卒業したい人",
    caution: "「単位が認定される」と聞いて安心するのは危険。自分の専攻・大学のルールを必ず事前確認すること。",
  },
  {
    name: "休学留学",
    icon: "flight_takeoff",
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    cost: "高い",
    costDetail: "留学先の学費＋生活費（国立大は休学中授業料免除）",
    unit: "✕ 原則認定されない",
    graduation: "✕ 基本的に卒業が1年遅れる",
    freedom: "高（留学先・期間を自由に設計）",
    suit: "自分でゼロから留学を設計したい・現地インターンも経験したい人",
    caution: "卒業が遅れることと、単位が認定されないことを最初から覚悟した上で計画すること。",
  },
  {
    name: "短期留学",
    icon: "calendar_month",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    cost: "低〜中",
    costDetail: "2週間〜3ヶ月程度。渡航費込みで30〜150万円目安",
    unit: "✕ 基本的に認定されない",
    graduation: "◎ 夏休み・春休みを活用すれば影響なし",
    freedom: "高（語学学校・サマープログラム等を自由に選択）",
    suit: "まず海外を体験してみたい・語学力を短期集中で伸ばしたい1〜2年生",
    caution: "「留学した」実績にはなるが就活での訴求力はやや弱め。目的を明確にして臨むことが大切。",
  },
] as const;

const COST_TABLE = [
  { period: "2週間〜1ヶ月", us: "30〜80万円", uk: "40〜90万円", au: "25〜70万円", ca: "25〜70万円", ph: "10〜30万円", eu: "30〜80万円", kr: "15〜40万円", cn: "15〜40万円", sg: "35〜90万円" },
  { period: "3ヶ月", us: "100〜180万円", uk: "120〜200万円", au: "80〜150万円", ca: "80〜150万円", ph: "30〜70万円", eu: "80〜160万円", kr: "40〜90万円", cn: "40〜90万円", sg: "100〜180万円" },
  { period: "半年", us: "180〜320万円", uk: "200〜350万円", au: "150〜280万円", ca: "150〜280万円", ph: "60〜120万円", eu: "150〜280万円", kr: "80〜160万円", cn: "80〜160万円", sg: "180〜320万円" },
  { period: "1年", us: "350〜600万円", uk: "400〜650万円", au: "280〜500万円", ca: "280〜500万円", ph: "120〜220万円", eu: "250〜500万円", kr: "150〜300万円", cn: "150〜300万円", sg: "350〜600万円" },
] as const;

const TIMELINE = [
  { year: "1年生", icon: "search", color: "bg-primary", events: ["海外・留学への関心を育てる", "英語学習を本格的に開始（TOEIC・英会話）", "夏休みに短期留学（語学学校・サマープログラム）を体験", "どの種類の留学を目指すかを大まかに決める"] },
  { year: "2年生", icon: "edit_note", color: "bg-emerald-600", events: ["TOEFL・IELTSの準備を開始（交換・認定留学を目指す場合）", "大学の国際交流センターへ相談に行く", "GPAを意識して授業に取り組む（交換留学は学内選考あり）", "奨学金の情報収集を始める"] },
  { year: "3年前半", icon: "flight", color: "bg-accent", events: ["留学実行のベストタイミング（就活解禁前に帰国できる）", "交換・認定留学なら3年秋〜4年春が最も人気", "休学留学なら2年秋〜3年春が理想", "留学中も就活情報はこまめにチェック"] },
  { year: "3年後半〜4年", icon: "warning", color: "bg-amber-500", events: ["就活と重なるリスクが高い時期", "この時期の長期留学は相当な覚悟が必要", "3年秋以降に帰国するスケジュールは就活に影響が出やすい", "短期留学・サマープログラムは問題なし"] },
] as const;

const UNIVERSITY_LINKS = [
  { name: "東京大学", url: "https://www.u-tokyo.ac.jp/adm/go-global/ja/program-list-USTEP-list.html", note: "全学交換留学（USTEP）協定校一覧" },
  { name: "早稲田大学", url: "https://www.waseda.jp/inst/cie/from-waseda/abroad/programlist/list", note: "希望条件から協定校を検索できる" },
  { name: "慶應義塾大学", url: "https://www.ic.keio.ac.jp/keio_student/exchange/ex_partners.html", note: "派遣交換留学 協定校別募集要項" },
  { name: "京都大学", url: "https://www.kyoto-u.ac.jp/ja/education-campus/international/students/outbound", note: "派遣留学プログラム一覧" },
  { name: "大阪大学", url: "https://www.osaka-u.ac.jp/ja/international/outbound", note: "海外留学・国際交流プログラム" },
  { name: "東北大学", url: "https://www.tohoku.ac.jp/japanese/studentinfo/studyabroad/", note: "海外留学情報ページ" },
  { name: "名古屋大学", url: "https://nupace.nagoya-u.ac.jp/ja/", note: "NUPACE（全学交換留学）" },
  { name: "九州大学", url: "https://www.isc.kyushu-u.ac.jp/page/study_abroad", note: "海外留学プログラム一覧" },
  { name: "一橋大学", url: "https://www.hit-u.ac.jp/guide/abroad/", note: "海外留学・国際交流" },
  { name: "東京科学大学", url: "https://www.isee.titech.ac.jp/student/abroad.html", note: "海外留学プログラム" },
  { name: "上智大学", url: "https://www.sophia.ac.jp/jpn/student/intlexchange/outbound/", note: "留学プログラム・協定校一覧" },
  { name: "国際基督教大学（ICU）", url: "https://www.icu.ac.jp/academics/study_abroad/", note: "Study Abroad Programs" },
  { name: "北海道大学", url: "https://www.hokudai.ac.jp/bureau/international/outbound/", note: "海外留学支援" },
  { name: "立命館大学", url: "https://www.ritsumei.ac.jp/studyabroad/", note: "海外留学プログラム一覧" },
] as const;

const SCHOLARSHIPS = [
  { name: "JASSO海外留学支援制度", type: "給付型", amount: "月額3〜6万円", period: "留学期間中", url: "https://www.jasso.go.jp/ryugaku/tantosha/study_a/short_term_h/index.html", note: "国が運営する最大規模の留学奨学金" },
  { name: "トビタテ！留学JAPAN", type: "給付型", amount: "月額8〜15万円＋渡航費", period: "留学期間中", url: "https://tobitate-mext.jasso.go.jp/", note: "文部科学省のフラッグシップ奨学金。自由度が高い" },
  { name: "各大学独自の奨学金", type: "給付型・貸与型", amount: "大学による", period: "留学期間中", url: "", note: "在籍大学の国際交流センターに必ず確認" },
  { name: "東京都グローバル・パスポート", type: "給付型", amount: "最大150万円", period: "留学期間", url: "https://www.metro.tokyo.lg.jp/information/press/2025/09/2025090506", note: "東京都在住・在学の大学生対象。2026年度も募集予定" },
  { name: "民間財団系（柳井正財団等）", type: "給付型", amount: "学費全額〜数百万円", period: "留学期間", url: "", note: "高倍率だが金額が大きい。早めに情報収集を" },
] as const;

const FAQ_ITEMS = [
  { q: "留学すると就活に不利になりますか？", a: "近年はほとんど不利になりません。むしろ「なぜ留学したか・何を得たか」を自分の言葉で語れれば強いガクチカになります。問題になるのは就活解禁時期（3年秋〜4年春）に海外にいる場合。帰国タイミングを意識した計画が重要です。" },
  { q: "英語がほぼ話せなくても留学できますか？", a: "短期留学（語学学校）なら英語ゼロでも参加できます。交換・認定留学はTOEFL 80点・IELTS 6.0程度が目安のため、まず1〜2年生のうちに短期留学で英語力を鍛えてから長期を目指す流れが現実的です。" },
  { q: "交換留学と認定留学、どちらがおすすめですか？", a: "費用を抑えたい・GPAに自信があるなら交換留学。自分で留学先を選びたい・協定校に縛られたくないなら認定留学。どちらも「4年で卒業できる」という建前ですが、単位認定の条件が厳しく卒業が遅れるケースがあるため、必ず大学の国際交流センターに事前相談してください。" },
  { q: "留学中の生活費はどのくらいかかりますか？", a: "国・都市によって大きく異なります。フィリピンは月7〜10万円、東南アジア・韓国・中国は月8〜12万円、ヨーロッパ・カナダ・オーストラリアは月15〜20万円、アメリカ主要都市は月18〜25万円が目安です。留学前にアルバイトで貯蓄しておくことを強くおすすめします。" },
  { q: "留学エージェントは使うべきですか？", a: "初めての留学なら使うことをおすすめします。語学学校の選定・ビザ手続き・滞在先の手配など煩雑な作業をサポートしてくれます。無料カウンセリングを提供しているエージェントが多いので、まず相談だけしてみるのも良いでしょう。交換留学は大学が窓口になるためエージェントは不要です。" },
  { q: "NUSやシンガポール国立大学に留学できますか？", a: "可能です。シンガポール国立大学（NUS）は世界ランキング上位の名門大学で英語で授業を受けられます。ただし交換留学枠は非常に少なく競争が激しい。認定留学・私費留学という選択肢もあります。物価はやや高めですが治安が良く、アジア留学の中では人気の選択肢です。" },
] as const;



export default function StudyAbroadPage() {
  return (
    <div className="bg-white text-primary min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[1200px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-16">

        {/* パンくず */}
        <nav className="flex items-center gap-2 text-xs text-text-grey -mb-10">
          <Link href="/" className="hover:text-primary transition-colors">ホーム</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/guide" className="hover:text-primary transition-colors">新入生ガイド</Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-primary font-bold">留学どうする？</span>
        </nav>

        {/* Hero */}
        <section className="flex flex-col gap-6 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-2xl">flight</span>
            <span className="text-accent text-sm font-bold tracking-widest uppercase">Study Abroad Guide</span>
          </div>
          <h1 className="text-primary text-3xl md:text-5xl font-black leading-tight tracking-tight">
            留学、どうする？
          </h1>
          <p className="text-text-grey text-base md:text-lg leading-relaxed">
            交換・認定・休学留学の違い、費用の目安、いつ行くべきか、単位はどうなるか——
            大学生の留学に関する疑問をこのページ1枚でまとめて解決します。
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: "留学の4種類", href: "#types" },
              { label: "費用の目安", href: "#cost" },
              { label: "学年別タイムライン", href: "#timeline" },
              { label: "協定校を調べる", href: "#universities" },
              { label: "奨学金", href: "#scholarship" },
              { label: "留学先を診断", href: "#recommend" },
              { label: "FAQ", href: "#faq" },
            ].map(item => (
              <a key={item.href} href={item.href}
                className="text-xs px-3 py-1.5 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors font-bold">
                {item.label}
              </a>
            ))}
          </div>
        </section>

        {/* 重要注意ボックス */}
        <div className="border border-amber-200 bg-amber-50 p-5 flex gap-3">
          <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">warning</span>
          <div>
            <p className="text-amber-800 font-bold text-sm">「交換・認定留学なら卒業が遅れない」は半分ウソです</p>
            <p className="text-amber-700 text-xs leading-relaxed mt-1">
              制度上は4年で卒業できる建前ですが、<strong>単位認定の条件が大学・学部によって異なり、思ったより単位が認められないケースが頻発しています。</strong>
              留学を決める前に必ず在籍大学の国際交流センターに相談し、「何単位・どの科目が認定されるか」を確認してください。
            </p>
          </div>
        </div>

        {/* 留学の4種類 */}
        <section id="types" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">まず知るべき：留学の4種類と違い</h2>
            <p className="text-text-grey text-sm">種類によって費用・単位・卒業への影響が大きく異なります。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RYUGAKU_TYPES.map((type, i) => (
              <div key={i} className={`border ${type.border} p-5 flex flex-col gap-4`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${type.bg} flex items-center justify-center shrink-0`}>
                    <span className={`material-symbols-outlined text-xl ${type.color}`}>{type.icon}</span>
                  </div>
                  <h3 className="font-black text-primary text-lg">{type.name}</h3>
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  {[
                    { label: "費用", value: `${type.cost}（${type.costDetail}）` },
                    { label: "単位", value: type.unit },
                    { label: "卒業", value: type.graduation },
                    { label: "自由度", value: type.freedom },
                    { label: "向いている人", value: type.suit },
                  ].map(row => (
                    <div key={row.label} className="flex gap-2">
                      <span className="text-text-grey font-bold shrink-0 w-20">{row.label}</span>
                      <span className="text-text-grey leading-relaxed">{row.value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 px-3 py-2 text-xs text-text-grey leading-relaxed border-l-2 border-slate-300">
                  ⚠️ {type.caution}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 費用の目安 */}
        <section id="cost" className="flex flex-col gap-4 scroll-mt-20">
          <div className="flex flex-col gap-1">
            <h2 className="text-primary text-xl md:text-2xl font-black">費用の目安（渡航費・学費・生活費の合計）</h2>
            <p className="text-text-grey text-sm">語学学校＋学生寮を想定した目安です。交換留学は留学先授業料が免除されるためこれより安くなります。</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-[#f0f2f5] min-w-[700px]">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">期間</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">アメリカ</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">イギリス</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">オーストラリア</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">カナダ</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">フィリピン</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">欧州</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">韓国</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">中国</th>
                  <th className="px-3 py-3 text-left font-bold whitespace-nowrap">シンガポール</th>
                </tr>
              </thead>
              <tbody>
                {COST_TABLE.map((row, i) => (
                  <tr key={i} className={`border-t border-[#f0f2f5] ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-3 py-3 font-bold text-primary whitespace-nowrap">{row.period}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.us}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.uk}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.au}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.ca}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.ph}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.eu}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.kr}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.cn}</td>
                    <td className="px-3 py-3 text-text-grey whitespace-nowrap">{row.sg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-grey">※渡航費・保険料込みの概算。交換留学は留学先授業料が免除されるため実際の費用はより安い。為替レートにより変動します。</p>
        </section>

        {/* 学年別タイムライン */}
        <section id="timeline" className="flex flex-col gap-6 scroll-mt-20">
          <h2 className="text-primary text-xl md:text-2xl font-black">いつ行くべき？学年別タイムライン</h2>
          <div className="flex flex-col gap-0">
            {TIMELINE.map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-10 h-10 ${item.color} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-white text-sm">{item.icon}</span>
                  </div>
                  {i < TIMELINE.length - 1 && <div className="w-0.5 bg-slate-200 flex-1 my-1" />}
                </div>
                <div className="flex flex-col gap-2 pb-8 pt-2 flex-1">
                  <h3 className="font-black text-primary text-base">{item.year}</h3>
                  <ul className="flex flex-col gap-1">
                    {item.events.map((ev, j) => (
                      <li key={j} className="text-text-grey text-sm flex items-start gap-2">
                        <span className="text-accent shrink-0 mt-0.5">▸</span>
                        {ev}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 協定校リンク集 */}
        <section id="universities" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex flex-col gap-2">
            <h2 className="text-primary text-xl md:text-2xl font-black">大学別・交換留学 協定校を調べる</h2>
            <p className="text-text-grey text-sm leading-relaxed">
              各大学の公式ページで最新の協定校情報を確認できます。
              協定校は毎年更新されるため、必ず公式情報をご確認ください。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {UNIVERSITY_LINKS.map((univ) => (
              <a key={univ.name} href={univ.url} target="_blank" rel="noopener noreferrer"
                className="group border border-[#f0f2f5] hover:border-accent/40 hover:shadow-sm transition-all p-4 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-primary text-sm group-hover:text-accent transition-colors">{univ.name}</span>
                  <span className="text-text-grey text-xs">{univ.note}</span>
                </div>
                <span className="material-symbols-outlined text-text-grey text-sm shrink-0">open_in_new</span>
              </a>
            ))}
          </div>
          <div className="bg-primary/5 px-5 py-4 flex gap-3">
            <span className="material-symbols-outlined text-primary text-lg shrink-0 mt-0.5">info</span>
            <p className="text-sm text-primary leading-relaxed">
              上記以外の大学に在籍している場合は、大学名＋「交換留学 協定校」で検索するか、
              在籍大学の国際交流センター・留学センターに直接お問い合わせください。
            </p>
          </div>
        </section>

        {/* 奨学金 */}
        <section id="scholarship" className="flex flex-col gap-6 scroll-mt-20">
          <h2 className="text-primary text-xl md:text-2xl font-black">留学を支援する奨学金</h2>
          <div className="flex flex-col gap-3">
            {SCHOLARSHIPS.map((s, i) => (
              <div key={i} className="border border-[#f0f2f5] p-5 flex flex-col md:flex-row md:items-center gap-3 justify-between">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-primary text-sm">{s.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">{s.type}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-text-grey flex-wrap">
                    <span>金額：{s.amount}</span>
                    <span>期間：{s.period}</span>
                  </div>
                  <p className="text-xs text-text-grey">{s.note}</p>
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-accent text-xs font-bold hover:underline">
                    公式サイト<span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 留学先診断（アキネーター）への導線 */}
        <section id="recommend" className="flex flex-col gap-4 scroll-mt-20">
          <div style={{ backgroundColor: "#002b5c" }} className="p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl" style={{ color: "#8B0000" }}>psychology</span>
                <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>診断ツール</span>
              </div>
              <h2 className="font-black text-xl md:text-2xl" style={{ color: "#ffffff" }}>
                あなたに合った留学先を診断
              </h2>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                目的・期間・予算・英語力を選ぶだけで、最適な留学先をレコメンド。
                英語圏だけでなく欧州・アジア・中国・韓国・シンガポールも対象。
              </p>
            </div>
            <Link href="/guide/study-abroad/recommend"
              className="shrink-0 inline-flex items-center gap-2 bg-accent text-white hover:bg-[#600000] transition-colors px-8 py-4 font-black text-base whitespace-nowrap">
              診断してみる
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="flex flex-col gap-6 scroll-mt-20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-accent text-xl">help</span>
            <h2 className="text-primary text-xl md:text-2xl font-black">よくある質問</h2>
          </div>
          <FaqAccordion items={[...FAQ_ITEMS]} />
        </section>

        {/* 他のガイドへ */}
        <section className="border border-[#f0f2f5] p-6 flex flex-col gap-4">
          <h3 className="text-primary font-black text-base">他のガイドも読む</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/baito" className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors">
              <span className="material-symbols-outlined text-sm">work</span>バイト・インターンどうする？
            </Link>
            <Link href="/guide/circle" className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors">
              <span className="material-symbols-outlined text-sm">groups</span>サークルどうする？
            </Link>
            <Link href="/guide" className="flex items-center gap-2 px-4 py-2 border border-[#f0f2f5] hover:border-accent/40 text-sm font-bold text-primary hover:text-accent transition-colors">
              <span className="material-symbols-outlined text-sm">menu_book</span>新入生ガイド一覧へ
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}

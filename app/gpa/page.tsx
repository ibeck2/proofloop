import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/site-url";
import { UNIVERSITIES } from "@/lib/gpa/universities";
import GpaCalculatorClient from "./GpaCalculatorClient";

export const metadata: Metadata = {
  // 東大は全学でGPAを算出しておらず非対応のため、タイトルに含めない。
  // 検索結果に「東大対応」と読める文言を出すのは、この施策の前提である正確性に反する。
  title: "GPA計算機｜大学別の換算方式に対応（京大・阪大・早慶ほか） | ProofLoop",
  description:
    "大学ごとに異なるGPAの換算方式に対応したGPA計算機。評語とGPの対応は各大学の公式資料を出典として明示しています。単位数で加重した正確なGPAを、その場で計算できます。",
  keywords: [
    "GPA 計算",
    "GPA 計算機",
    "大学 GPA",
    "GPA 平均",
    "GPA 出し方",
    "交換留学 GPA",
  ],
  openGraph: {
    title: "GPA計算機｜大学別の換算方式に対応 | ProofLoop",
    description:
      "大学ごとに違うGPAの換算方式に対応。出典つきで正確に計算できるGPA計算機です。",
    url: `${SITE_URL}/gpa`,
  },
  alternates: { canonical: `${SITE_URL}/gpa` },
};

// ─────────────────────────────────────────────
// データ定数
// ─────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: "GPAはどうやって計算しますか？",
    answer:
      "科目ごとの成績をグレードポイント（GP）に換算し、単位数で加重した平均を取ります。式は「Σ（GP×単位数）÷ Σ単位数」です。単位数の大きい科目ほど、GPAへの影響が大きくなります。",
  },
  {
    question: "大学によってGPAの計算方法は違いますか？",
    answer:
      "違います。日本の大学では、評語（秀・優・良・可／S・A・B・C など）とグレードポイントの対応が大学ごとに定められており、素点からGPを算出する方式を採る大学もあります。満点も4.0とは限りません。そのためGPAの数値は、大学をまたいで単純に比較できません。",
  },
  {
    question: "不可（F）の科目もGPAに含まれますか？",
    answer:
      "多くの大学では、不可の科目もグレードポイント0として分母の単位数に算入されます。そのため単位を落とすとGPAは下がります。ただし扱いは大学によって異なるため、履修要項での確認をおすすめします。",
  },
  {
    question: "交換留学の出願にはどのくらいのGPAが必要ですか？",
    answer:
      "多くの大学の交換留学プログラムがGPAを出願要件に置いています。必要な水準は大学・派遣先によって異なるため、所属大学の国際交流課の募集要項を確認してください。GPAが要件に届いているかどうかは、留学先選びの出発点になります。",
  },
  {
    question: "東京大学が対応大学一覧にないのはなぜですか？",
    answer:
      "東京大学は、全学の公式な案内で「東京大学ではGPAを算出していません」と明示しています。全学共通のGP換算表そのものが存在しないため、推測で計算方式を作らず、対応大学一覧から外しています。学部・研究科によっては独自に成績指標を用いる場合があるため、必要な場合は所属先の教務窓口にご確認ください。",
  },
  {
    question: "この計算機の換算方式はどこから取っていますか？",
    answer:
      "各大学の公式サイトに掲載されている履修要項・成績評価に関する規程を出典としています。大学を選ぶと、参照した出典URLと確認日が画面に表示されます。出典が確認できなかった大学は一覧に含めず、一般的な方式で計算する扱いにしています。",
  },
];

export default function GpaPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "GPA計算機（大学別換算方式対応）",
    url: `${SITE_URL}/gpa`,
    applicationCategory: "EducationalApplication",
    operatingSystem: "All",
    offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
  };

  return (
    <div className="bg-white text-primary min-h-screen font-body pb-20 md:pb-0">
      <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-20">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />

        <h1 className="font-display text-3xl font-bold text-primary sm:text-4xl">
          GPA計算機｜大学別の換算方式に対応
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-grey">
          日本の大学は、成績評語とグレードポイントの対応が大学ごとに定められています。
          このGPA計算機は、各大学の公式資料を出典として換算方式を登録しており、
          単位数で加重した正確なGPAを計算できます。
          入力した成績はサーバーに保存されません。
        </p>

        <div className="mt-10">
          <GpaCalculatorClient />
        </div>

        {/* ── 解説：換算方式が大学ごとに違う理由 ───────── */}
        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold text-primary">
            なぜ大学ごとにGPAの計算方法が違うのか
          </h2>
          <p className="mt-4 leading-relaxed text-text-grey">
            GPA（Grade Point Average）は、履修した科目の成績をグレードポイントに換算し、
            単位数で加重平均した指標です。ただし日本の大学では、この「換算」の基準が
            全国で統一されていません。各大学が学則や成績評価に関する規程で独自に定めています。
          </p>
          <p className="mt-4 leading-relaxed text-text-grey">
            違いは主に3点に表れます。第一に、評語の表記（秀・優・良・可／S・A・B・C など）。
            第二に、評語に対応するグレードポイントの値。第三に、素点から直接グレードポイントを
            算出する方式を採る大学が存在すること。さらに、満点が4.0の大学もあれば、それ以外の大学もあります。
          </p>
          <p className="mt-4 leading-relaxed text-text-grey">
            このため、一般的なGPA計算ツールが用いる固定の換算表では、自分の大学の正確なGPAは求められません。
            この計算機が大学の選択を求めているのは、この差を吸収するためです。
          </p>
        </section>

        {/* ── 対応大学と出典 ───────────────────── */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-primary">
            対応している大学と出典
          </h2>
          <p className="mt-4 leading-relaxed text-text-grey">
            以下の大学については、公式サイトに掲載された履修要項・成績評価に関する規程を確認し、
            その内容にもとづいて換算方式を登録しています。出典が確認できなかった大学は
            一覧に含めず、一般的な方式で計算する扱いにしています。
          </p>

          {UNIVERSITIES.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-grey text-left">
                    <th className="py-3 pr-4 font-display text-primary">大学</th>
                    <th className="py-3 pr-4 font-display text-primary">出典</th>
                    <th className="py-3 font-display text-primary">確認日</th>
                  </tr>
                </thead>
                <tbody>
                  {UNIVERSITIES.map((university) => (
                    <tr key={university.id} className="border-b border-border-grey">
                      <td className="py-3 pr-4 text-primary">{university.name}</td>
                      <td className="py-3 pr-4">
                        <a
                          href={university.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent underline"
                        >
                          公式資料
                        </a>
                      </td>
                      <td className="py-3 text-text-grey">{university.verifiedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-6 border-l-4 border-accent bg-neutral-light p-4 text-sm text-text-grey">
              現在、出典を確認済みの大学はありません。一般的な換算方式で計算しています。
            </p>
          )}

          <p className="mt-4 text-sm leading-relaxed text-text-grey">
            なお <strong className="text-primary">東京大学</strong> は、全学の公式な案内で
            「東京大学ではGPAを算出していません」と明示しており、全学共通のGP換算表そのものが存在しません。
            推測で計算方式を作ることはしない方針のため、対応大学一覧には含めていません。
          </p>

          <p className="mt-4 text-xs text-text-grey">
            各大学の制度は改定されることがあります。正確な取り扱いは、必ず所属大学の最新の履修要項をご確認ください。
            学部により方式が異なる大学、および公式資料に記載のない点がある大学については、大学を選択した際に注意書きを表示しています。
          </p>
        </section>

        {/* ── FAQ ───────────────────────────── */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-primary">よくある質問</h2>
          <dl className="mt-6 space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="border-l-4 border-primary pl-4">
                <dt className="font-display text-base font-bold text-primary">
                  {item.question}
                </dt>
                <dd className="mt-2 leading-relaxed text-text-grey">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── 関連ページ ───────────────────────── */}
        <section className="mt-12 border-t border-border-grey pt-8">
          <h2 className="font-display text-xl font-bold text-primary">関連ページ</h2>
          <ul className="mt-4 space-y-3">
            <li>
              <Link href="/guide/credits" className="text-accent underline">
                単位どうする？履修・GPA・卒業要件で失敗しないための完全ガイド
              </Link>
            </li>
            <li>
              <Link href="/guide/study-abroad" className="text-accent underline">
                留学どうする？交換留学の選び方と出願の進め方
              </Link>
            </li>
            <li>
              <Link href="/guide" className="text-accent underline">
                大学生活ガイド（トップ）
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}

import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  // ── タイトル ──────────────────────────────────────
  // 末尾に「| ProofLoop」を付けない。app/layout.tsx が
  // title.template = "%s | ProofLoop" を持っており自動で付与されるため、
  // ここに書くと「… | ProofLoop | ProofLoop」と二重になる。
  // （openGraph.title / twitter.title にはテンプレートが効かないので、
  //   そちらは「| ProofLoop」を明示したままで正しい）
  title: "大学生におすすめのバイトは？タイプ別の選び方・平均月収・年収の壁まで",

  // ── description ───────────────────────────────────
  description:
    "大学生におすすめのバイトをタイプ別に解説。塾講師・在宅・カフェ・単発など種類ごとの時給目安と両立しやすさ、平均月収、2025年改正後の年収の壁（扶養・いくらまで）まで、授業やサークルと両立できるバイト選びをProofLoopが大学生目線でまとめました。",

  // ── キーワード ────────────────────────────────────
  keywords: [
    "大学生 バイト おすすめ",
    "大学生 バイト",
    "大学生 バイト 平均月収",
    "在宅バイト 大学生",
    "塾講師 バイト 大学生",
    "大学生 バイト 扶養",
    "大学生 バイト いくらまで",
    "サークル 両立 バイト",
    "大学生 インターン",
  ],

  // ── OGP（SNSシェア・Slack・LINE等） ────────────────
  openGraph: {
    type: "website",
    url: `${SITE_URL}/baito`,
    siteName: "ProofLoop",
    title: "大学生におすすめのバイトは？タイプ別の選び方・平均月収・年収の壁まで | ProofLoop",
    description:
      "塾講師・在宅・カフェ・単発など、大学生におすすめのバイトをタイプ別に解説。平均月収や2025年改正後の年収の壁まで、両立できるバイト選びを大学生目線でまとめました。",
    locale: "ja_JP",
    // OGP画像は用意できたら差し替えてください
    // images: [
    //   {
    //     url: `${SITE_URL}/og/baito.png`,
    //     width: 1200,
    //     height: 630,
    //     alt: "ProofLoop バイト・インターン",
    //   },
    // ],
  },

  // ── Twitter Card ──────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "大学生におすすめのバイトは？タイプ別の選び方・平均月収・年収の壁まで | ProofLoop",
    description:
      "塾講師・在宅・カフェ・単発など、大学生におすすめのバイトをタイプ別に解説。平均月収・年収の壁まで大学生目線でまとめました。",
    // images: [`${SITE_URL}/og/baito.png`],
  },

  // ── canonical URL ─────────────────────────────────
  alternates: {
    canonical: `${SITE_URL}/baito`,
  },

  // ── robots ───────────────────────────────────────
  robots: {
    index: true,
    follow: true,
  },
};

export default function BaitoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

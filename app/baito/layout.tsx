import type { Metadata } from "next";

const SITE_URL = "https://proofloop-green.vercel.app";

export const metadata: Metadata = {
  // ── タイトル ──────────────────────────────────────
  title: "バイト・インターンどうする？大学生向け厳選求人 | ProofLoop",

  // ── description ───────────────────────────────────
  description:
    "授業・サークルと両立できるバイト・インターンをProofLoopが大学生目線で厳選。103万円の壁の解説、バイト選びの4つの軸など新入生に役立つ情報も満載。",

  // ── キーワード ────────────────────────────────────
  keywords: [
    "大学生 バイト",
    "大学生 インターン",
    "バイト 選び方",
    "サークル 両立 バイト",
    "103万円 壁 大学生",
    "新入生 バイト おすすめ",
    "未経験 バイト 大学生",
    "大学生 インターン 探し方",
  ],

  // ── OGP（SNSシェア・Slack・LINE等） ────────────────
  openGraph: {
    type: "website",
    url: `${SITE_URL}/baito`,
    siteName: "ProofLoop",
    title: "バイト・インターンどうする？大学生向け厳選求人 | ProofLoop",
    description:
      "授業・サークルと両立できるバイト・インターンをProofLoopが大学生目線で厳選。103万円の壁の解説、バイト選びの4つの軸など新入生に役立つ情報も満載。",
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
    title: "バイト・インターンどうする？大学生向け厳選求人 | ProofLoop",
    description:
      "授業・サークルと両立できるバイト・インターンをProofLoopが大学生目線で厳選。新入生に役立つ情報も満載。",
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

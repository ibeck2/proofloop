import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "新入生ガイド | バイト・就活・留学・単位・サークル",
  description:
    "大学入学後にぶつかる疑問をProofLoopがまとめて解決。バイトの選び方・就活の始め方・留学の手続き・単位の取り方・サークル選びまで、新入生向けガイドを網羅。",
  keywords: ["新入生 大学", "大学生 バイト", "就活 いつから", "大学 留学", "単位 取り方", "サークル 選び方"],
  openGraph: {
    title: "新入生ガイド | ProofLoop",
    description: "大学生活でぶつかる疑問をまとめて解決。バイト・就活・留学・単位・サークルのガイドを網羅。",
    url: "https://proofloop-green.vercel.app/guide",
  },
  alternates: {
    canonical: "https://proofloop-green.vercel.app/guide",
  },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}


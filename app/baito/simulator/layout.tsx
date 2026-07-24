import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  // ここは「| ProofLoop」を明示する。親の app/baito/layout.tsx が
  // title を文字列で上書きしており、その時点で app/layout.tsx の
  // title.template = "%s | ProofLoop" が打ち消されるため、
  // 子孫には自動付与されない（/guide 配下と同じ事情）。
  title: "大学生活シミュレーター｜バイト時間から収入と生活バランスを試算 | ProofLoop",
  description:
    "週に何時間バイトすると、月いくら稼げて、学業やサークルにどれだけ時間が残るのか。3つの質問に答えるだけで、大学生活の時間とお金のバランスをその場で試算できます。",
  keywords: [
    "大学生 バイト 何時間",
    "大学生 バイト 月収",
    "大学生 時間の使い方",
    "バイト 学業 両立",
    "大学生活 シミュレーター",
  ],
  openGraph: {
    type: "website",
    url: `${SITE_URL}/baito/simulator`,
    siteName: "ProofLoop",
    title: "大学生活シミュレーター｜バイト時間から収入と生活バランスを試算 | ProofLoop",
    description:
      "3つの質問に答えるだけ。週のバイト時間から、月の収入と学業・サークルに残る時間を試算します。",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "大学生活シミュレーター｜バイト時間から収入と生活バランスを試算 | ProofLoop",
    description:
      "3つの質問に答えるだけ。週のバイト時間から、月の収入と学業・サークルに残る時間を試算します。",
  },
  alternates: { canonical: `${SITE_URL}/baito/simulator` },
};

export default function SimulatorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

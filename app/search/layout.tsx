import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  // 末尾に「| ProofLoop」を付けない。app/layout.tsx が
  // title.template = "%s | ProofLoop" を持っており自動で付与されるため、
  // ここに書くと「… | ProofLoop | ProofLoop」と二重になる。
  // （openGraph.title にはテンプレートが効かないので、そちらは明示する）
  title: "サークル・学生団体を探す",
  description:
    "全国の大学のサークル・学生団体を、大学名や分野から検索できます。掲載しているのは運営が承認した団体のみ。各団体のページから活動内容や公式SNSを確認できます。",
  openGraph: {
    type: "website",
    url: `${SITE_URL}/search`,
    siteName: "ProofLoop",
    title: "サークル・学生団体を探す | ProofLoop",
    description:
      "全国の大学のサークル・学生団体を大学名や分野から検索。承認済みの団体だけを掲載しています。",
    locale: "ja_JP",
  },
  alternates: { canonical: `${SITE_URL}/search` },
};

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

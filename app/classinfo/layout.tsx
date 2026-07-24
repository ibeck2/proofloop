import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  // 末尾に「| ProofLoop」を付けない。app/layout.tsx が
  // title.template = "%s | ProofLoop" を持っており自動で付与されるため、
  // ここに書くと「… | ProofLoop | ProofLoop」と二重になる。
  // （openGraph.title にはテンプレートが効かないので、そちらは明示する）
  title: "授業レビューと過去問",
  description:
    "履修登録の前に、実際に受けた学生の評価を確認できます。授業のレビューと過去問を大学生同士で共有するためのページです。",
  openGraph: {
    type: "website",
    url: `${SITE_URL}/classinfo`,
    siteName: "ProofLoop",
    title: "授業レビューと過去問 | ProofLoop",
    description:
      "履修登録の前に、実際に受けた学生の評価を確認。授業レビューと過去問を大学生同士で共有できます。",
    locale: "ja_JP",
  },
  alternates: { canonical: `${SITE_URL}/classinfo` },
};

export default function ClassInfoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

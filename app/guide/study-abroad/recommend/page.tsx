import type { Metadata } from "next";
import StudyAbroadRecommendClient from "./StudyAbroadRecommendClient";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "留学先診断 | ProofLoop",
  description: "目的・予算・期間から留学先をレコメンドする診断ツール。",
  openGraph: {
    title: "留学先診断 | ProofLoop",
    description: "目的・期間・予算・英語力から留学先を診断します。",
    url: `${SITE_URL}/guide/study-abroad/recommend`,
  },
  alternates: { canonical: `${SITE_URL}/guide/study-abroad/recommend` },
};

export default function StudyAbroadRecommendPage() {
  return <StudyAbroadRecommendClient />;
}

import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { PRIVACY } from "@/lib/legal/documents";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: PRIVACY.title,
  description: PRIVACY.description,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: {
    title: PRIVACY.title,
    description: PRIVACY.description,
    url: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return <LegalDocumentView doc={PRIVACY} />;
}

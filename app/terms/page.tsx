import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { TERMS } from "@/lib/legal/documents";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: TERMS.title,
  description: TERMS.description,
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title: TERMS.title,
    description: TERMS.description,
    url: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return <LegalDocumentView doc={TERMS} />;
}

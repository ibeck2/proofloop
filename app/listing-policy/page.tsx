import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { LISTING_POLICY } from "@/lib/legal/documents";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: LISTING_POLICY.title,
  description: LISTING_POLICY.description,
  alternates: { canonical: `${SITE_URL}/listing-policy` },
  openGraph: {
    title: LISTING_POLICY.title,
    description: LISTING_POLICY.description,
    url: `${SITE_URL}/listing-policy`,
  },
};

export default function ListingPolicyPage() {
  return <LegalDocumentView doc={LISTING_POLICY} />;
}

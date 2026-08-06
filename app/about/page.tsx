import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ABOUT } from "@/lib/legal/documents";
import { COMPANY } from "@/lib/legal/company";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: ABOUT.title,
  description: ABOUT.description,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: ABOUT.title,
    description: ABOUT.description,
    url: `${SITE_URL}/about`,
  },
};

const COMPANY_ROWS = [
  { label: "サービス名", value: COMPANY.serviceName },
  { label: "運営会社", value: COMPANY.legalName },
  { label: "代表者", value: COMPANY.representative },
  { label: "所在地", value: `〒${COMPANY.postalCode} ${COMPANY.address}` },
  { label: "お問い合わせ", value: COMPANY.contactEmail },
];

export default function AboutPage() {
  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[820px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-12">
        <nav className="flex items-center gap-2 text-xs text-graphite -mb-6">
          <Link href="/" className="hover:text-ink transition-colors">
            ホーム
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-ink font-bold">{ABOUT.title}</span>
        </nav>

        <header className="flex flex-col gap-4">
          <h1 className="text-ink text-2xl md:text-4xl font-black leading-tight tracking-tight font-mincho">
            {ABOUT.title}
          </h1>
          {ABOUT.intro.map((text, i) => (
            <p key={i} className="text-graphite text-sm md:text-base leading-relaxed">
              {text}
            </p>
          ))}
        </header>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-rule">
            <tbody className="text-graphite">
              {COMPANY_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-rule first:border-t-0">
                  <th className="px-4 py-3 text-left font-bold text-ink bg-mist whitespace-nowrap align-top w-40">
                    {row.label}
                  </th>
                  <td className="px-4 py-3 leading-relaxed">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-10">
          {ABOUT.clauses.map((clause) => (
            <section key={clause.heading} className="flex flex-col gap-3">
              <h2 className="text-ink text-lg font-black font-mincho">{clause.heading}</h2>
              {clause.paragraphs?.map((text, i) => (
                <p key={i} className="text-graphite text-sm leading-relaxed">
                  {text}
                </p>
              ))}
              {clause.list && (
                <ul className="flex flex-col gap-2 list-disc pl-5">
                  {clause.list.map((item, i) => (
                    <li key={i} className="text-graphite text-sm leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

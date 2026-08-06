import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { LegalDocument } from "@/lib/legal/documents";
import { COMPANY } from "@/lib/legal/company";
import { PROCESSORS } from "@/lib/legal/processors";

/** 2026-08-06 → 2026年8月6日 */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}年${Number(m)}月${Number(d)}日`;
}

export default function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <div className="bg-paper text-ink min-h-screen font-body pb-20 md:pb-0">
      <main className="w-full max-w-[820px] mx-auto px-6 py-12 md:py-20 flex flex-col gap-12">
        <nav className="flex items-center gap-2 text-xs text-graphite -mb-6">
          <Link href="/" className="hover:text-ink transition-colors">
            ホーム
          </Link>
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
          <span className="text-ink font-bold">{doc.title}</span>
        </nav>

        <header className="flex flex-col gap-4">
          <h1 className="text-ink text-2xl md:text-4xl font-black leading-tight tracking-tight font-mincho">
            {doc.title}
          </h1>
          {doc.intro.map((text, i) => (
            <p key={i} className="text-graphite text-sm md:text-base leading-relaxed">
              {text}
            </p>
          ))}
        </header>

        <div className="flex flex-col gap-10">
          {doc.clauses.map((clause) => (
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
              {/* 外部委託先の表は、それを出すと宣言した文書の該当条項の直後に置く */}
              {doc.showsProcessors && clause.heading.startsWith("5.") && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-sm border border-rule">
                    <thead className="bg-mist">
                      <tr>
                        <th className="px-4 py-2 text-left font-bold text-ink">サービス</th>
                        <th className="px-4 py-2 text-left font-bold text-ink">利用目的</th>
                        <th className="px-4 py-2 text-left font-bold text-ink whitespace-nowrap">
                          所在国
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-graphite">
                      {PROCESSORS.map((p) => (
                        <tr key={p.name} className="border-t border-rule">
                          <td className="px-4 py-2 leading-snug">{p.name}</td>
                          <td className="px-4 py-2 leading-snug">
                            {p.role}
                            {p.note && <span className="block text-xs mt-1">※{p.note}</span>}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">{p.country}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        <footer className="border-t border-rule pt-6 flex flex-col gap-1">
          <p className="text-xs text-graphite">最終改定日：{formatDate(doc.revisedAt)}</p>
          <p className="text-xs text-graphite">{COMPANY.legalName}</p>
        </footer>
      </main>
    </div>
  );
}

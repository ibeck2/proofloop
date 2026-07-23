import Link from "next/link";
import { ExternalLink } from "lucide-react";

const GUIDE_LINKS = [
  { href: "/gpa", label: "GPA計算機" },
  { href: "/guide/credits", label: "単位・授業" },
  { href: "/guide/money", label: "お金・奨学金" },
  { href: "/guide/living-alone", label: "一人暮らし" },
  { href: "/baito", label: "バイト・インターン" },
  { href: "/guide/study-abroad", label: "留学" },
  { href: "/guide/circle", label: "サークル" },
];

// /for-students リンクは該当ページが存在しないため削除（404）。ページ実装時にここで復活させる。
const ABOUT_LINKS = [
  { href: "/for-clubs", label: "学生団体の方へ" },
];

const CONTACT_URL =
  "https://proofloop.jp/organizations/4003e084-8da8-4315-b0dc-3dcce3da42d0";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-paper mt-20">
      <div className="max-w-[1100px] mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center">
              <span className="font-numeric font-black tracking-[-0.03em] text-xl">
                ProofLoop
              </span>
            </Link>
            <p className="text-paper/70 text-sm mt-4 leading-relaxed font-body">
              見えていなかった学生の力を、記録して、可視にする。
            </p>
          </div>

          <div>
            <h2 className="font-body font-bold text-sm mb-4 text-paper">大学生活ガイド</h2>
            <ul className="space-y-2.5 text-sm font-body">
              {GUIDE_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-paper/70 hover:text-paper transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-body font-bold text-sm mb-4 text-paper">ProofLoopについて</h2>
            <ul className="space-y-2.5 text-sm font-body">
              {ABOUT_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-paper/70 hover:text-paper transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-body font-bold text-sm mb-4 text-paper">お問い合わせ</h2>
            <a
              href={CONTACT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-paper/70 hover:text-paper transition-colors text-sm font-body"
            >
              運営事務局
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-paper/15">
          <p className="text-xs text-paper/50 font-body">
            © {year} ProofLoop
          </p>
        </div>
      </div>
    </footer>
  );
}

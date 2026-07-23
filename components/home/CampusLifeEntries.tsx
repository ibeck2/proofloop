import Link from "next/link";
import { ChevronRight } from "lucide-react";

const ENTRIES = [
  { href: "/gpa", label: "GPA計算機", note: "大学別の基準で計算する" },
  { href: "/guide/credits", label: "単位・授業", note: "履修とGPAの基本" },
  { href: "/guide/money", label: "お金・奨学金", note: "奨学金の種類と生活費" },
  { href: "/guide/living-alone", label: "一人暮らし", note: "家賃と生活の組み立て方" },
  { href: "/baito", label: "バイト・インターン", note: "授業と両立できる働き方" },
  { href: "/guide/study-abroad", label: "留学", note: "種類・費用・時期から考える" },
];

export default function CampusLifeEntries() {
  return (
    <section aria-labelledby="campus-life-heading" className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2
            id="campus-life-heading"
            className="font-mincho font-bold text-ink text-2xl md:text-3xl"
          >
            大学生活の疑問も、ここで解く
          </h2>
          <p className="font-body text-sm text-graphite">
            単位・お金・住まい・働き方。調べものから入っても構いません。
          </p>
        </div>
        <Link
          href="/guide"
          className="font-body text-sm text-ink shrink-0 hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          ガイド一覧
        </Link>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-rule border border-rule">
        {ENTRIES.map((entry) => (
          <li key={entry.href} className="bg-paper">
            <Link
              href={entry.href}
              className="group flex items-center gap-4 p-5 h-full hover:bg-mist transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              <div className="flex flex-col gap-1">
                <span className="font-body text-base text-ink group-hover:underline underline-offset-4">
                  {entry.label}
                </span>
                <span className="font-body text-xs text-graphite/70">{entry.note}</span>
              </div>
              <ChevronRight
                className="w-4 h-4 ml-auto shrink-0 text-rule group-hover:text-ink transition-colors"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

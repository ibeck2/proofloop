import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { UniversityCount } from "@/lib/home/homeData";

type Props = { universityCounts: UniversityCount[] };

export default function DirectoryPreview({ universityCounts }: Props) {
  if (universityCounts.length === 0) return null;

  return (
    <section aria-labelledby="directory-heading" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h2
          id="directory-heading"
          className="font-mincho font-bold text-ink text-2xl md:text-3xl"
        >
          大学から探す
        </h2>
        <p className="font-body text-sm text-graphite">
          学生団体を大学別に掲載しています。所属団体の多い順。
        </p>
      </div>

      <ul className="border-t border-rule">
        {universityCounts.map((item) => (
          <li key={item.university} className="border-b border-rule">
            <Link
              href={`/search?university=${encodeURIComponent(item.university)}`}
              className="group flex items-center gap-4 py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <span className="font-body text-sm md:text-base text-ink group-hover:underline underline-offset-4">
                {item.university}
              </span>
              <span className="ml-auto font-numeric tabular-nums text-sm text-graphite/70">
                {item.count.toLocaleString("ja-JP")}
                <span className="sr-only">件</span>
              </span>
              <ChevronRight
                className="w-4 h-4 shrink-0 text-rule group-hover:text-ink transition-colors"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

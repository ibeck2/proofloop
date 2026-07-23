import Link from "next/link";
import type { CategoryCount } from "@/lib/home/homeData";

type Props = { categories: CategoryCount[] };

export default function CategoryEntries({ categories }: Props) {
  if (categories.length === 0) return null;

  return (
    <section aria-labelledby="category-heading" className="flex flex-col gap-5">
      <h2
        id="category-heading"
        className="font-mincho font-bold text-ink text-2xl md:text-3xl"
      >
        分野から探す
      </h2>

      <ul className="grid grid-cols-2 md:grid-cols-4 gap-px bg-rule border border-rule">
        {categories.map((item) => (
          <li key={item.category} className="bg-paper">
            <Link
              href={`/search?category=${encodeURIComponent(item.category)}`}
              className="flex flex-col gap-1 p-5 h-full hover:bg-mist transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
            >
              <span className="font-numeric tabular-nums text-2xl text-ink font-bold">
                {item.count.toLocaleString("ja-JP")}
                <span className="sr-only">件</span>
              </span>
              <span className="font-body text-sm text-graphite">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

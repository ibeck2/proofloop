import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HeroOrg } from "@/lib/home/heroOrganizations";
import type { FieldCluster } from "@/lib/home/organizationField";
import OrganizationField from "./OrganizationField";

type Props = {
  organizations: HeroOrg[];
  totalOrganizations: number;
  universityCount: number;
  field: FieldCluster[];
};

export default function Hero({
  organizations,
  totalOrganizations,
  universityCount,
  field,
}: Props) {
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <div className="flex flex-col gap-5 md:gap-6">
        <h1 className="font-mincho font-bold text-ink text-[1.75rem] leading-[1.45] md:text-[2.75rem] md:leading-[1.4] tracking-tight">
          全ての大学生・学生団体の
          <br />
          ポテンシャルを引き出す。
        </h1>
        <p className="font-body text-sm md:text-base text-graphite leading-relaxed max-w-[42rem]">
          全国の学生団体を、大学と分野から探せます。単位・お金・住まいのガイドや、GPA計算機・留学先診断などのツールも揃えました。
          団体を運営する側には、メンバー管理・新歓・イベント・タスクの機能があります。
        </p>
      </div>

      {organizations.length > 0 && (
        <ul className="border-t border-rule">
          {organizations.map((org, index) => (
            <li
              key={org.id}
              className="pl-surface border-b border-rule"
              style={{ animationDelay: `${index * 220}ms` }}
            >
              <Link
                href={`/organizations/${org.id}`}
                className="group flex items-center gap-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <span className="font-body text-xs md:text-sm text-graphite/70 w-24 md:w-32 shrink-0">
                  {org.university}
                </span>
                <span className="font-body text-sm md:text-base text-ink group-hover:underline underline-offset-4">
                  {org.name}
                </span>
                <ChevronRight
                  className="w-4 h-4 ml-auto shrink-0 text-rule group-hover:text-ink transition-colors"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalOrganizations > 0 && (
        <div className="flex flex-col gap-5">
          <p className="font-body text-sm text-graphite">
            <span className="font-numeric tabular-nums text-ink font-bold">
              {universityCount}
            </span>
            大学{" "}
            <span className="font-numeric tabular-nums text-ink font-bold">
              {totalOrganizations.toLocaleString("ja-JP")}
            </span>
            団体を掲載しています。
          </p>
          <OrganizationField
            clusters={field}
            totalOrganizations={totalOrganizations}
          />
        </div>
      )}

      <form action="/search" method="get" className="flex border border-ink">
        <label htmlFor="hero-search" className="sr-only">
          大学名・団体名で探す
        </label>
        <input
          id="hero-search"
          name="q"
          type="search"
          placeholder="大学名・団体名で探す"
          className="flex-1 min-w-0 px-4 py-3 font-body text-base text-graphite placeholder:text-graphite/70 bg-paper focus:bg-mist focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-ink"
        />
        <button
          type="submit"
          className="bg-ink text-paper px-6 py-3 font-body font-bold text-sm shrink-0 hover:bg-ink/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          探す
        </button>
      </form>
    </section>
  );
}

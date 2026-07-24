// components/guide/ResourceGroupList.tsx
"use client";

import { ExternalLink } from "lucide-react";
import type { ResourceGroupData } from "@/lib/guide/resources";
import { resourceLinkAttrs } from "@/lib/guide/resourceLink";
import { trackAffiliateClick } from "@/lib/analytics/affiliateClick";

export function ResourceGroupList({
  groups,
  page,
}: {
  groups: ResourceGroupData[];
  page: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <div key={group.id} className="border border-rule bg-paper p-5 flex flex-col gap-3">
          <h3 className="text-ink font-bold text-base">{group.heading}</h3>
          <ul className="flex flex-col gap-2">
            {group.links.map((link) => {
              const attrs = resourceLinkAttrs(link.kind);
              return (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target={attrs.target}
                    rel={attrs.rel}
                    onClick={
                      attrs.isAd
                        ? () =>
                            trackAffiliateClick({
                              page,
                              advertiser: link.advertiser ?? "unknown",
                              position: group.id,
                            })
                        : undefined
                    }
                    className="flex items-center gap-1.5 text-sm text-ink hover:underline"
                  >
                    <span>{link.label}</span>
                    {attrs.isAd && (
                      <span className="text-[10px] text-graphite border border-rule px-1 py-0.5">
                        ※広告
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-graphite" aria-hidden="true" />
                  </a>
                  {link.note && (
                    <span className="block text-xs text-graphite mt-0.5">{link.note}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

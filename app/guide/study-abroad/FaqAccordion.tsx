"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FaqItemProps = { q: string; a: string };

function FaqItem({ q, a }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-rule last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-bold text-ink text-sm leading-snug">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-graphite shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <p className="text-graphite text-sm leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
}

export default function FaqAccordion({ items }: { items: FaqItemProps[] }) {
  return (
    <div className="border border-rule px-6">
      {items.map((item, i) => (
        <FaqItem key={i} q={item.q} a={item.a} />
      ))}
    </div>
  );
}

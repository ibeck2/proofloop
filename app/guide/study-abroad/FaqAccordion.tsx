"use client";

import { useState } from "react";

type FaqItemProps = { q: string; a: string };

function FaqItem({ q, a }: FaqItemProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#f0f2f5] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="font-bold text-primary text-sm leading-snug">{q}</span>
        <span
          className="material-symbols-outlined text-text-grey shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <p className="text-text-grey text-sm leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
}

export default function FaqAccordion({ items }: { items: FaqItemProps[] }) {
  return (
    <div className="border border-[#f0f2f5] px-6">
      {items.map((item, i) => (
        <FaqItem key={i} q={item.q} a={item.a} />
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

const FAQ = [
  {
    q: "How long does personalisation take?",
    a: "Most orders leave our studio within a few business days. You’ll see firmer timelines at checkout once we know your pincode.",
  },
  {
    q: "Do you ship across India?",
    a: "Yes — we ship pan-India. Free shipping applies on qualifying cart totals as shown in the announcement bar.",
  },
  {
    q: "Can I pay with COD?",
    a: "Where available, COD is offered at checkout together with UPI and cards.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / FAQ
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">FAQ</h1>
      <div className="space-y-2">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)]">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-medium text-[var(--brand-ink)]"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                {item.q}
                <span className="text-[var(--brand-muted)]" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-[var(--brand-border)] px-4 py-3 text-sm text-[var(--brand-muted)]">
                  {item.a}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

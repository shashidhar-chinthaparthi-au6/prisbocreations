"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

const OPTIONS: { value: string; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "popular", label: "Most popular" },
  { value: "name_asc", label: "Name: A to Z" },
];

export function ProductsSortBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("sort") ?? "relevance";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  function applySort(next: string) {
    const p = new URLSearchParams(sp.toString());
    p.set("sort", next);
    startTransition(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
    setSheetOpen(false);
  }

  const label = OPTIONS.find((o) => o.value === current)?.label ?? "Sort";

  return (
    <>
      <label className="hidden items-center gap-2 text-sm text-[var(--brand-muted)] lg:flex">
        <span className="whitespace-nowrap">Sort</span>
        <select
          className="min-h-11 rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-[var(--brand-ink)]"
          value={current}
          aria-label="Sort products"
          onChange={(e) => {
            const next = new URLSearchParams(sp.toString());
            next.set("sort", e.target.value);
            startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
          }}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="w-full lg:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-11 w-full items-center justify-between rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-left text-sm text-[var(--brand-ink)]"
          aria-label="Sort products"
        >
          <span className="text-[var(--brand-muted)]">Sort</span>
          <span className="font-medium">{label}</span>
        </button>
      </div>

      {sheetOpen ? (
        <div className="fixed inset-0 z-[235] lg:hidden" role="dialog" aria-modal="true" aria-label="Sort by">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl">
            <p className="text-sm font-semibold text-[var(--brand-ink)]">Sort by</p>
            <ul className="mt-3 space-y-1">
              {OPTIONS.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => applySort(o.value)}
                    className={`flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm ${
                      current === o.value ? "bg-[var(--brand-amber-light)] font-semibold text-[var(--brand-ink)]" : "text-[var(--brand-muted)]"
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}

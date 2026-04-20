"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

type Cat = { slug: string; name: string };

export function ProductsMobileFilters({
  categories,
  sort,
  q,
  priceMin,
  priceMax,
  inStockOnly,
  activeCount,
}: {
  categories: Cat[];
  sort: string;
  q?: string;
  priceMin?: number;
  priceMax?: number;
  inStockOnly: boolean;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const swipe = useSwipeToClose(() => setOpen(false), "down", 80);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const formId = "products-mobile-filters-form";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--brand-border)] bg-white px-4 text-sm font-semibold text-[var(--brand-ink)] shadow-sm lg:hidden"
      >
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[230] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[92vh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-[#E8E0D6]"
            {...swipe}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-[var(--brand-ink)]">Filters</h2>
              <button
                type="button"
                className="flex h-11 min-w-[44px] items-center justify-center rounded-full text-xl text-[var(--brand-muted)]"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
              <p className="text-sm font-semibold text-[var(--brand-ink)]">Category</p>
              <ul className="mt-2 space-y-2 text-sm text-[var(--brand-muted)]">
                <li>
                  <Link href="/products" className="hover:text-[var(--brand-amber-dark)]" onClick={() => setOpen(false)}>
                    All
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/products?category=${encodeURIComponent(c.slug)}`}
                      className="hover:text-[var(--brand-amber-dark)]"
                      onClick={() => setOpen(false)}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm font-semibold text-[var(--brand-ink)]">Price (₹)</p>
              <form id={formId} method="get" action="/products" className="mt-3 space-y-3 text-sm">
                <input type="hidden" name="sort" value={sort} />
                {q ? <input type="hidden" name="q" value={q} /> : null}
                <div className="flex gap-2">
                  <input
                    name="price_min"
                    type="number"
                    inputMode="decimal"
                    placeholder="Min"
                    defaultValue={priceMin ?? ""}
                    className="min-h-12 w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-base"
                  />
                  <input
                    name="price_max"
                    type="number"
                    inputMode="decimal"
                    placeholder="Max"
                    defaultValue={priceMax ?? ""}
                    className="min-h-12 w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-base"
                  />
                </div>
                <label className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" name="in_stock" value="true" defaultChecked={inStockOnly} />
                  In stock only
                </label>
              </form>
            </div>
            <div className="shrink-0 border-t border-[var(--brand-border)] bg-white p-4">
              <button type="submit" form={formId} className="btn-primary w-full min-h-12" onClick={() => setOpen(false)}>
                Apply{activeCount > 0 ? ` (${activeCount})` : ""}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Row = { slug: string; name: string; count: number };

type Props = {
  categorySlug: string;
  subcategories: Row[];
  totalCount: number;
};

export function SubcategoryPills({ categorySlug, subcategories, totalCount }: Props) {
  const sp = useSearchParams();
  const active =
    sp.get("sub") || sp.get("subcategory") || "";

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <Link
        href={`/category/${categorySlug}`}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
          !active
            ? "bg-[var(--brand-ink)] text-white"
            : "border border-[var(--brand-border)] bg-white text-[var(--brand-ink)] hover:border-[var(--brand-border-dark)]"
        }`}
      >
        All ({totalCount})
      </Link>
      {subcategories.map((s) => {
        const on = active === s.slug;
        const href = `/category/${categorySlug}?sub=${encodeURIComponent(s.slug)}`;
        return (
          <Link
            key={s.slug}
            href={href}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              on
                ? "bg-[var(--brand-ink)] text-white"
                : "border border-[var(--brand-border)] bg-white text-[var(--brand-ink)] hover:border-[var(--brand-border-dark)]"
            }`}
          >
            {s.name} ({s.count})
          </Link>
        );
      })}
    </div>
  );
}

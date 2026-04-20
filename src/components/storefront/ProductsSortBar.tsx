"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

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

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--brand-muted)]">
      <span className="whitespace-nowrap">Sort</span>
      <select
        className="min-h-11 rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-[var(--brand-ink)]"
        value={current}
        aria-label="Sort products"
        onChange={(e) => {
          const next = new URLSearchParams(sp.toString());
          next.set("sort", e.target.value);
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

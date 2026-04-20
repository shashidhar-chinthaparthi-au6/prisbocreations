"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useListingFilters } from "@/hooks/useListingFilters";

type CatRow = { slug: string; name: string };

type Props = {
  categories: CatRow[];
  subcategories?: CatRow[];
};

export function ActiveFilterPills({ categories, subcategories }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setFilters, clearAll } = useListingFilters();
  const [, startTransition] = useTransition();

  const catBySlug = useMemo(
    () => new Map(categories.map((c) => [c.slug, c.name])),
    [categories],
  );
  const subBySlug = useMemo(
    () => new Map((subcategories ?? []).map((c) => [c.slug, c.name])),
    [subcategories],
  );

  const pills = useMemo(() => {
    const out: { key: string; label: string; onRemove: () => void }[] = [];
    const cats = searchParams.getAll("category");
    for (const slug of cats) {
      const name = catBySlug.get(slug) ?? slug;
      out.push({
        key: `category:${slug}`,
        label: name,
        onRemove: () => {
          const p = new URLSearchParams(searchParams.toString());
          p.delete("category");
          for (const c of cats) {
            if (c !== slug) p.append("category", c);
          }
          p.delete("page");
          p.delete("subcategory");
          p.delete("sub");
          startTransition(() => {
            router.push(`${pathname}?${p.toString()}`, { scroll: false });
          });
        },
      });
    }
    const sub = searchParams.get("subcategory") || searchParams.get("sub");
    if (sub) {
      out.push({
        key: "subcategory",
        label: subBySlug.get(sub) ?? sub,
        onRemove: () => setFilters({ subcategory: null, sub: null }),
      });
    }
    const pmin = searchParams.get("price_min");
    const pmax = searchParams.get("price_max");
    if ((pmin != null && pmin !== "") || (pmax != null && pmax !== "")) {
      out.push({
        key: "price",
        label: `₹${pmin || "0"} – ₹${pmax || "5000"}`,
        onRemove: () => setFilters({ price_min: null, price_max: null }),
      });
    }
    const occ = searchParams.get("occasion");
    if (occ) {
      out.push({
        key: "occasion",
        label: `Occasion: ${occ}`,
        onRemove: () => setFilters({ occasion: null }),
      });
    }
    const mat = searchParams.get("material");
    if (mat) {
      out.push({
        key: "material",
        label: `Material: ${mat}`,
        onRemove: () => setFilters({ material: null }),
      });
    }
    if (searchParams.get("in_stock") === "false") {
      out.push({
        key: "in_stock",
        label: "Including out of stock",
        onRemove: () => setFilters({ in_stock: null }),
      });
    }
    if (searchParams.get("rating") === "4") {
      out.push({
        key: "rating",
        label: "4★ & up",
        onRemove: () => setFilters({ rating: null }),
      });
    }
    const q = searchParams.get("q");
    if (q) {
      out.push({
        key: "q",
        label: `Search: ${q}`,
        onRemove: () => setFilters({ q: null }),
      });
    }
    return out;
  }, [catBySlug, pathname, router, searchParams, setFilters, subBySlug]);

  if (pills.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-[5px] px-[10px] py-1.5 md:mb-4 md:px-3.5 md:py-2">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1 rounded-[20px] bg-[var(--aml)] px-2 py-0.5 text-[9px] font-medium text-[var(--amd)] md:text-[11px] md:px-2.5"
        >
          {pill.label}
          <button
            type="button"
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
            aria-label={`Remove ${pill.label}`}
            onClick={pill.onRemove}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden className="text-[var(--amd)]">
              <path
                d="M1 1L7 7M7 1L1 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-auto text-[11px] font-medium text-[var(--am)] underline"
      >
        Clear all
      </button>
    </div>
  );
}

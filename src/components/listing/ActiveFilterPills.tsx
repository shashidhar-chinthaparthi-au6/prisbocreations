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
    const inRaw = searchParams.get("in_stock");
    if (inRaw === "true" || inRaw === "1") {
      out.push({
        key: "in_stock",
        label: "In stock only",
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
    <div className="mb-3 flex flex-wrap items-center gap-2 px-0 py-1.5 md:mb-4 md:py-2 lg:gap-2.5">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--aml)] py-0.5 pl-2.5 pr-1 text-[9px] font-medium text-[var(--amd)] sm:text-[11px] sm:pl-3 sm:pr-1.5 lg:py-1 lg:pl-3.5 lg:pr-2 lg:text-sm"
        >
          <span className="min-w-0 truncate">{pill.label}</span>
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-black/5 sm:h-6 sm:w-6"
            aria-label={`Remove ${pill.label}`}
            onClick={pill.onRemove}
          >
            <svg width="9" height="9" viewBox="0 0 8 8" aria-hidden className="text-[var(--amd)] sm:w-[10px] sm:h-[10px]">
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
        className="ml-auto min-h-9 text-[11px] font-medium text-[var(--am)] underline sm:text-sm lg:min-h-10"
      >
        Clear all
      </button>
    </div>
  );
}

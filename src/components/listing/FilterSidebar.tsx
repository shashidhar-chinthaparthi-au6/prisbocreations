"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import { useListingFilters } from "@/hooks/useListingFilters";
import { FilterSection } from "@/components/listing/FilterSection";
import { PriceRangeSlider } from "@/components/listing/PriceRangeSlider";

export type CategoryRow = { slug: string; name: string; count: number };
export type Facets = { occasions: string[]; materials: string[] };

type Props = {
  mode: "all" | "category";
  categories: CategoryRow[];
  subcategories: CategoryRow[];
  facets: Facets;
};

function useFilterActive() {
  const sp = useSearchParams();
  return useMemo(() => {
    if (sp.getAll("category").length) return true;
    if (sp.get("subcategory") || sp.get("sub")) return true;
    if (sp.get("price_min") || sp.get("price_max")) return true;
    if (sp.get("occasion")) return true;
    if (sp.get("material")) return true;
    if (sp.get("in_stock") === "false") return true;
    if (sp.get("rating") === "4") return true;
    if (sp.get("q")) return true;
    return false;
  }, [sp]);
}

export function FilterSidebar({ mode, categories, subcategories, facets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setFilters } = useListingFilters();
  const [, startTransition] = useTransition();
  const anyActive = useFilterActive();

  const selectedCats = searchParams.getAll("category");
  const singleCategory = selectedCats.length === 1 ? selectedCats[0] : null;
  const activeSubSlug = searchParams.get("subcategory") || searchParams.get("sub");

  function toggleCategory(slug: string, checked: boolean) {
    const p = new URLSearchParams(searchParams.toString());
    const cur = p.getAll("category");
    p.delete("category");
    const next = checked ? [...cur.filter((c) => c !== slug), slug] : cur.filter((c) => c !== slug);
    for (const c of next) p.append("category", c);
    p.delete("page");
    if (!next.includes(slug) || next.length !== 1) {
      p.delete("subcategory");
      p.delete("sub");
    }
    startTransition(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  function toggleSubcategory(slug: string | null) {
    setFilters({ subcategory: slug, sub: null });
  }

  const inStockChecked = searchParams.get("in_stock") !== "false";
  const ratingChecked = searchParams.get("rating") === "4";

  return (
    <aside className="filter-sidebar">
      <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--muted)] md:text-[11px]">
        Filters
      </h2>

      {anyActive ? (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
          className="mb-3 block w-full text-center text-[11px] text-[var(--am)] underline"
        >
          Clear all
        </button>
      ) : null}

      {mode === "all" ? (
        <FilterSection title="Category">
          <ul className="space-y-1">
            {categories.map((c) => (
              <li key={c.slug}>
                <label className="flex cursor-pointer items-start gap-1.5 text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(c.slug)}
                    onChange={(e) => toggleCategory(c.slug, e.target.checked)}
                    className="mt-0.5 h-3 w-3 shrink-0 rounded border-[var(--bdd)] accent-[var(--am)]"
                  />
                  <span className="min-w-0 flex-1 text-[10px] leading-snug md:text-xs" title={c.name}>
                    <span className="block truncate md:whitespace-normal md:break-words">{c.name}</span>
                  </span>
                  <span className="shrink-0 text-[9px] tabular-nums text-[var(--muted)]">({c.count})</span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>
      ) : null}

      {(mode === "category" || Boolean(singleCategory)) && subcategories.length > 0 ? (
        <FilterSection title="Subcategory">
          <ul className="space-y-1">
            {subcategories.map((s) => (
              <li key={s.slug}>
                <label className="flex cursor-pointer items-start gap-1.5 text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={activeSubSlug === s.slug}
                    onChange={(e) => toggleSubcategory(e.target.checked ? s.slug : null)}
                    className="mt-0.5 h-3 w-3 shrink-0 rounded border-[var(--bdd)] accent-[var(--am)]"
                  />
                  <span className="min-w-0 flex-1 truncate text-[10px] md:text-xs" title={s.name}>
                    {s.name}{" "}
                    <span className="text-[9px] tabular-nums">({s.count})</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>
      ) : null}

      <FilterSection title="Price range">
        <PriceRangeSlider />
      </FilterSection>

      {facets.occasions.length ? (
        <FilterSection title="Occasion">
          <ul className="space-y-1">
            {facets.occasions.map((o) => (
              <li key={o}>
                <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--muted)] md:text-xs">
                  <input
                    type="checkbox"
                    checked={searchParams.get("occasion") === o}
                    onChange={(e) => setFilters({ occasion: e.target.checked ? o : null })}
                    className="h-3 w-3 shrink-0 rounded border-[var(--bdd)] accent-[var(--am)]"
                  />
                  <span className="truncate" title={o}>
                    {o}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>
      ) : null}

      {facets.materials.length ? (
        <FilterSection title="Material">
          <ul className="space-y-1">
            {facets.materials.map((m) => (
              <li key={m}>
                <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--muted)] md:text-xs">
                  <input
                    type="checkbox"
                    checked={searchParams.get("material") === m}
                    onChange={(e) => setFilters({ material: e.target.checked ? m : null })}
                    className="h-3 w-3 shrink-0 rounded border-[var(--bdd)] accent-[var(--am)]"
                  />
                  <span className="truncate" title={m}>
                    {m}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>
      ) : null}

      <FilterSection title="Availability">
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--muted)] md:text-xs">
          <input
            type="checkbox"
            checked={inStockChecked}
            onChange={(e) => setFilters({ in_stock: e.target.checked ? null : "false" })}
            className="h-3 w-3 shrink-0 rounded border-[var(--bdd)] accent-[var(--am)]"
          />
          <span className="md:hidden">In stock</span>
          <span className="hidden md:inline">In stock only</span>
        </label>
      </FilterSection>

      <FilterSection title="Rating">
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-[var(--muted)] md:text-xs">
          <input
            type="checkbox"
            checked={ratingChecked}
            onChange={(e) => setFilters({ rating: e.target.checked ? "4" : null })}
            className="h-3 w-3 shrink-0 rounded border-[var(--bdd)] accent-[var(--am)]"
          />
          <span className="md:hidden">4★+</span>
          <span className="hidden md:inline">4★ and above</span>
        </label>
      </FilterSection>

      <p className="mt-2 text-center text-[10px] text-[var(--muted)] md:mt-3">
        <Link href="/products" className="font-medium text-[var(--am)] hover:underline">
          Browse all products
        </Link>
      </p>
    </aside>
  );
}

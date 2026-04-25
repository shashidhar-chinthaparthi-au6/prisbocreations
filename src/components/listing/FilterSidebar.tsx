"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLayoutEffect, useMemo, useState, useTransition } from "react";
import { useListingFilters } from "@/hooks/useListingFilters";
import { FilterSection } from "@/components/listing/FilterSection";
import { PriceRangeSlider } from "@/components/listing/PriceRangeSlider";

function FilterSlidersIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M2 14h4M10 8h4M18 16h4" />
    </svg>
  );
}

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
    if (sp.get("in_stock") === "true" || sp.get("in_stock") === "1") return true;
    if (sp.get("rating") === "4") return true;
    if (sp.get("q")) return true;
    return false;
  }, [sp]);
}

function useActiveFilterCount() {
  const sp = useSearchParams();
  return useMemo(() => {
    let n = sp.getAll("category").length;
    if (sp.get("subcategory") || sp.get("sub")) n += 1;
    if (sp.get("price_min") || sp.get("price_max")) n += 1;
    if (sp.get("occasion")) n += 1;
    if (sp.get("material")) n += 1;
    if (sp.get("in_stock") === "true" || sp.get("in_stock") === "1") n += 1;
    if (sp.get("rating") === "4") n += 1;
    if (sp.get("q")) n += 1;
    return n;
  }, [sp]);
}

export function FilterSidebar({ mode, categories, subcategories, facets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setFilters } = useListingFilters();
  const [, startTransition] = useTransition();
  const anyActive = useFilterActive();
  const activeCount = useActiveFilterCount();

  const [isLg, setIsLg] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      const wide = mq.matches;
      setIsLg(wide);
      if (wide) {
        setMobileOpen(true);
      } else {
        setMobileOpen(false);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const showFilterBody = isLg || mobileOpen;

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

  const inStockRaw = searchParams.get("in_stock");
  const inStockChecked = inStockRaw === "true" || inStockRaw === "1";
  const ratingChecked = searchParams.get("rating") === "4";

  const checkBoxBase =
    "shrink-0 rounded border-[var(--bdd)] accent-[var(--am)] h-3.5 w-3.5 sm:h-4 sm:w-4";
  const checkRowStart = `mt-0.5 ${checkBoxBase} lg:mt-1`;
  const checkRowCenter = checkBoxBase;
  const labelTextCls = "min-w-0 flex-1 text-[10px] leading-snug sm:text-xs lg:text-[13px] lg:leading-5";
  const rowCls = "flex cursor-pointer items-start gap-2.5 text-[var(--muted)] sm:items-center lg:gap-3";

  const asideClass =
    "filter-sidebar" +
    (!isLg && !showFilterBody ?
      " max-lg:!border-0 max-lg:!bg-transparent max-lg:!p-1 max-lg:!shadow-none"
    : "");

  return (
    <aside className={asideClass} aria-label="Filters">
      {/* Mobile / tablet: collapsed filter trigger (full-width card, left accent) */}
      {!isLg ? (
        <button
          type="button"
          aria-expanded={showFilterBody}
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-xl border border-[var(--brand-border)] border-l-[4px] border-l-[#C47A2B] bg-gradient-to-r from-[#FDF5EB] to-white px-4 py-3.5 text-left shadow-sm transition hover:border-[#C47A2B] lg:hidden"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#C47A2B] shadow-sm ring-1 ring-[#E8E0D6]">
            <FilterSlidersIcon className="shrink-0" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-semibold leading-tight text-[var(--ink)]">Filters</span>
          </span>
          {activeCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[#C47A2B] px-2 py-0.5 text-center text-xs font-bold tabular-nums text-white">
              {activeCount}
            </span>
          ) : null}
          <span
            className={`shrink-0 text-[#6B6560] transition-transform ${showFilterBody ? "rotate-180" : ""}`}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      ) : null}

      {showFilterBody ? (
        <div className={isLg ? "contents" : "mt-3 border-t border-[var(--bd)] pt-3"}>
          {anyActive ? (
            <button
              type="button"
              onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
              className="mb-3 w-full rounded-lg border border-[var(--bd)] bg-[var(--sf)] py-1.5 text-center text-[11px] font-medium text-[var(--amd)] transition hover:border-[var(--am)] hover:bg-[var(--aml)] sm:text-xs lg:mb-4 lg:py-2"
            >
              Clear all
            </button>
          ) : null}

          {/** key remount: inner sections start closed on mobile (`defaultOpen={false}`) and open on `lg` */}
          <div key={isLg ? "filters-lg" : "filters-sm"}>
            {mode === "all" ? (
              <FilterSection defaultOpen={isLg} title="Category">
          <ul className="space-y-1.5 sm:space-y-2">
            {categories.map((c) => (
              <li key={c.slug}>
                <label className={rowCls}>
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(c.slug)}
                    onChange={(e) => toggleCategory(c.slug, e.target.checked)}
                    className={checkRowStart}
                  />
                  <span className={labelTextCls} title={c.name}>
                    <span className="block truncate lg:whitespace-normal lg:break-words">{c.name}</span>
                  </span>
                  <span className="shrink-0 text-[9px] tabular-nums text-[var(--muted)] sm:text-[10px] lg:text-xs">
                    ({c.count})
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </FilterSection>
      ) : null}

            {(mode === "category" || Boolean(singleCategory)) && subcategories.length > 0 ? (
              <FilterSection defaultOpen={isLg} title="Subcategory">
          <ul className="space-y-1.5 sm:space-y-2">
            {subcategories.map((s) => (
              <li key={s.slug}>
                <label className={rowCls}>
                  <input
                    type="checkbox"
                    checked={activeSubSlug === s.slug}
                    onChange={(e) => toggleSubcategory(e.target.checked ? s.slug : null)}
                    className={checkRowStart}
                  />
                  <span className={`min-w-0 flex-1 lg:whitespace-normal ${labelTextCls}`} title={s.name}>
                    {s.name}{" "}
                    <span className="text-[9px] tabular-nums sm:text-[10px] lg:text-xs">({s.count})</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
              </FilterSection>
            ) : null}

            <FilterSection defaultOpen={isLg} title="Price range">
              <PriceRangeSlider />
            </FilterSection>

            {facets.occasions.length ? (
              <FilterSection defaultOpen={isLg} title="Occasion">
          <ul className="space-y-1.5 sm:space-y-2">
            {facets.occasions.map((o) => (
              <li key={o}>
                <label className={`${rowCls} items-center`}>
                  <input
                    type="checkbox"
                    checked={searchParams.get("occasion") === o}
                    onChange={(e) => setFilters({ occasion: e.target.checked ? o : null })}
                    className={checkRowCenter}
                  />
                  <span className={`truncate ${labelTextCls}`} title={o}>
                    {o}
                  </span>
                </label>
              </li>
            ))}
          </ul>
              </FilterSection>
            ) : null}

            {facets.materials.length ? (
              <FilterSection defaultOpen={isLg} title="Material">
          <ul className="space-y-1.5 sm:space-y-2">
            {facets.materials.map((m) => (
              <li key={m}>
                <label className={`${rowCls} items-center`}>
                  <input
                    type="checkbox"
                    checked={searchParams.get("material") === m}
                    onChange={(e) => setFilters({ material: e.target.checked ? m : null })}
                    className={checkRowCenter}
                  />
                  <span className={`truncate ${labelTextCls}`} title={m}>
                    {m}
                  </span>
                </label>
              </li>
            ))}
          </ul>
              </FilterSection>
            ) : null}

            <FilterSection defaultOpen={isLg} title="Availability">
              <label className={`${rowCls} items-center`}>
                <input
                  type="checkbox"
                  checked={inStockChecked}
                  onChange={(e) => setFilters({ in_stock: e.target.checked ? "true" : null })}
                  className={checkRowCenter}
                />
                <span className="text-[10px] leading-snug text-[var(--muted)] sm:text-xs lg:text-[13px] lg:leading-5">
                  <span className="md:hidden">In stock</span>
                  <span className="hidden md:inline">In stock only</span>
                </span>
              </label>
            </FilterSection>

            <FilterSection defaultOpen={isLg} title="Rating">
              <label className={`${rowCls} items-center`}>
                <input
                  type="checkbox"
                  checked={ratingChecked}
                  onChange={(e) => setFilters({ rating: e.target.checked ? "4" : null })}
                  className={checkRowCenter}
                />
                <span className="text-[10px] leading-snug text-[var(--muted)] sm:text-xs lg:text-[13px] lg:leading-5">
                  <span className="md:hidden">4★+</span>
                  <span className="hidden md:inline">4★ and above</span>
                </span>
              </label>
            </FilterSection>
          </div>

          <p className="mt-2 text-center text-[10px] text-[var(--muted)] sm:text-xs lg:mt-3 lg:text-sm">
            <Link href="/products" className="font-medium text-[var(--am)] hover:underline">
              Browse all products
            </Link>
          </p>
        </div>
      ) : null}
    </aside>
  );
}

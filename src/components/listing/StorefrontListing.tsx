"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductsSortBar } from "@/components/storefront/ProductsSortBar";
import { ActiveFilterPills } from "@/components/listing/ActiveFilterPills";
import { FilterSidebar, type CategoryRow, type Facets } from "@/components/listing/FilterSidebar";
import { ListingLayout } from "@/components/listing/ListingLayout";
import { StoreEmptyState } from "@/components/ui/StoreEmptyState";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

type Initial = {
  items: StorefrontProductCard[];
  total: number;
  page: number;
  pageSize: number;
};

type Props = {
  initial: Initial;
  categories: CategoryRow[];
  categoryLabelRows: { slug: string; name: string }[];
  subcategories: CategoryRow[];
  facets: Facets;
  mode: "all" | "category";
  title: string;
  subtitle?: string;
  /** When false, the page already has its own hero and this listing starts at the pills. */
  intro?: boolean;
  forcedCategorySlug?: string;
  forcedSubcategorySlug?: string;
  /** When set, all product fetches include `recipient` (shop-by-recipient collection). */
  forcedRecipient?: string;
};

function buildFetchQuery(
  sp: URLSearchParams,
  forcedCategorySlug?: string,
  forcedSubcategorySlug?: string,
  forcedRecipient?: string,
): string {
  const p = new URLSearchParams(sp.toString());
  p.set("limit", "24");
  if (forcedCategorySlug) p.set("category", forcedCategorySlug);
  if (forcedSubcategorySlug) {
    p.set("subcategory", forcedSubcategorySlug);
    p.delete("sub");
  }
  if (forcedRecipient) p.set("recipient", forcedRecipient);
  return p.toString();
}

function CategoryPills({
  categories,
  mode,
  forcedCategorySlug,
}: {
  categories: CategoryRow[];
  mode: "all" | "category";
  forcedCategorySlug?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const selected = sp.getAll("category");
  const allActive = mode === "all" ? selected.length === 0 : false;

  function selectCategory(slug: string | null) {
    if (mode === "category") {
      router.push(slug ? `/category/${slug}` : "/products", { scroll: false });
      return;
    }
    const p = new URLSearchParams(sp.toString());
    p.delete("category");
    p.delete("subcategory");
    p.delete("sub");
    p.delete("page");
    if (slug) p.append("category", slug);
    const q = p.toString();
    router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  const pill =
    "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[14px] transition-colors";

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => selectCategory(null)}
        className={`${pill} ${
          allActive
            ? "bg-[#1c1612] text-[#f7f4ee]"
            : "px-2 text-[#1c1612]/70 hover:text-[#1c1612]"
        }`}
      >
        All pieces
      </button>
      {categories.map((c) => {
        const active =
          mode === "category" ? forcedCategorySlug === c.slug : selected.length === 1 && selected[0] === c.slug;
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => selectCategory(active ? null : c.slug)}
            className={`${pill} ${
              active
                ? "bg-[#1c1612] text-[#f7f4ee]"
                : "px-2 text-[#1c1612]/70 hover:text-[#1c1612]"
            }`}
          >
            {c.name}
          </button>
        );
      })}
      <Link href="/products" className="sr-only">
        All products
      </Link>
    </div>
  );
}

export function StorefrontListing({
  initial,
  categories,
  categoryLabelRows,
  subcategories,
  facets,
  mode,
  title,
  subtitle,
  intro = true,
  forcedCategorySlug,
  forcedSubcategorySlug,
  forcedRecipient,
}: Props) {
  const sp = useSearchParams();
  const [extra, setExtra] = useState<StorefrontProductCard[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const key = sp.toString();
  useEffect(() => {
    setExtra([]);
  }, [key, initial.page, initial.total]);

  const merged = useMemo(() => [...initial.items, ...extra], [initial.items, extra]);

  const hasMore = merged.length < initial.total;

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = buildFetchQuery(sp, forcedCategorySlug, forcedSubcategorySlug, forcedRecipient);
      const r = await fetch(`/api/products?${q}&skip=${merged.length}&limit=12&page=1`);
      const j = (await r.json()) as {
        ok?: boolean;
        data?: { items?: StorefrontProductCard[] };
      };
      const add = j.data?.items ?? [];
      setExtra((e) => [...e, ...add]);
    } finally {
      setLoadingMore(false);
    }
  }, [forcedCategorySlug, forcedSubcategorySlug, forcedRecipient, hasMore, loadingMore, merged.length, sp]);

  const sidebar = (
    <FilterSidebar mode={mode} categories={categories} subcategories={subcategories} facets={facets} />
  );

  const pieceLabel = `${initial.total} ${initial.total === 1 ? "piece" : "pieces"}`;

  return (
    <div>
      <header className="px-1 sm:px-2">
        {intro ? (
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="font-display text-[40px] font-medium leading-[0.95] tracking-[-0.03em] text-[#1c1612] md:text-[56px]">
                {title === "All products" ? (
                  <>
                    Find your <span className="font-normal italic text-[#c17a3a]">favourite.</span>
                  </>
                ) : (
                  title
                )}
              </h1>
              <p className="mt-3 max-w-[42ch] text-[15px] text-[#1c1612]/55">
                {subtitle ?? "Easy-to-love essentials. Made a little more yours."}
              </p>
            </div>
            <Link
              href="/bulk"
              className="hidden shrink-0 pt-3 text-[13px] text-[#1c1612]/70 transition hover:text-[#1c1612] md:inline-flex md:items-center md:gap-1"
            >
              Need something custom? <span aria-hidden>↗</span>
            </Link>
          </div>
        ) : null}

        <div className={`${intro ? "mt-8" : ""} flex items-center gap-4 border-b border-[#e6e1d8] pb-3`}>
          <div className="min-w-0 flex-1">
            <CategoryPills categories={categories} mode={mode} forcedCategorySlug={forcedCategorySlug} />
          </div>
          <p className="relative z-10 shrink-0 bg-[#f9f8f4] pl-3 text-[13px] tabular-nums text-[#1c1612]/45">
            {pieceLabel}
          </p>
        </div>
      </header>

    <ListingLayout
      sidebar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">{sidebar}</div>
          <div className="shrink-0 sm:pt-0.5">
            <ProductsSortBar />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 px-1 py-2 sm:px-2">

        <ActiveFilterPills
          categories={categoryLabelRows}
          subcategories={subcategories.map((s) => ({ slug: s.slug, name: s.name }))}
        />

        {merged.length === 0 ? (
          <StoreEmptyState
            className="bg-[var(--brand-card)]"
            illustration="search"
            title="No products found"
            description="Try adjusting your filters."
            primary={{
              label: "Clear filters",
              href:
                forcedRecipient ?
                  `/for/${forcedRecipient}`
                : mode === "category" && forcedCategorySlug ?
                  `/category/${forcedCategorySlug}`
                : "/products",
            }}
            secondary={{ label: "Browse all", href: "/products" }}
          />
        ) : (
          <>
            <div className="product-grid">
              {merged.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
            {hasMore ? (
              <div className="mt-8 flex justify-center md:mt-10">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="btn-secondary min-h-10 px-6 text-xs md:min-h-11 md:text-sm"
                >
                  {loadingMore ? "Loading…" : "Load 12 more"}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </ListingLayout>
    </div>
  );
}

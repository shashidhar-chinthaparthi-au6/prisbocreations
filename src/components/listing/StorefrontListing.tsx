"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ActiveFilterPills } from "@/components/listing/ActiveFilterPills";
import { FilterSidebar, type CategoryRow, type Facets } from "@/components/listing/FilterSidebar";
import { ListingLayout } from "@/components/listing/ListingLayout";
import { ListingTopbar } from "@/components/listing/ListingTopbar";
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
  forcedCategorySlug?: string;
  forcedSubcategorySlug?: string;
};

function buildFetchQuery(
  sp: URLSearchParams,
  forcedCategorySlug?: string,
  forcedSubcategorySlug?: string,
): string {
  const p = new URLSearchParams(sp.toString());
  p.set("limit", "24");
  if (forcedCategorySlug) p.set("category", forcedCategorySlug);
  if (forcedSubcategorySlug) {
    p.set("subcategory", forcedSubcategorySlug);
    p.delete("sub");
  }
  return p.toString();
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
  forcedCategorySlug,
  forcedSubcategorySlug,
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
      const q = buildFetchQuery(sp, forcedCategorySlug, forcedSubcategorySlug);
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
  }, [forcedCategorySlug, forcedSubcategorySlug, hasMore, loadingMore, merged.length, sp]);

  const sidebar = (
    <FilterSidebar mode={mode} categories={categories} subcategories={subcategories} facets={facets} />
  );

  return (
    <ListingLayout sidebar={sidebar}>
      <div className="px-2 py-1 sm:px-3 md:px-4 lg:px-5">
        <nav className="text-[11px] text-[var(--muted)]">
          <Link href="/" className="hover:text-[var(--amd)]">
            Home
          </Link>
          <span className="mx-1">›</span>
          {mode === "category" && forcedCategorySlug ? (
            <>
              <Link href="/products" className="hover:text-[var(--amd)]">
                All products
              </Link>
              <span className="mx-1">›</span>
              <span className="text-[var(--ink)]">{title}</span>
            </>
          ) : (
            <span className="text-[var(--ink)]">All products</span>
          )}
        </nav>

        <div className="mt-3">
          <ListingTopbar title={title} subtitle={subtitle} showing={merged.length} total={initial.total} />
        </div>

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
              href: mode === "category" && forcedCategorySlug ? `/category/${forcedCategorySlug}` : "/products",
            }}
            secondary={{ label: "Browse all", href: "/products" }}
          />
        ) : (
          <>
            <div className="product-grid">
              {merged.map((p) => (
                <ProductCard key={p.id} product={p} />
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
  );
}

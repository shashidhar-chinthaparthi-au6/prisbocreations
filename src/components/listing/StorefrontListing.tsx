"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductsSortBar } from "@/components/storefront/ProductsSortBar";
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
    "inline-flex shrink-0 items-center rounded-full px-3.5 py-1.5 text-[13px] transition-colors";

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={() => selectCategory(null)}
        className={`${pill} ${
          allActive
            ? "bg-[var(--brand-ink)] text-[#f6f1e8]"
            : "text-[var(--brand-ink)]/70 hover:text-[var(--brand-ink)]"
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
                ? "bg-[var(--brand-ink)] text-[#f6f1e8]"
                : "text-[var(--brand-ink)]/70 hover:text-[var(--brand-ink)]"
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

  return (
    <ListingLayout sidebar={sidebar}>
      <div className="flex flex-col gap-4 px-1 py-1 sm:px-2 md:px-3 lg:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CategoryPills categories={categories} mode={mode} forcedCategorySlug={forcedCategorySlug} />
          <div className="w-full shrink-0 lg:w-auto lg:max-w-[16rem]">
            <ProductsSortBar />
          </div>
        </div>
        <ListingTopbar title={title} subtitle={subtitle} showing={merged.length} total={initial.total} />

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
  );
}

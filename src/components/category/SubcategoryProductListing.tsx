"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { ProductGridCarousel } from "@/components/category/ProductGridCarousel";
import { ProductQuickViewModal } from "@/components/category/ProductQuickViewModal";
import { QuickAddToCart } from "@/components/category/QuickAddToCart";
import { StoreMedia } from "@/components/store/StoreMedia";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";

export type ListingProduct = {
  _id: string;
  slug: string;
  name: string;
  sku: string;
  pricePaise: number;
  /** Optional crossed-out “was” price when on sale. */
  compareAtPaise?: number;
  stock: number;
  images: string[];
  /** Gallery for grid cards (first colour’s images when colour variants exist). */
  carouselImages: string[];
  hasColorVariants?: boolean;
  options?: { key: string; label: string; pricePaise: number; stock: number }[];
};

const VIEW_KEY = "prisbo_subcategory_view";

type ViewMode = "list" | "grid";

type SortMode = "name" | "price_asc" | "price_desc";

export function SubcategoryProductListing({ products }: { products: ListingProduct[] }) {
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("name");
  const [quickSlug, setQuickSlug] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "list" || v === "grid") setView(v);
    } catch {
      /* ignore */
    }
  }, []);

  function setViewPersist(next: ViewMode) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const sortedProducts = useMemo(() => {
    const list = [...products];
    const priceOf = (p: ListingProduct) =>
      productHasOptions(p) ? minOptionPricePaise(p) : p.pricePaise;
    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "price_asc") {
      list.sort((a, b) => priceOf(a) - priceOf(b));
    } else {
      list.sort((a, b) => priceOf(b) - priceOf(a));
    }
    return list;
  }, [products, sort]);

  if (!products.length) return null;

  return (
    <div className="space-y-4">
      {quickSlug ? <ProductQuickViewModal slug={quickSlug} onClose={() => setQuickSlug(null)} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {products.length} product{products.length === 1 ? "" : "s"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <span className="sr-only sm:not-sr-only sm:inline">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="min-h-11 rounded-full border border-sand-deep bg-white px-3 py-2 text-sm text-ink shadow-sm"
            >
              <option value="name">Name A–Z</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
        <div
          className="inline-flex rounded-full border border-sand-deep bg-white p-1 text-sm shadow-sm"
          role="group"
          aria-label="Product layout"
        >
          <button
            type="button"
            onClick={() => setViewPersist("list")}
            className={`min-h-11 rounded-full px-4 py-2 font-medium transition ${
              view === "list"
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink"
            }`}
            aria-pressed={view === "list"}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewPersist("grid")}
            className={`min-h-11 rounded-full px-4 py-2 font-medium transition ${
              view === "grid"
                ? "bg-ink text-white"
                : "text-ink-muted hover:text-ink"
            }`}
            aria-pressed={view === "grid"}
          >
            Grid
          </button>
        </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-sand-deep bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-sand-deep bg-sand/60 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th className="px-3 py-3 font-medium sm:px-4">Product</th>
                  <th className="hidden px-3 py-3 font-medium sm:table-cell sm:px-4">SKU</th>
                  <th className="px-3 py-3 text-right font-medium sm:px-4">Price</th>
                  <th className="hidden px-3 py-3 text-right font-medium md:table-cell md:px-4">
                    Stock
                  </th>
                  <th className="px-3 py-3 text-right font-medium sm:px-4">Add</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((p) => {
                  const multi = productHasOptions(p);
                  const listPrice = multi ? minOptionPricePaise(p) : p.pricePaise;
                  const compare = p.compareAtPaise;
                  const onSale =
                    typeof compare === "number" &&
                    compare > listPrice &&
                    Number.isFinite(compare);
                  const thumb = p.carouselImages[0] ?? p.images[0];
                  return (
                  <tr key={p._id} className="border-b border-sand-deep/80 last:border-0">
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/product/${p.slug}`}
                          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand-deep"
                        >
                          {thumb ? (
                            <StoreMedia
                              src={thumb}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                              videoControls={false}
                            />
                          ) : null}
                        </Link>
                        <Link
                          href={`/product/${p.slug}`}
                          className="font-medium text-ink hover:text-accent line-clamp-2"
                        >
                          {p.name}
                        </Link>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-ink-muted sm:hidden">
                        {p.sku}
                      </p>
                    </td>
                    <td className="hidden px-3 py-3 font-mono text-xs text-ink-muted sm:table-cell sm:px-4">
                      {p.sku}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-ink sm:px-4">
                      {onSale ? (
                        <span className="inline-flex flex-col items-end gap-0.5 sm:inline-flex sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="text-xs font-normal text-ink-muted line-through">
                            {formatInrFromPaise(compare!)}
                          </span>
                          <span className="text-emerald-800">
                            {multi ? (
                              <>
                                <span className="text-xs font-normal text-ink-muted">From </span>
                                {formatInrFromPaise(listPrice)}
                              </>
                            ) : (
                              formatInrFromPaise(listPrice)
                            )}
                          </span>
                        </span>
                      ) : multi ? (
                        <span>
                          <span className="text-xs font-normal text-ink-muted">From </span>
                          {formatInrFromPaise(listPrice)}
                        </span>
                      ) : (
                        formatInrFromPaise(listPrice)
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-ink-muted md:table-cell md:px-4">
                      {multi ? "—" : p.stock}
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <QuickAddToCart
                        compact
                        stock={multi ? 1 : p.stock}
                        requiresOptionChoice={multi || Boolean(p.hasColorVariants)}
                        product={{
                          id: p._id,
                          slug: p.slug,
                          name: p.name,
                          pricePaise: listPrice,
                          image: thumb,
                        }}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedProducts.map((p) => {
            const multi = productHasOptions(p);
            const listPrice = multi ? minOptionPricePaise(p) : p.pricePaise;
            const compare = p.compareAtPaise;
            const onSale =
              typeof compare === "number" &&
              compare > listPrice &&
              Number.isFinite(compare);
            const gridImages =
              p.carouselImages.length > 0 ? p.carouselImages : p.images;
            const second = gridImages[1];
            return (
            <div
              key={p._id}
              className="group/card flex h-full flex-col overflow-hidden rounded-xl border border-sand-deep bg-white shadow-sm sm:rounded-2xl"
            >
              <Link href={`/product/${p.slug}`} className="block shrink-0">
                <div className="relative aspect-square w-full overflow-hidden bg-sand-deep sm:aspect-[4/3]">
                  {second ? (
                    <>
                      <div className="hidden h-full w-full md:block">
                        <div className="relative h-full w-full">
                          <StoreMedia
                            src={gridImages[0]}
                            alt={p.name}
                            fill
                            className="object-cover transition-opacity duration-300 group-hover/card:opacity-0"
                            sizes="(max-width:1024px) 50vw, 33vw"
                            fetchPriority="low"
                            videoControls={false}
                          />
                          <StoreMedia
                            src={second}
                            alt=""
                            fill
                            className="absolute inset-0 object-cover opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
                            sizes="(max-width:1024px) 50vw, 33vw"
                            fetchPriority="low"
                            videoControls={false}
                          />
                        </div>
                      </div>
                      <div className="h-full w-full md:hidden">
                        <ProductGridCarousel
                          images={gridImages}
                          productName={p.name}
                          sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 33vw"
                        />
                      </div>
                    </>
                  ) : (
                    <ProductGridCarousel
                      images={gridImages}
                      productName={p.name}
                      sizes="(max-width:640px) 50vw, (max-width:1024px) 50vw, 33vw"
                    />
                  )}
                </div>
              </Link>
              <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4">
                <Link
                  href={`/product/${p.slug}`}
                  className="text-sm font-medium text-ink hover:text-accent line-clamp-2 sm:text-base"
                >
                  {p.name}
                </Link>
                <p className="mt-0.5 hidden font-mono text-[10px] text-ink-muted sm:block sm:text-xs">
                  {p.sku}
                </p>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-ink-muted">
                  {multi
                    ? "Multiple packs — open product to choose"
                    : p.hasColorVariants
                      ? "Colours — open product to choose"
                      : `Stock: ${p.stock}`}
                </p>
                <div className="mt-auto flex min-h-[2.75rem] flex-wrap items-center justify-between gap-2 border-t border-sand-deep pt-3">
                  <p className="min-w-0 shrink font-display text-base font-semibold tabular-nums text-ink sm:text-lg">
                    {onSale ? (
                      <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
                        <span className="text-sm font-normal text-ink-muted line-through sm:text-base">
                          {formatInrFromPaise(compare!)}
                        </span>
                        <span className="text-emerald-800">
                          {multi ? (
                            <span>
                              <span className="text-xs font-normal text-ink-muted sm:text-sm">From </span>
                              {formatInrFromPaise(listPrice)}
                            </span>
                          ) : (
                            formatInrFromPaise(listPrice)
                          )}
                        </span>
                      </span>
                    ) : multi ? (
                      <span>
                        <span className="text-sm font-normal text-ink-muted sm:text-base">From </span>
                        {formatInrFromPaise(listPrice)}
                      </span>
                    ) : (
                      formatInrFromPaise(listPrice)
                    )}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setQuickSlug(p.slug);
                      }}
                      className="rounded-full border border-sand-deep bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted hover:border-accent hover:text-accent sm:px-3 sm:text-xs"
                    >
                      Quick view
                    </button>
                    <QuickAddToCart
                      inline
                      stock={multi ? 1 : p.stock}
                      requiresOptionChoice={multi || Boolean(p.hasColorVariants)}
                      product={{
                        id: p._id,
                        slug: p.slug,
                        name: p.name,
                        pricePaise: listPrice,
                        image: gridImages[0] ?? p.images[0],
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}

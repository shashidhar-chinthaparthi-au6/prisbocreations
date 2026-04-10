"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { ProductGridCarousel } from "@/components/category/ProductGridCarousel";
import { QuickAddToCart } from "@/components/category/QuickAddToCart";
import { StoreMedia } from "@/components/store/StoreMedia";

export type ListingProduct = {
  _id: string;
  slug: string;
  name: string;
  sku: string;
  pricePaise: number;
  stock: number;
  images: string[];
};

const VIEW_KEY = "prisbo_subcategory_view";

type ViewMode = "list" | "grid";

export function SubcategoryProductListing({ products }: { products: ListingProduct[] }) {
  const [view, setView] = useState<ViewMode>("list");

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

  if (!products.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {products.length} product{products.length === 1 ? "" : "s"}
        </p>
        <div
          className="inline-flex rounded-full border border-sand-deep bg-white p-1 text-sm shadow-sm"
          role="group"
          aria-label="Product layout"
        >
          <button
            type="button"
            onClick={() => setViewPersist("list")}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
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
            className={`rounded-full px-4 py-1.5 font-medium transition ${
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
                {products.map((p) => (
                  <tr key={p._id} className="border-b border-sand-deep/80 last:border-0">
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/product/${p.slug}`}
                          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand-deep"
                        >
                          {p.images[0] ? (
                            <StoreMedia
                              src={p.images[0]}
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
                      {formatInrFromPaise(p.pricePaise)}
                    </td>
                    <td className="hidden px-3 py-3 text-right text-ink-muted md:table-cell md:px-4">
                      {p.stock}
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <QuickAddToCart
                        compact
                        stock={p.stock}
                        product={{
                          id: p._id,
                          slug: p.slug,
                          name: p.name,
                          pricePaise: p.pricePaise,
                          image: p.images[0],
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p._id}
              className="flex flex-col overflow-hidden rounded-2xl border border-sand-deep bg-white shadow-sm"
            >
              <Link href={`/product/${p.slug}`} className="block">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-deep">
                  <ProductGridCarousel
                    images={p.images}
                    productName={p.name}
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                  />
                </div>
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Link
                  href={`/product/${p.slug}`}
                  className="font-medium text-ink hover:text-accent line-clamp-2"
                >
                  {p.name}
                </Link>
                <p className="mt-1 font-mono text-xs text-ink-muted">{p.sku}</p>
                <p className="mt-2 font-display text-lg font-semibold text-ink">
                  {formatInrFromPaise(p.pricePaise)}
                </p>
                <p className="text-xs text-ink-muted">Stock: {p.stock}</p>
                <div className="mt-3 border-t border-sand-deep pt-3">
                  <QuickAddToCart
                    stock={p.stock}
                    product={{
                      id: p._id,
                      slug: p.slug,
                      name: p.name,
                      pricePaise: p.pricePaise,
                      image: p.images[0],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

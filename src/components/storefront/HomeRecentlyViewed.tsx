"use client";

import { useEffect, useState } from "react";
import { readRecentlyViewedProductIds } from "@/lib/recently-viewed-ids";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

export function HomeRecentlyViewed() {
  const [items, setItems] = useState<StorefrontProductCard[] | null>(null);

  useEffect(() => {
    const ids = readRecentlyViewedProductIds();
    if (ids.length < 2) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/products?ids=${encodeURIComponent(ids.join(","))}&limit=12`);
        const j = (await r.json()) as { data?: { items?: StorefrontProductCard[] } };
        if (!cancelled) setItems(j.data?.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null || items.length < 2) return null;

  return (
    <section className="mt-14 space-y-4">
      <h2 className="font-display text-2xl text-[var(--brand-ink)] sm:text-3xl">Pick up where you left off</h2>
      <div className="home-carousel-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((p) => (
          <div key={p.id} className="home-carousel-slide w-[220px] shrink-0 sm:w-[240px]">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

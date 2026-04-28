"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { expandHomeListingCardsByColour } from "@/lib/home-expand-storefront-cards";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

/** Per request; aligns with storefront cap (see `listStorefrontProducts`). */
const PAGE_SIZE = 24;

function LoadSpinner() {
  return (
    <div
      className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-[var(--brand-border)] border-t-[var(--brand-amber)]"
      aria-hidden
    />
  );
}

export function HomeMostLovedSection({ initial }: { initial: StorefrontProductCard[] }) {
  const [items, setItems] = useState<StorefrontProductCard[]>(initial);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const itemsRef = useRef(items);
  const loadingRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  const displayRows = useMemo(() => expandHomeListingCardsByColour(items), [items]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || doneRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const exclude = [...new Set(itemsRef.current.map((p) => p.id))].join(",");
      /** No category/recipient/filter — storefront default = all published categories. */
      const qs = new URLSearchParams({
        sort: "newest",
        in_stock: "true",
        limit: String(PAGE_SIZE),
        skip: "0",
        ...(exclude.length ? { exclude } : {}),
      });
      const res = await fetch(`/api/products?${qs}`, { credentials: "same-origin" });
      const raw = (await res.json()) as {
        ok?: boolean;
        data?: { items?: StorefrontProductCard[] };
      };
      if (!raw?.ok || !raw?.data) {
        doneRef.current = true;
        setDone(true);
        return;
      }
      const add = raw.data.items ?? [];
      const have = new Set(itemsRef.current.map((p) => p.id));
      const fresh = add.filter((p) => p.id && !have.has(p.id));
      setItems((prev) => [...prev, ...fresh]);
      if (fresh.length === 0 || fresh.length < PAGE_SIZE) {
        doneRef.current = true;
        setDone(true);
      }
    } catch {
      doneRef.current = true;
      setDone(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    if (done) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        loadMoreRef.current?.();
      },
      { root: null, rootMargin: "400px", threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, items.length]);

  return (
    <>
      <div className="home-carousel-row mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {displayRows.map((row) => (
          <div key={row.rowKey} className="home-carousel-slide min-w-0">
            <ProductCard product={row} />
          </div>
        ))}
      </div>

      {!done ? (
        <div
          ref={sentinelRef}
          className="mt-8 flex min-h-[4.5rem] flex-col items-center justify-center pb-12 pt-6"
          aria-busy={loading}
        >
          {loading ? <LoadSpinner /> : null}
          <span className="sr-only">{loading ? "Loading more products" : "Scroll for more"}</span>
        </div>
      ) : null}
    </>
  );
}

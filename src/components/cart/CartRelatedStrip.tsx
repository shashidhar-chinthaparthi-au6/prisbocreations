"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

export function CartRelatedStrip({ productId }: { productId: string | null }) {
  const [items, setItems] = useState<StorefrontProductCard[]>([]);

  useEffect(() => {
    if (!productId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/cart/related?productId=${encodeURIComponent(productId)}`);
        const j = (await r.json()) as { ok?: boolean; data?: { items?: StorefrontProductCard[] } };
        if (!cancelled && j.ok && j.data?.items) setItems(j.data.items);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!items.length) return null;

  return (
    <section className="mt-12 border-t border-[#E8E0D6] pt-10">
      <h2 className="font-display text-xl text-[#3D3835]">You might also like</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

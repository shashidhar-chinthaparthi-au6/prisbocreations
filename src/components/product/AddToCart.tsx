"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

export function AddToCart({
  product,
}: {
  product: { id: string; slug: string; name: string; pricePaise: number; image?: string };
}) {
  const { add } = useCart();
  const [n, setN] = useState(1);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm text-ink-muted">Qty</label>
        <input
          type="number"
          min={1}
          value={n}
          onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))}
          className="w-20 rounded-lg border border-sand-deep bg-white px-3 py-2 text-sm"
        />
      </div>
      <button
        type="button"
        onClick={() => {
          add({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            pricePaise: product.pricePaise,
            image: product.image,
            quantity: n,
          });
          setMsg("Added to cart");
          setTimeout(() => setMsg(null), 2000);
        }}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-light md:w-auto"
      >
        Add to cart
      </button>
      {msg ? <p className="text-sm text-accent">{msg}</p> : null}
    </div>
  );
}

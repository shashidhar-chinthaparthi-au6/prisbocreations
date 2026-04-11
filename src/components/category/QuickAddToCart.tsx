"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export function QuickAddToCart({
  product,
  stock,
  requiresOptionChoice,
  compact = false,
}: {
  product: { id: string; slug: string; name: string; pricePaise: number; image?: string };
  stock: number;
  /** When true, product has priced packs — user must open product page to pick an option. */
  requiresOptionChoice?: boolean;
  compact?: boolean;
}) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [flash, setFlash] = useState(false);

  const max = Math.max(1, stock);

  function onAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (requiresOptionChoice) return;
    const n = Math.min(Math.max(1, qty), max);
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      pricePaise: product.pricePaise,
      image: product.image,
      quantity: n,
    });
    setFlash(true);
    window.setTimeout(() => setFlash(false), 1400);
  }

  if (requiresOptionChoice) {
    return (
      <div
        className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-end"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/product/${product.slug}`}
          className="rounded-full border border-sand-deep bg-white px-3 py-1.5 text-xs font-medium text-accent hover:bg-sand/50 sm:text-sm"
        >
          Choose options →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-end"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="number"
        min={1}
        max={max}
        value={qty}
        onChange={(e) => setQty(Math.min(max, Math.max(1, Number(e.target.value) || 1)))}
        className="w-14 rounded-md border border-sand-deep bg-white px-2 py-1.5 text-center text-sm tabular-nums"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={stock < 1}
        className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
      >
        {flash ? "Added!" : stock < 1 ? "Out of stock" : "Add"}
      </button>
    </div>
  );
}

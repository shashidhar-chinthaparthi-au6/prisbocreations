"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { cartLineId } from "@/lib/cart-line-id";

export function QuickAddToCart({
  product,
  stock,
  requiresOptionChoice,
  compact = false,
  /** Sits beside price on one row — no full-width Add / full-width stepper. */
  inline = false,
}: {
  product: { id: string; slug: string; name: string; pricePaise: number; image?: string };
  stock: number;
  /** When true, product has priced packs — user must open product page to pick an option. */
  requiresOptionChoice?: boolean;
  compact?: boolean;
  inline?: boolean;
}) {
  const { add, lines, setQty } = useCart();

  const lineId = useMemo(
    () => cartLineId(product.id, undefined, {}),
    [product.id],
  );

  const line = lines.find((l) => l.id === lineId);
  const inCartQty = line?.quantity ?? 0;
  const max = Math.max(1, stock);

  function onAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (requiresOptionChoice) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      pricePaise: product.pricePaise,
      image: product.image,
      quantity: 1,
    });
  }

  function onDec(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setQty(lineId, inCartQty - 1);
  }

  function onInc(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (inCartQty >= max) return;
    setQty(lineId, inCartQty + 1);
  }

  const wrap = (node: React.ReactNode) => (
    <div
      className={`flex items-center ${inline ? "shrink-0 justify-end" : "flex-wrap gap-2"} ${inline ? "" : compact ? "" : "justify-end"}`}
      onClick={(e) => e.stopPropagation()}
    >
      {node}
    </div>
  );

  if (requiresOptionChoice) {
    return wrap(
      <Link
        href={`/products/${product.slug}`}
        className={`rounded-full border border-sand-deep bg-white font-medium text-accent hover:bg-sand/50 ${inline ? "whitespace-nowrap px-2 py-1 text-[10px] sm:px-2.5 sm:py-1.5 sm:text-xs" : "px-3 py-1.5 text-xs sm:text-sm"}`}
      >
        Choose options →
      </Link>,
    );
  }

  if (inCartQty < 1) {
    return wrap(
      <button
        type="button"
        onClick={onAdd}
        disabled={stock < 1}
        className={`rounded-full bg-accent font-semibold text-white hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50 ${inline ? "shrink-0 whitespace-nowrap px-2.5 py-1 text-[10px] sm:px-3 sm:py-1.5 sm:text-xs" : "w-full px-3 py-1.5 text-xs sm:w-auto sm:text-sm"}`}
      >
        {stock < 1 ? "Out of stock" : "Add"}
      </button>,
    );
  }

  const btnPad = inline
    ? "min-h-6 min-w-6 text-[11px] sm:min-h-7 sm:min-w-7 sm:text-xs"
    : compact
      ? "min-h-7 min-w-7 text-xs"
      : "min-h-8 min-w-8 text-sm";
  const countCls = inline
    ? "min-w-[1rem] px-0.5 text-[10px] sm:min-w-[1.125rem] sm:text-[11px]"
    : compact
      ? "min-w-[1.125rem] px-1 text-[11px]"
      : "min-w-[1.35rem] px-1.5 text-sm";

  return wrap(
    <div
      className={`inline-flex items-center justify-between rounded-full border border-sand-deep bg-white p-0.5 shadow-sm ${inline ? "max-w-[6.75rem] sm:max-w-[7.5rem]" : "w-full max-w-[9.5rem]"}`}
    >
      <button
        type="button"
        aria-label="Remove one from cart"
        onClick={onDec}
        className={`inline-flex items-center justify-center rounded-full bg-sand/80 font-semibold text-ink hover:bg-sand-deep/80 ${btnPad}`}
      >
        −
      </button>
      <span
        className={`flex-1 text-center font-semibold tabular-nums text-ink ${countCls}`}
        aria-live="polite"
      >
        {inCartQty}
      </span>
      <button
        type="button"
        aria-label="Add one to cart"
        onClick={onInc}
        disabled={inCartQty >= max}
        className={`inline-flex items-center justify-center rounded-full bg-accent font-semibold text-white hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-45 ${btnPad}`}
      >
        +
      </button>
    </div>,
  );
}

"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { StoreMedia } from "@/components/store/StoreMedia";
import { formatInrFromPaise } from "@/lib/format";

export function CartClient() {
  const { lines, setQty, remove, subtotalPaise } = useCart();

  if (!lines.length) {
    return (
      <p className="rounded-2xl border border-dashed border-sand-deep bg-white p-10 text-center text-ink-muted">
        Your cart is empty.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {lines.map((l) => (
          <div
            key={l.productId}
            className="flex gap-4 rounded-2xl border border-sand-deep bg-white p-4 shadow-sm"
          >
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-sand-deep">
              {l.image ? (
                <StoreMedia
                  src={l.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                  videoControls={false}
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <Link href={`/product/${l.slug}`} className="font-medium text-ink hover:text-accent">
                  {l.name}
                </Link>
                <p className="text-sm text-ink-muted">{formatInrFromPaise(l.pricePaise)} each</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) => setQty(l.productId, Math.max(1, Number(e.target.value) || 1))}
                  className="w-16 rounded border border-sand-deep px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => remove(l.productId)}
                  className="text-sm text-rose hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="h-fit rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
        <p className="text-sm text-ink-muted">Subtotal</p>
        <p className="font-display text-2xl text-ink">{formatInrFromPaise(subtotalPaise)}</p>
        <p className="mt-2 text-xs text-ink-muted">Taxes & shipping calculated at checkout.</p>
        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-full bg-ink py-3 text-center text-sm font-semibold text-white hover:bg-ink/90"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}

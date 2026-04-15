"use client";

import Link from "next/link";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart/CartProvider";
import { StoreMedia } from "@/components/store/StoreMedia";
import { formatInrFromPaise } from "@/lib/format";
import { GIFT_WRAP_PAISE } from "@/lib/gift-wrap";
import { freeShippingMinRupeesWhole, qualifiesForFreeShipping } from "@/lib/free-shipping";

export function CartDrawer() {
  const { lines, subtotalPaise, drawerOpen, setDrawerOpen, remove, setQty } = useCart();
  const freeShip = qualifiesForFreeShipping(subtotalPaise);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, setDrawerOpen]);

  useEffect(() => {
    if (!drawerOpen || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  if (!drawerOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
        aria-label="Close cart"
        onClick={() => setDrawerOpen(false)}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl ring-1 ring-sand-deep">
        <div className="flex items-center justify-between border-b border-sand-deep px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <h2 className="font-display text-lg text-ink">Your cart</h2>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-full border border-sand-deep px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {!lines.length ? (
            <p className="text-sm text-ink-muted">Your cart is empty.</p>
          ) : (
            <ul className="space-y-3">
              {lines.map((l) => (
                <li
                  key={l.id}
                  className="flex gap-3 rounded-xl border border-sand-deep bg-sand/20 p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sand-deep">
                    {l.image ? (
                      <StoreMedia
                        src={l.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                        fetchPriority="low"
                        videoControls={false}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${l.slug}`}
                      onClick={() => setDrawerOpen(false)}
                      className="font-medium text-ink hover:text-accent line-clamp-2"
                    >
                      {l.name}
                    </Link>
                    {l.giftWrap ? (
                      <p className="mt-0.5 text-xs text-accent">
                        Gift wrap +{formatInrFromPaise(GIFT_WRAP_PAISE)} / unit
                      </p>
                    ) : null}
                    {l.giftMessage ? (
                      <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{l.giftMessage}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) => setQty(l.id, Math.max(1, Number(e.target.value) || 1))}
                        className="w-14 rounded border border-sand-deep px-1 py-0.5 text-center text-xs"
                        aria-label="Quantity"
                      />
                      <span className="text-ink-muted">×</span>
                      <span className="font-medium text-ink">{formatInrFromPaise(l.pricePaise)}</span>
                      <button
                        type="button"
                        onClick={() => remove(l.id)}
                        className="ml-auto text-xs text-rose hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-sand-deep bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {freeShip ? (
            <p className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-950">
              You qualify for <span className="text-emerald-900">free delivery</span> — cart over ₹
              {freeShippingMinRupeesWhole().toLocaleString("en-IN")}.
            </p>
          ) : null}
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-muted">Subtotal</span>
            <span className="font-display text-xl text-ink">{formatInrFromPaise(subtotalPaise)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">Taxes &amp; delivery at checkout.</p>
          <Link
            href="/checkout"
            onClick={() => setDrawerOpen(false)}
            className="mt-4 flex w-full items-center justify-center rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-light"
          >
            Checkout
          </Link>
          <Link
            href="/cart"
            onClick={() => setDrawerOpen(false)}
            className="mt-2 block w-full py-2 text-center text-sm font-medium text-accent hover:underline"
          >
            View full cart
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

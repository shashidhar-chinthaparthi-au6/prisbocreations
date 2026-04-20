"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart/CartProvider";
import type { CartLine } from "@/components/cart/CartProvider";
import { CartItem } from "@/components/cart/CartItem";
import { FreeShippingBar } from "@/components/cart/FreeShippingBar";
import { formatInrFromPaise } from "@/lib/format";
import { computeCartTotals } from "@/lib/store/cart-store";
import { useCartStore } from "@/lib/store/cart-store";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

function EmptyBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M6 7h15l-1.5 9H7.5L6 7z" />
      <path d="M9 7V5a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v2" />
    </svg>
  );
}

export function CartDrawer() {
  const { lines, subtotalPaise, drawerOpen, setDrawerOpen, remove, setQty } = useCart();
  const { status } = useSession();
  const [caps, setCaps] = useState<Record<string, number>>({});

  const refreshCaps = useCallback(() => {
    if (!lines.length) {
      setCaps({});
      return;
    }
    void (async () => {
      try {
        const r = await fetch("/api/cart/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              ...(l.optionKey ? { optionKey: l.optionKey } : {}),
              ...(l.colorKey ? { colorKey: l.colorKey } : {}),
            })),
          }),
        });
        const j = (await r.json()) as {
          ok?: boolean;
          data?: {
            lines?: Array<{ productId: string; maxQty: number; ok: boolean }>;
          };
        };
        if (!j.ok || !j.data?.lines) return;
        const next: Record<string, number> = {};
        j.data.lines.forEach((row, i) => {
          const l = lines[i];
          if (l) next[l.id] = row.maxQty;
        });
        setCaps(next);
      } catch {
        /* ignore */
      }
    })();
  }, [lines]);

  useEffect(() => {
    if (!drawerOpen) return;
    refreshCaps();
  }, [drawerOpen, refreshCaps]);

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

  function removeWithUndo(line: CartLine) {
    remove(line.id);
    dispatchStoreToast("Removed from cart", {
      duration: 5000,
      actionLabel: "Undo",
      onAction: () => {
        useCartStore.getState().add(
          {
            productId: line.productId,
            slug: line.slug,
            name: line.name,
            image: line.image,
            pricePaise: line.pricePaise,
            quantity: line.quantity,
            optionKey: line.optionKey,
            optionLabel: line.optionLabel,
            colorKey: line.colorKey,
            colorLabel: line.colorLabel,
            customerImageUrl: line.customerImageUrl,
            customerNotes: line.customerNotes,
            giftWrap: line.giftWrap,
            giftMessage: line.giftMessage,
          },
          { openDrawer: false },
        );
        useCartStore.setState((s) => ({ ...computeCartTotals(s.lines) }));
      },
    });
  }

  if (!drawerOpen || typeof document === "undefined") return null;

  const count = lines.reduce((n, l) => n + l.quantity, 0);

  return createPortal(
    <div className="fixed inset-0 z-[240] flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        aria-label="Close cart"
        onClick={() => setDrawerOpen(false)}
      />
      <div className="relative flex h-full w-full max-w-[400px] flex-col bg-white shadow-2xl ring-1 ring-[#E8E0D6]">
        <div className="flex items-center justify-between border-b border-[#E8E0D6] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div>
            <h2 className="text-base font-medium text-[#3D3835]">Your cart</h2>
            <p className="text-xs text-[#6B6560]">
              ({count} {count === 1 ? "item" : "items"})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-[#6B6560] hover:bg-[#F5E6D0]"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {!lines.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <EmptyBagIcon className="mb-4 h-12 w-12 text-[#9A8F85]" />
              <p className="font-medium text-[#3D3835]">Your cart is empty</p>
              <p className="mt-1 text-sm text-[#6B6560]">Add something beautiful to get started.</p>
              <Link
                href="/products"
                onClick={() => setDrawerOpen(false)}
                className="mt-6 rounded-full bg-[#C47A2B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#b06d26]"
              >
                Browse products →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {lines.map((l) => (
                <CartItem
                  key={l.id}
                  line={l}
                  compact
                  maxQty={caps[l.id]}
                  onQty={setQty}
                  onRemove={removeWithUndo}
                  onCloseDrawer={() => setDrawerOpen(false)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[#E8E0D6] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {lines.length ? (
            <>
              <FreeShippingBar subtotalPaise={subtotalPaise} />
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B6560]">Subtotal</span>
                <span className="font-display text-xl text-[#3D3835]">{formatInrFromPaise(subtotalPaise)}</span>
              </div>
              <p className="mt-1 text-[11px] text-[#6B6560]">Taxes &amp; delivery finalized at checkout.</p>
              <Link
                href="/checkout"
                onClick={() => setDrawerOpen(false)}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[#C47A2B] text-sm font-semibold text-white hover:bg-[#b06d26]"
              >
                Checkout
              </Link>
              {status === "unauthenticated" ? (
                <p className="mt-3 text-center text-xs leading-relaxed text-[#6B6560]">
                  <Link
                    href="/register?redirect=/checkout&source=checkout"
                    onClick={() => setDrawerOpen(false)}
                    className="font-semibold text-[#C47A2B] hover:underline"
                  >
                    Create an account
                  </Link>{" "}
                  to save your cart across devices.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="mt-2 w-full py-2 text-center text-sm font-medium text-[#C47A2B] hover:underline"
              >
                Continue shopping
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

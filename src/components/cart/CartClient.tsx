"use client";

import Link from "next/link";
import { CartItem } from "@/components/cart/CartItem";
import { CartSummary } from "@/components/cart/CartSummary";
import { CartRelatedStrip } from "@/components/cart/CartRelatedStrip";
import { useCart } from "@/components/cart/CartProvider";
import type { CartLine } from "@/components/cart/CartProvider";
import { useCartStore } from "@/lib/store/cart-store";
import { computeCartTotals } from "@/lib/store/cart-store";
import { dispatchStoreToast } from "@/components/store/StoreToaster";
import { useEffect, useState } from "react";

export function CartClient() {
  const { lines, setQty, remove, subtotalPaise } = useCart();
  const [caps, setCaps] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!lines.length) {
      setCaps({});
      return;
    }
    let cancelled = false;
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
          data?: { lines?: Array<{ maxQty: number }> };
        };
        if (cancelled || !j.ok || !j.data?.lines) return;
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
    return () => {
      cancelled = true;
    };
  }, [lines]);

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

  if (!lines.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E8E0D6] bg-white p-12 text-center">
        <p className="text-[#6B6560]">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-flex rounded-full bg-[#C47A2B] px-6 py-3 text-sm font-semibold text-white">
          Browse products →
        </Link>
      </div>
    );
  }

  const firstPid = lines[0]?.productId ?? null;

  return (
    <div>
      <Link href="/products" className="mb-6 inline-flex text-sm font-medium text-[#C47A2B] hover:underline">
        ← Continue shopping
      </Link>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {lines.map((l) => (
            <CartItem
              key={l.id}
              line={l}
              maxQty={caps[l.id]}
              onQty={setQty}
              onRemove={removeWithUndo}
            />
          ))}
        </div>
        <CartSummary />
      </div>
      <CartRelatedStrip productId={firstPid} />
    </div>
  );
}

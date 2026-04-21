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
import { StoreEmptyState } from "@/components/ui/StoreEmptyState";
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
            customizationSchema: line.customizationSchema,
            customizationData: line.customizationData,
            customizationFiles: line.customizationFiles,
          },
          { openDrawer: false },
        );
        useCartStore.setState((s) => ({ ...computeCartTotals(s.lines) }));
      },
    });
  }

  if (!lines.length) {
    return (
      <StoreEmptyState
        className="border-[#E8E0D6] bg-white"
        illustration="bag"
        title="Your cart is empty"
        description="Add something you love — we’ll hold it here until you’re ready to checkout."
        primary={{ label: "Browse products →", href: "/products" }}
        secondary={{ label: "Continue shopping on home", href: "/" }}
      />
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

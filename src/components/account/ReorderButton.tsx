"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { cartLineId } from "@/lib/cart-line-id";
import type { CartLine } from "@/lib/store/cart-store";
import { mergeCartLines } from "@/lib/cart/normalize-lines";

type OrderItem = {
  productId: string;
  slug: string;
  name: string;
  unitPricePaise: number;
  imageUrl?: string;
  optionKey?: string;
  optionLabel?: string;
  colorKey?: string;
  colorLabel?: string;
  customerImageUrl?: string;
  customerNotes?: string;
  giftWrapPaise?: number;
  giftMessage?: string;
};

function linesFromOrder(items: OrderItem[]): CartLine[] {
  return items.map((it) => {
    const giftWrap = typeof it.giftWrapPaise === "number" && it.giftWrapPaise > 0;
    const id = cartLineId(it.productId, it.optionKey, {
      colorKey: it.colorKey,
      customerImageUrl: it.customerImageUrl,
      customerNotes: it.customerNotes,
      giftWrap,
      giftMessage: it.giftMessage?.trim() || undefined,
    });
    return {
      id,
      productId: it.productId,
      slug: it.slug,
      name: it.name,
      image: it.imageUrl,
      pricePaise: it.unitPricePaise,
      quantity: 1,
      ...(it.optionKey ? { optionKey: it.optionKey, optionLabel: it.optionLabel } : {}),
      ...(it.colorKey ? { colorKey: it.colorKey, colorLabel: it.colorLabel } : {}),
      ...(it.customerImageUrl?.trim() ? { customerImageUrl: it.customerImageUrl.trim() } : {}),
      ...(it.customerNotes?.trim() ? { customerNotes: it.customerNotes.trim() } : {}),
      ...(giftWrap ? { giftWrap: true as const, ...(it.giftMessage?.trim() ? { giftMessage: it.giftMessage } : {}) } : {}),
    };
  });
}

export function ReorderButton({ items }: { items: OrderItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    setBusy(true);
    try {
      const add = linesFromOrder(items);
      const cur = await apiFetch<{ lines: CartLine[] }>("/api/cart");
      const merged = mergeCartLines(cur.lines, add);
      await apiFetch("/api/cart", {
        method: "PUT",
        body: JSON.stringify({ lines: merged }),
      });
      router.push("/cart");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not add to cart");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onClick()}
      className="rounded-full border border-[var(--brand-border)] px-3 py-1.5 text-xs font-medium text-[var(--brand-ink)] hover:border-[var(--brand-amber)] disabled:opacity-50"
    >
      {busy ? "Adding…" : "Reorder"}
    </button>
  );
}

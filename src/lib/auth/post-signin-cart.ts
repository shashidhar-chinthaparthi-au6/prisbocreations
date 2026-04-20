"use client";

import { useCartStore, computeCartTotals } from "@/lib/store/cart-store";
import type { CartLine } from "@/lib/store/cart-store";

/** Merge local guest cart into the signed-in user's persisted cart, then drop guest storage. */
export async function mergeGuestCartAfterSignIn(): Promise<void> {
  const lines = useCartStore.getState().lines;
  try {
    const r = await fetch("/api/cart/merge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
    if (r.ok) {
      const j = (await r.json()) as { ok?: boolean; data?: { lines?: CartLine[] } };
      const merged = j.data?.lines ?? [];
      useCartStore.setState({ lines: merged, ...computeCartTotals(merged) });
    }
  } finally {
    try {
      localStorage.removeItem("prisbo_cart");
      await useCartStore.persist.clearStorage();
    } catch {
      /* ignore */
    }
  }
}

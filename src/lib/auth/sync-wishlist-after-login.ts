"use client";

import { useWishlistStore } from "@/lib/store/wishlist-store";

/** Merge guest wishlist IDs into the signed-in user's server wishlist, then refresh the client store. */
export async function mergeWishlistAfterSignIn(guestProductIds: string[]): Promise<void> {
  const unique = [...new Set(guestProductIds.filter(Boolean))];
  try {
    const r = await fetch("/api/wishlist/merge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: unique }),
    });
    if (!r.ok) return;
    const j = (await r.json()) as { ok?: boolean; data?: { productIds?: string[] } };
    const merged = j.data?.productIds ?? [];
    useWishlistStore.getState().setIds(merged);
  } catch {
    /* ignore */
  }
}

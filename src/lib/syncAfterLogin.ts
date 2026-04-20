"use client";

import { mergeWishlistAfterSignIn } from "@/lib/auth/sync-wishlist-after-login";
import { useWishlistStore } from "@/lib/store/wishlist-store";

/** Merge guest wishlist into the signed-in account (non-blocking for callers). */
export async function syncAfterLogin(): Promise<void> {
  const ids = useWishlistStore.getState().ids.slice();
  await mergeWishlistAfterSignIn(ids);
}

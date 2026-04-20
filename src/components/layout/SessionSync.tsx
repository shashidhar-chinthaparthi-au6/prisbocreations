"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useWishlistStore } from "@/lib/store/wishlist-store";

/** Loads server wishlist when signed in; skips while login merge holds the lock. */
export function SessionSync() {
  const { status } = useSession();
  const isLoaded = useWishlistStore((s) => s.isLoaded);
  const mergeInProgress = useWishlistStore((s) => s.mergeInProgress);
  const setIds = useWishlistStore((s) => s.setIds);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      useWishlistStore.setState({ isLoaded: true });
      return;
    }

    if (status !== "authenticated") return;
    if (mergeInProgress) return;
    if (isLoaded) return;

    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/wishlist", { credentials: "include" });
        if (!r.ok || cancelled) {
          if (!cancelled) useWishlistStore.setState({ isLoaded: true });
          return;
        }
        const j = (await r.json()) as { ok?: boolean; data?: { productIds?: string[] } };
        const ids = j.data?.productIds ?? [];
        if (!cancelled) setIds(ids);
      } catch {
        if (!cancelled) useWishlistStore.setState({ isLoaded: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, isLoaded, mergeInProgress, setIds]);

  return null;
}

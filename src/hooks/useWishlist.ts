"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

const NUDGE_KEY = "prisbo_wishlist_nudge_shown";
const THREE_NUDGE_KEY = "prisbo_wishlist_three_nudge_shown";

let firstWishlistNudgeTimer: ReturnType<typeof setTimeout> | null = null;

function sessionFlag(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}

function setSessionFlag(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

function guestNudgeAfterAdd(beforeCount: number, afterCount: number) {
  if (beforeCount < 3 && afterCount >= 3 && !sessionFlag(THREE_NUDGE_KEY)) {
    if (firstWishlistNudgeTimer) {
      clearTimeout(firstWishlistNudgeTimer);
      firstWishlistNudgeTimer = null;
    }
    setSessionFlag(THREE_NUDGE_KEY);
    setSessionFlag(NUDGE_KEY);
    dispatchStoreToast("You have 3 saved items\n\nSign in or create an account to make sure you don't lose them.", {
      duration: 6000,
      variant: "wishlist",
      actionLabel: "Create account →",
        onAction: () => {
          window.location.href = "/register?redirect=/account/wishlist";
        },
      });
    return;
  }

  if (afterCount >= 1 && beforeCount === 0 && !sessionFlag(NUDGE_KEY) && !sessionFlag(THREE_NUDGE_KEY)) {
    firstWishlistNudgeTimer = setTimeout(() => {
      firstWishlistNudgeTimer = null;
      if (sessionFlag(NUDGE_KEY) || sessionFlag(THREE_NUDGE_KEY)) return;
      setSessionFlag(NUDGE_KEY);
      dispatchStoreToast("Saved to wishlist\n\nCreate a free account to keep your wishlist safe across devices.", {
        duration: 6000,
        variant: "wishlist",
        actionLabel: "Create account →",
        onAction: () => {
          window.location.href = "/register?redirect=/account/wishlist";
        },
      });
    }, 2000);
  }
}

export function useWishlist() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const ids = useWishlistStore((s) => s.ids);
  const toggleStore = useWishlistStore((s) => s.toggle);
  const isLoggedIn = status === "authenticated" && !!session?.user;

  const has = useCallback((productId: string) => ids.includes(productId.trim()), [ids]);

  const toggle = useCallback(
    async (productId: string) => {
      const id = productId.trim();
      if (!id) return;

      const wasWishlisted = useWishlistStore.getState().has(id);
      const beforeCount = useWishlistStore.getState().ids.length;

      toggleStore(id);

      if (!isLoggedIn) {
        const afterCount = useWishlistStore.getState().ids.length;
        if (!wasWishlisted) {
          guestNudgeAfterAdd(beforeCount, afterCount);
        }
        return;
      }

      try {
        const res = await fetch("/api/wishlist/toggle", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id }),
        });
        const j = (await res.json()) as {
          ok?: boolean;
          data?: { wishlisted?: boolean; on?: boolean };
        };
        if (!res.ok || !j.ok) {
          toggleStore(id);
          return;
        }
        const on = j.data?.wishlisted ?? j.data?.on;
        if (typeof on === "boolean" && on !== !wasWishlisted) {
          toggleStore(id);
        }
      } catch {
        toggleStore(id);
      }
    },
    [isLoggedIn, toggleStore],
  );

  return {
    toggle,
    has,
    count: ids.length,
    items: ids,
    isLoggedIn,
    isSessionLoading: status === "loading",
    openRegister: useCallback(() => {
      router.push("/register");
    }, [router]),
  };
}

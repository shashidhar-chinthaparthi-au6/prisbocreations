"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const LEGACY_ARRAY_KEY = "prisbo_wishlist_guest";

type WishlistState = {
  ids: string[];
  /** True after guest hydrate or server wishlist fetch / merge. Not persisted. */
  isLoaded: boolean;
  /** While true, SessionSync must not GET /api/wishlist (login merge in progress). */
  mergeInProgress: boolean;
  setIds: (ids: string[]) => void;
  toggle: (productId: string) => boolean;
  has: (productId: string) => boolean;
  count: () => number;
};

function readLegacyGuestIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_ARRAY_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLegacyGuestIds(ids: string[]) {
  try {
    localStorage.setItem(LEGACY_ARRAY_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      isLoaded: false,
      mergeInProgress: false,

      setIds: (ids) => {
        const next = [...new Set(ids.filter(Boolean))];
        set({ ids: next, isLoaded: true });
        writeLegacyGuestIds(next);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("prisbo-wishlist"));
        }
      },

      has: (productId) => get().ids.includes(productId.trim()),

      count: () => get().ids.length,

      toggle: (productId) => {
        const id = productId.trim();
        if (!id) return false;
        const prev = get().ids;
        const i = prev.indexOf(id);
        const next = i === -1 ? [...prev, id] : prev.filter((x) => x !== id);
        set({ ids: next });
        writeLegacyGuestIds(next);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("prisbo-wishlist"));
        }
        return i === -1;
      },
    }),
    {
      name: "prisbo_wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ ids: s.ids }),
      version: 1,
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<WishlistState, "ids">> | undefined;
        let ids = Array.isArray(p?.ids) ? p!.ids!.filter((x): x is string => typeof x === "string") : [];
        if (typeof window !== "undefined" && ids.length === 0) {
          ids = readLegacyGuestIds();
        }
        return { ...current, ids, isLoaded: false };
      },
    },
  ),
);

export function wishlistCountSelector(s: WishlistState): number {
  return s.ids.length;
}

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useCartStore, computeCartTotals } from "@/lib/store/cart-store";
import type { CartLine } from "@/lib/store/cart-store";

export type { CartLine } from "@/lib/store/cart-store";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  useEffect(() => {
    const { lines } = useCartStore.getState();
    useCartStore.setState(computeCartTotals(lines));
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch("/api/cart", { credentials: "include" });
          if (!r.ok || cancelled) return;
          const j = (await r.json()) as { data?: { lines?: CartLine[] } };
          const serverLines = j.data?.lines;
          if (Array.isArray(serverLines) && serverLines.length > 0) {
            useCartStore.setState({ lines: serverLines, ...computeCartTotals(serverLines) });
          }
        } catch {
          /* ignore */
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useCartStore.subscribe((state) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void fetch("/api/cart", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: state.lines }),
        }).catch(() => {});
      }, 900);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [status]);

  return children;
}

export function useCart() {
  return useCartStore();
}

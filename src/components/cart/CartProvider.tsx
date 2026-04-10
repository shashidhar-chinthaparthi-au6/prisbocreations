"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { productId: string; slug: string; name: string; image?: string; pricePaise: number; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "quantity"> & { quantity?: number }) => void;
  setQty: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
  subtotalPaise: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE = "prisbo_cart_v1";

function load(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return [];
    return JSON.parse(raw) as CartLine[];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(load());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(lines));
  }, [lines]);

  const value = useMemo<CartContextValue>(() => {
    const subtotalPaise = lines.reduce((s, l) => s + l.pricePaise * l.quantity, 0);
    const count = lines.reduce((s, l) => s + l.quantity, 0);
    return {
      lines,
      count,
      subtotalPaise,
      add: (line) => {
        setLines((prev) => {
          const i = prev.findIndex((p) => p.productId === line.productId);
          const qty = line.quantity ?? 1;
          if (i === -1) return [...prev, { ...line, quantity: qty }];
          const next = [...prev];
          next[i] = { ...next[i], quantity: next[i].quantity + qty };
          return next;
        });
      },
      setQty: (productId, quantity) => {
        setLines((prev) =>
          prev
            .map((l) => (l.productId === productId ? { ...l, quantity } : l))
            .filter((l) => l.quantity > 0)
        );
      },
      remove: (productId) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

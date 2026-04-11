"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  /** Stable row id: `${productId}::${optionKey || ""}` */
  id: string;
  productId: string;
  slug: string;
  name: string;
  image?: string;
  pricePaise: number;
  quantity: number;
  optionKey?: string;
  optionLabel?: string;
};

type CartContextValue = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "id" | "quantity"> & { quantity?: number }) => void;
  setQty: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  count: number;
  subtotalPaise: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE = "prisbo_cart_v2";

export function cartLineId(productId: string, optionKey?: string) {
  return `${productId}::${optionKey ?? ""}`;
}

function migrateFromV1(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is Record<string, unknown> =>
        Boolean(x) && typeof x === "object" && typeof (x as CartLine).productId === "string",
    )
    .map((l) => {
      const productId = String(l.productId);
      const optionKey =
        typeof l.optionKey === "string" && l.optionKey.trim() ? l.optionKey.trim() : undefined;
      const id =
        typeof l.id === "string" && l.id.length > 0 ? l.id : cartLineId(productId, optionKey);
      return {
        id,
        productId,
        slug: String(l.slug ?? ""),
        name: String(l.name ?? ""),
        image: typeof l.image === "string" ? l.image : undefined,
        pricePaise: Number(l.pricePaise) || 0,
        quantity: Math.max(1, Number(l.quantity) || 1),
        optionKey,
        optionLabel: typeof l.optionLabel === "string" ? l.optionLabel : undefined,
      };
    })
    .filter((l) => l.slug && l.name);
}

function load(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return migrateFromV1(JSON.parse(raw));
    const legacy = localStorage.getItem("prisbo_cart_v1");
    if (legacy) {
      const migrated = migrateFromV1(JSON.parse(legacy));
      localStorage.setItem(STORAGE, JSON.stringify(migrated));
      localStorage.removeItem("prisbo_cart_v1");
      return migrated;
    }
  } catch {
    /* ignore */
  }
  return [];
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
        const id = cartLineId(line.productId, line.optionKey);
        const qty = line.quantity ?? 1;
        setLines((prev) => {
          const i = prev.findIndex((p) => p.id === id);
          if (i === -1) {
            return [
              ...prev,
              {
                id,
                productId: line.productId,
                slug: line.slug,
                name: line.name,
                image: line.image,
                pricePaise: line.pricePaise,
                quantity: qty,
                optionKey: line.optionKey,
                optionLabel: line.optionLabel,
              },
            ];
          }
          const next = [...prev];
          next[i] = { ...next[i], quantity: next[i].quantity + qty };
          return next;
        });
      },
      setQty: (lineId, quantity) => {
        setLines((prev) =>
          prev
            .map((l) => (l.id === lineId ? { ...l, quantity } : l))
            .filter((l) => l.quantity > 0),
        );
      },
      remove: (lineId) => setLines((prev) => prev.filter((l) => l.id !== lineId)),
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

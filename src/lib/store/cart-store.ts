"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { cartLineId as buildCartLineId } from "@/lib/cart-line-id";
import { GIFT_WRAP_PAISE } from "@/lib/gift-wrap";
import type {
  CustomizationFieldDef,
  CustomizationDataMap,
  CustomizationFilesMap,
} from "@/lib/customization-types";

export type CartLine = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image?: string;
  pricePaise: number;
  quantity: number;
  optionKey?: string;
  optionLabel?: string;
  colorKey?: string;
  colorLabel?: string;
  customerImageUrl?: string;
  customerNotes?: string;
  giftWrap?: boolean;
  giftMessage?: string;
  /** Snapshot of product personalisation schema (for cart summary + edit sheet). */
  customizationSchema?: CustomizationFieldDef[];
  customizationData?: CustomizationDataMap;
  customizationFiles?: CustomizationFilesMap;
};

type AddLineInput = Omit<CartLine, "id" | "quantity"> & { quantity?: number };

function lineGiftExtraPaise(l: CartLine): number {
  return l.giftWrap ? GIFT_WRAP_PAISE * l.quantity : 0;
}

function migrateLines(raw: unknown): CartLine[] {
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
      const colorKey =
        typeof l.colorKey === "string" && l.colorKey.trim() ? l.colorKey.trim() : undefined;
      const colorLabel =
        typeof l.colorLabel === "string" && l.colorLabel.trim() ? l.colorLabel.trim() : undefined;
      const customerImageUrl =
        typeof l.customerImageUrl === "string" && l.customerImageUrl.trim()
          ? l.customerImageUrl.trim()
          : undefined;
      const customerNotes =
        typeof l.customerNotes === "string" && l.customerNotes.trim()
          ? l.customerNotes.trim()
          : undefined;
      const giftWrap = Boolean(l.giftWrap);
      const giftMessage =
        typeof l.giftMessage === "string" && l.giftMessage.trim()
          ? l.giftMessage.trim()
          : undefined;
      const customizationData =
        l.customizationData && typeof l.customizationData === "object" && !Array.isArray(l.customizationData)
          ? (l.customizationData as CustomizationDataMap)
          : undefined;
      const customizationFiles =
        l.customizationFiles && typeof l.customizationFiles === "object" && !Array.isArray(l.customizationFiles)
          ? (l.customizationFiles as CustomizationFilesMap)
          : undefined;
      const customizationSchema = Array.isArray(l.customizationSchema)
        ? (l.customizationSchema as CustomizationFieldDef[])
        : undefined;
      const id =
        typeof l.id === "string" && l.id.length > 0
          ? l.id
          : buildCartLineId(productId, optionKey, {
              colorKey,
              customerImageUrl,
              customerNotes,
              giftWrap,
              giftMessage,
              customizationData,
              customizationFiles,
            });
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
        colorKey,
        colorLabel,
        customerImageUrl,
        customerNotes,
        ...(customizationSchema?.length ? { customizationSchema } : {}),
        ...(customizationData ? { customizationData } : {}),
        ...(customizationFiles ? { customizationFiles } : {}),
        ...(giftWrap ? { giftWrap: true as const, ...(giftMessage ? { giftMessage } : {}) } : {}),
      };
    })
    .filter((l) => l.slug && l.name);
}

export function computeCartTotals(lines: CartLine[]) {
  const subtotalPaise =
    lines.reduce((s, l) => s + l.pricePaise * l.quantity, 0) +
    lines.reduce((s, l) => s + lineGiftExtraPaise(l), 0);
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { subtotalPaise, count };
}

type CartState = {
  lines: CartLine[];
  drawerOpen: boolean;
  add: (line: AddLineInput, opts?: { openDrawer?: boolean }) => void;
  setQty: (lineId: string, quantity: number) => void;
  updateLineCustomization: (
    lineId: string,
    patch: {
      customizationData: CustomizationDataMap;
      customizationFiles: CustomizationFilesMap;
    },
  ) => void;
  remove: (lineId: string) => void;
  clear: () => void;
  setDrawerOpen: (open: boolean) => void;
  openCartDrawer: () => void;
  count: number;
  subtotalPaise: number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      drawerOpen: false,
      count: 0,
      subtotalPaise: 0,
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      openCartDrawer: () => set({ drawerOpen: true }),
      add: (line, opts) => {
        const id = buildCartLineId(line.productId, line.optionKey, {
          colorKey: line.colorKey,
          customerImageUrl: line.customerImageUrl,
          customerNotes: line.customerNotes,
          giftWrap: line.giftWrap,
          giftMessage: line.giftMessage,
          customizationData: line.customizationData,
          customizationFiles: line.customizationFiles,
        });
        const qty = line.quantity ?? 1;
        set((state) => {
          const prev = state.lines;
          const i = prev.findIndex((p) => p.id === id);
          let lines: CartLine[];
          if (i === -1) {
            lines = [
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
                colorKey: line.colorKey,
                colorLabel: line.colorLabel,
                customerImageUrl: line.customerImageUrl,
                customerNotes: line.customerNotes,
                giftWrap: line.giftWrap,
                giftMessage: line.giftMessage?.trim() || undefined,
                ...(line.customizationSchema?.length ?
                  { customizationSchema: line.customizationSchema }
                : {}),
                ...(line.customizationData ? { customizationData: line.customizationData } : {}),
                ...(line.customizationFiles ? { customizationFiles: line.customizationFiles } : {}),
              },
            ];
          } else {
            const next = [...prev];
            next[i] = { ...next[i], quantity: next[i].quantity + qty };
            lines = next;
          }
          const t = computeCartTotals(lines);
          return { lines, ...t, drawerOpen: opts?.openDrawer ? true : state.drawerOpen };
        });
      },
      updateLineCustomization: (lineId, patch) =>
        set((state) => {
          const idx = state.lines.findIndex((l) => l.id === lineId);
          if (idx === -1) return state;
          const line = state.lines[idx];
          const merged: CartLine = {
            ...line,
            customizationData: patch.customizationData,
            customizationFiles: patch.customizationFiles,
          };
          const newId = buildCartLineId(line.productId, line.optionKey, {
            colorKey: line.colorKey,
            customerImageUrl: line.customerImageUrl,
            customerNotes: line.customerNotes,
            giftWrap: line.giftWrap,
            giftMessage: line.giftMessage,
            customizationData: merged.customizationData,
            customizationFiles: merged.customizationFiles,
          });
          const others = state.lines.filter((_, j) => j !== idx);
          const clashIdx = others.findIndex((l) => l.id === newId);
          let lines: CartLine[];
          if (clashIdx === -1) {
            lines = [...others, { ...merged, id: newId }];
          } else {
            lines = others.map((l, j) =>
              j === clashIdx ? { ...l, quantity: l.quantity + merged.quantity } : l,
            );
          }
          return { lines, ...computeCartTotals(lines) };
        }),
      setQty: (lineId, quantity) =>
        set((state) => {
          const lines = state.lines
            .map((l) => (l.id === lineId ? { ...l, quantity } : l))
            .filter((l) => l.quantity > 0);
          return { lines, ...computeCartTotals(lines) };
        }),
      remove: (lineId) =>
        set((state) => {
          const lines = state.lines.filter((l) => l.id !== lineId);
          return { lines, ...computeCartTotals(lines) };
        }),
      clear: () => set({ lines: [], ...computeCartTotals([]) }),
    }),
    {
      name: "prisbo_cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines }),
      merge: (persisted, current) => {
        const p = persisted as Partial<CartState> | undefined;
        const lines = migrateLines(p?.lines ?? []);
        if (typeof window !== "undefined" && lines.length === 0) {
          try {
            const legacy = localStorage.getItem("prisbo_cart_v2");
            if (legacy) {
              const m = migrateLines(JSON.parse(legacy));
              if (m.length) {
                const t = computeCartTotals(m);
                return { ...current, lines: m, ...t };
              }
            }
          } catch {
            /* ignore */
          }
        }
        const t = computeCartTotals(lines);
        return { ...current, lines, ...t };
      },
    },
  ),
);

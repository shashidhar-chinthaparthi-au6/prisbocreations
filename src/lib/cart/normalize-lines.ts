import { cartLineId } from "@/lib/cart-line-id";
import type { CartLine } from "@/lib/store/cart-store";
import type {
  CustomizationDataMap,
  CustomizationFilesMap,
  CustomizationFieldDef,
} from "@/lib/customization-types";

/** Normalize persisted / API cart lines: ensure `id` and strip invalid rows. */
export function normalizeCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const l = x as Record<string, unknown>;
    const productId = typeof l.productId === "string" ? l.productId : "";
    if (!productId) continue;
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
        : cartLineId(productId, optionKey, {
            colorKey,
            customerImageUrl,
            customerNotes,
            giftWrap,
            giftMessage,
            customizationData,
            customizationFiles,
          });
    const slug = String(l.slug ?? "");
    const name = String(l.name ?? "");
    if (!slug || !name) continue;
    out.push({
      id,
      productId,
      slug,
      name,
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
    });
  }
  return out;
}

export function mergeCartLines(server: CartLine[], guest: CartLine[]): CartLine[] {
  const map = new Map<string, CartLine>();
  const add = (line: CartLine) => {
    const id = line.id;
    const prev = map.get(id);
    if (prev) {
      map.set(id, { ...prev, quantity: prev.quantity + line.quantity });
    } else {
      map.set(id, { ...line });
    }
  };
  for (const l of server) add(l);
  for (const l of guest) add(l);
  return Array.from(map.values());
}

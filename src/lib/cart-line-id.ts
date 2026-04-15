/** Stable fingerprint for cart merge when custom image/notes / gift differ. */
function customizationFingerprint(
  imageUrl?: string,
  notes?: string,
  giftWrap?: boolean,
  giftMessage?: string,
): string {
  const a = (imageUrl ?? "").trim();
  const b = (notes ?? "").trim();
  const g = giftWrap ? "1" : "0";
  const m = (giftMessage ?? "").trim();
  if (!a && !b && g === "0" && !m) return "";
  let h = 5381;
  const s = `${a}\n${b}\n${g}\n${m}`;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

/**
 * Cart row id: `productId::optSegments` then optional `::fp` when customised.
 * optSegments: option key and/or `c:colorKey` joined by `::` (empty when neither).
 */
export function cartLineId(
  productId: string,
  optionKey?: string,
  customization?: {
    colorKey?: string;
    customerImageUrl?: string;
    customerNotes?: string;
    giftWrap?: boolean;
    giftMessage?: string;
  },
): string {
  const opt = optionKey?.trim() ?? "";
  const col = customization?.colorKey?.trim() ?? "";
  const parts: string[] = [];
  if (opt) parts.push(opt);
  if (col) parts.push(`c:${col}`);
  const mid = parts.join("::");
  const base = `${productId}::${mid}`;
  const fp = customizationFingerprint(
    customization?.customerImageUrl,
    customization?.customerNotes,
    customization?.giftWrap,
    customization?.giftMessage,
  );
  return fp ? `${base}::${fp}` : base;
}

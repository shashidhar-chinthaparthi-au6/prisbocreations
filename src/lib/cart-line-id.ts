/** Stable fingerprint for cart merge when custom image/notes differ. */
function customizationFingerprint(imageUrl?: string, notes?: string): string {
  const a = (imageUrl ?? "").trim();
  const b = (notes ?? "").trim();
  if (!a && !b) return "";
  let h = 5381;
  const s = `${a}\n${b}`;
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
  );
  return fp ? `${base}::${fp}` : base;
}

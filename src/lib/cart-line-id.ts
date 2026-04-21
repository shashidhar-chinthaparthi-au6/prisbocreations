function djb2Hex(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

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
  return djb2Hex(`${a}\n${b}\n${g}\n${m}`);
}

function stableJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableJson).join(",")}]`;
  }
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableJson(rec[k])}`);
  return `{${parts.join(",")}}`;
}

function schemaCustomizationFingerprint(
  data?: Record<string, unknown>,
  files?: Record<string, unknown>,
): string {
  if (!data && !files) return "";
  return djb2Hex(`${stableJson(data ?? {})}|${stableJson(files ?? {})}`);
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
    customizationData?: Record<string, unknown>;
    customizationFiles?: Record<string, unknown>;
  },
): string {
  const opt = optionKey?.trim() ?? "";
  const col = customization?.colorKey?.trim() ?? "";
  const parts: string[] = [];
  if (opt) parts.push(opt);
  if (col) parts.push(`c:${col}`);
  const mid = parts.join("::");
  const base = `${productId}::${mid}`;
  const legacy = customizationFingerprint(
    customization?.customerImageUrl,
    customization?.customerNotes,
    customization?.giftWrap,
    customization?.giftMessage,
  );
  const schema = schemaCustomizationFingerprint(
    customization?.customizationData,
    customization?.customizationFiles,
  );
  const fp = [legacy, schema].filter(Boolean).join("|");
  return fp ? `${base}::${djb2Hex(fp)}` : base;
}

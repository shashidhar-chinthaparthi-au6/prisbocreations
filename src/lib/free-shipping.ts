/**
 * Free delivery when cart / order subtotal (excl. shipping) meets the threshold.
 *
 * Configure with either:
 * - `FREE_SHIPPING_THRESHOLD_PAISE` (server, e.g. order creation), or
 * - `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_PAISE` (browser + server fallback), integer paise.
 */
/** Default: ₹1,499 — matches storefront trust bar unless overridden. */
const DEFAULT_MIN_PAISE = 149_900;

function parseThresholdPaise(): number {
  const raw =
    process.env.FREE_SHIPPING_THRESHOLD_PAISE?.trim() ??
    process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_PAISE?.trim();
  if (!raw) return DEFAULT_MIN_PAISE;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN_PAISE;
}

let cached: number | null = null;
export function freeShippingMinPaise(): number {
  if (cached !== null) return cached;
  cached = parseThresholdPaise();
  return cached;
}

export function qualifiesForFreeShipping(subtotalPaise: number): boolean {
  return subtotalPaise >= freeShippingMinPaise();
}

/** Whole rupees for display (e.g. trust bar). */
export function freeShippingMinRupeesWhole(): number {
  return Math.round(freeShippingMinPaise() / 100);
}

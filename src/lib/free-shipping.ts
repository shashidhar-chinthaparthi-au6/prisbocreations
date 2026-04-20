/**
 * Free delivery when cart / order subtotal (excl. shipping) meets the threshold.
 *
 * Priority:
 * - `FREE_DELIVERY_THRESHOLD` — whole rupees (e.g. 1499), preferred for Shiprocket parity
 * - `FREE_SHIPPING_THRESHOLD_PAISE` / `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_PAISE` — integer paise
 */
/** Default: ₹1,499 — matches storefront trust bar unless overridden. */
const DEFAULT_MIN_PAISE = 149_900;

function parseThresholdPaise(): number {
  const fd = process.env.FREE_DELIVERY_THRESHOLD?.trim();
  if (fd) {
    const rupees = Number.parseFloat(fd);
    if (Number.isFinite(rupees) && rupees > 0) return Math.round(rupees * 100);
  }
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

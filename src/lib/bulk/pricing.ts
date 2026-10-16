/**
 * Volume prices for the bulk catalogue.
 *
 * Cost share is the blank, print, and pack, as a fraction of today's shop price,
 * before studio overhead. A tier is listed only when the rounded unit price still
 * clears that band's gross-margin floor. Made pieces (frames, lamps, hampers)
 * cannot take a 500+ discount without dropping through the floor, so that cell
 * stays a quote.
 */
export const BULK_QTYS = [50, 100, 250, 500] as const;
export type BulkQty = (typeof BULK_QTYS)[number];

export const BULK_PRICE_MOQ = 50;
export const BULK_ENQUIRY_MIN = 25;

export type MarginBand = "print" | "standard" | "made";

type BandSpec = {
  costShare: number;
  floor: number;
  discounts: Record<BulkQty, number>;
};

export const MARGIN_BANDS: Record<MarginBand, BandSpec> = {
  print: {
    costShare: 0.35,
    floor: 0.45,
    discounts: { 50: 0.1, 100: 0.16, 250: 0.22, 500: 0.28 },
  },
  standard: {
    costShare: 0.5,
    floor: 0.35,
    discounts: { 50: 0.08, 100: 0.12, 250: 0.16, 500: 0.2 },
  },
  made: {
    costShare: 0.64,
    floor: 0.3,
    discounts: { 50: 0.04, 100: 0.06, 250: 0.08, 500: 0.12 },
  },
};

/** Extra per piece when every unit carries a different name. Labour, on top of the tier. */
export const VARIABLE_NAME_ADDON_PAISE: Record<MarginBand, number> = {
  print: 1500,
  standard: 2500,
  made: 4000,
};

export const BULK_SLEEVE_PAISE = 1200;

export function tierUnitPaise(
  retailPaise: number,
  band: MarginBand,
  qty: BulkQty,
): number | null {
  if (!Number.isFinite(retailPaise) || retailPaise <= 0) return null;
  const spec = MARGIN_BANDS[band];
  const raw = retailPaise * (1 - spec.discounts[qty]);
  const unit = Math.round(raw / 100) * 100;
  if (unit <= 0 || unit >= retailPaise) return null;
  const cost = retailPaise * spec.costShare;
  const margin = (unit - cost) / unit;
  if (margin + 1e-9 < spec.floor) return null;
  return unit;
}

export function productionLead(band: MarginBand, qty: number): string {
  const heavy = band === "made";
  if (qty >= 500) return heavy ? "22–29 business days" : "18–25 business days";
  if (qty >= 250) return heavy ? "18–22 business days" : "14–18 business days";
  if (qty >= 100) return heavy ? "14–18 business days" : "10–14 business days";
  return heavy ? "11–14 business days" : "7–10 business days";
}

const MADE_NAME =
  /color-changing|colour-changing|wall art|key holders?|phone cases?|gift sets?|desk gift|\bbible\b|\bhampers?\b|\bframes?\b|\bplaques?\b|\bcrosses?\b|\blamps?\b|\bled\b|\bsigns?\b|\bcombos?\b/i;

const PRINT_NAME =
  /\b(pens?|bookmarks?|stickers?|cards?|wristbands?|lanyards?|badges?|pins?|magnets?|labels?|wrappers?|tissues?)\b/i;

const STANDARD_NAME =
  /\b(notebooks?|journals?|diar(?:y|ies)|calendars?|bottles?|mugs?|sippers?|t-?shirts?|tees?|totes?|bags?|keychains?|pencils?|posters?|cushions?|pillows?|canvas|maps?|collages?|polaroids?|return gifts?)\b/i;

/** Band for a shop product. Unknown pieces stay unpriced so we do not invent a discount. */
export function bandForProductName(name: string): MarginBand | null {
  if (MADE_NAME.test(name)) return "made";
  if (PRINT_NAME.test(name)) return "print";
  if (STANDARD_NAME.test(name)) return "standard";
  return null;
}

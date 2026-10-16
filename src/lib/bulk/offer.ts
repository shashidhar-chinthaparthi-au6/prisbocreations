import { GIFT_WRAP_PAISE } from "@/lib/gift-wrap";
import { formatInrFromPaise } from "@/lib/format";
import {
  BULK_PRICE_MOQ,
  BULK_QTYS,
  BULK_SLEEVE_PAISE,
  VARIABLE_NAME_ADDON_PAISE,
  productionLead,
  type BulkQty,
  type MarginBand,
} from "@/lib/bulk/pricing";

export const PROOF_LEAD = "1 business day";
export const COURIER_LEAD = "3–7 business days";

export const BUDGET_RANGES = [
  "Under ₹25,000",
  "₹25,000 – ₹75,000",
  "₹75,000 – ₹1,50,000",
  "₹1,50,000 – ₹5,00,000",
  "Above ₹5,00,000",
  "Not fixed yet",
] as const;

export const CUSTOMISATION_CHOICES = [
  "Same text on every piece",
  "Logo printing",
  "Photo or full-colour artwork",
  "A different name on each piece",
] as const;

export const PACKAGING_CHOICES = [
  "Bulk carton",
  "Individual kraft sleeve",
  "Gift box",
  "Branded sticker seal",
] as const;

export type OfferRow = {
  title: string;
  detail: string;
  price: string;
};

export function personalisationRows(): OfferRow[] {
  const names = `+ ${formatInrFromPaise(VARIABLE_NAME_ADDON_PAISE.print)} print · + ${formatInrFromPaise(VARIABLE_NAME_ADDON_PAISE.standard)} everyday · + ${formatInrFromPaise(VARIABLE_NAME_ADDON_PAISE.made)} made pieces`;
  return [
    {
      title: "Same line on every piece",
      detail: "A name, a verse, or a short message, printed the same way across the run.",
      price: "Included",
    },
    {
      title: "Logo, same on every piece",
      detail: "Send one artwork file. We print that logo on each piece from 50 units.",
      price: "Included from 50",
    },
    {
      title: "A different name on each piece",
      detail: "Each unit is set on its own, so this sits on top of the tier price.",
      price: names,
    },
    {
      title: "Photo or full-colour artwork",
      detail:
        "Included on pieces that already take a photo. On a text-only piece we quote it, because the print method can change.",
      price: "Included or quoted",
    },
  ];
}

export function packagingRows(): OfferRow[] {
  return [
    {
      title: "Bulk carton",
      detail: "Pieces packed together, with tissue between layers.",
      price: "Included",
    },
    {
      title: "Individual kraft sleeve",
      detail: "Each piece in a kraft sleeve, ready to hand out.",
      price: `+ ${formatInrFromPaise(BULK_SLEEVE_PAISE)} / piece`,
    },
    {
      title: "Gift box",
      detail: "The gift box from the shop, with room for a short message card.",
      price: `+ ${formatInrFromPaise(GIFT_WRAP_PAISE)} / piece`,
    },
    {
      title: "Branded sticker seal",
      detail: "Your logo on a seal or sticker. The sticker run is included from 100 pieces.",
      price: "Included from 100",
    },
  ];
}

export type DeliveryRow = {
  quantity: string;
  everyday: string;
  made: string;
  courier: string;
};

export function deliveryTable(): DeliveryRow[] {
  return BULK_QTYS.map((qty) => ({
    quantity: qty === 500 ? "500+" : String(qty),
    everyday: productionLead("print", qty),
    made: productionLead("made", qty),
    courier: COURIER_LEAD,
  }));
}

export function bandCaption(band: MarginBand): string {
  if (band === "print") return "Print run";
  if (band === "standard") return "Everyday piece";
  return "Made to order";
}

export function tierHeading(qty: BulkQty): string {
  return qty === 500 ? "500+" : String(qty);
}

export { BULK_PRICE_MOQ };

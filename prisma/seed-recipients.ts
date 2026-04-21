/**
 * Maps seeded catalog products to shop-by-recipient tags (MongoDB `recipients` array).
 * Used by prisma/seed.ts — rules follow the product-brief mapping from the storefront spec.
 */
import type { RecipientSlug } from "@/lib/recipients";

function uniq(slugs: RecipientSlug[]): RecipientSlug[] {
  return [...new Set(slugs)];
}

function occasionOf(spec: Record<string, string | number | boolean>): string {
  const o = spec.occasion;
  return typeof o === "string" ? o.toLowerCase() : "";
}

export function recipientsForCatalogProduct(
  subcategoryName: string,
  productName: string,
  specValues: Record<string, string | number | boolean>,
): RecipientSlug[] {
  const n = productName.toLowerCase();
  const occ = occasionOf(specValues);
  const sub = subcategoryName.trim();

  if (sub === "Chocolate Wrappers") {
    if (occ === "wedding") return ["couples"];
    if (occ === "corporate") return ["corporate", "him"];
    if (occ === "baby shower") return ["kids", "her"];
    if (occ === "anniversary") return ["couples", "her", "him"];
    return ["him", "her", "kids"];
  }

  if (sub === "Custom Stickers & Labels") {
    if (n.includes("logo")) return ["corporate", "him", "kids"];
    if (n.includes("thank you")) return ["her", "kids"];
    return ["kids", "her"];
  }

  if (sub === "Branded Tissue Paper") return ["corporate"];

  if (sub === "Custom Bottle Labels") {
    if (n.includes("wedding") || n.includes("wine")) return ["couples"];
    if (n.includes("corporate")) return ["corporate", "him"];
    return ["her", "kids"];
  }

  if (sub === "Tear-off Calendars") return ["him", "her", "corporate"];

  if (sub === "Photo Keychains") {
    if (n.includes("couple")) return ["couples"];
    if (n.includes("kids")) return ["kids"];
    if (n.includes("spotify")) return ["him", "her", "couples"];
    return ["him", "her"];
  }

  if (sub === "Desk Plaques") {
    if (n.includes("award")) return ["corporate", "him"];
    if (n.includes("led") || n.includes("office")) return ["him", "corporate"];
    return ["him", "corporate"];
  }

  if (sub === "Cake Toppers") {
    if (n.includes("wedding")) return ["couples"];
    if (n.includes("birthday")) return ["kids", "her"];
    return ["couples", "her"];
  }

  if (sub === "Custom Bag Tags") {
    if (n.includes("school") || n.includes("child")) return ["kids"];
    if (n.includes("luggage") || n.includes("travel")) return ["him", "kids"];
    return ["kids", "him"];
  }

  if (sub === "Acrylic Name Plates") {
    if (n.includes("hotel") || n.includes("room")) return ["corporate"];
    if (n.includes("office") || n.includes("desk")) return ["him", "corporate"];
    return ["him", "her", "corporate"];
  }

  if (sub === "Acrylic Fridge Magnets") return ["kids", "her", "him"];

  if (sub === "Journals & Notebooks") return ["him", "her"];

  if (sub === "Custom Bookmarks") return ["her", "him"];

  if (sub === "Desk Organizers") return ["him", "corporate"];

  if (sub === "Mousepads") {
    if (n.includes("kids")) return ["kids"];
    if (n.includes("xl") || n.includes("desk mat") || n.includes("90×")) return ["corporate", "him"];
    if (n.includes("family")) return ["couples", "her", "him"];
    return ["him", "her"];
  }

  if (sub === "Custom Pens") {
    if (n.includes("bamboo") || n.includes("gift box") || n.includes("set of 5")) return ["corporate", "him"];
    return ["him"];
  }

  if (sub === "Photo Fridge Magnets") {
    if (n.includes("heart")) return ["her", "couples"];
    return ["her", "couples", "him"];
  }

  if (sub === "Polaroid-Style Prints") return ["her", "couples", "him"];

  if (sub === "Customised Coasters") {
    if (n.includes("wedding")) return ["couples"];
    return ["her", "couples"];
  }

  if (sub === "Personalised Cushions") {
    if (n.includes("heart")) return ["couples", "her"];
    if (n.includes("sequin") || n.includes("magic")) return ["her", "couples"];
    return ["her", "him"];
  }

  if (sub === "Custom Mugs & Sippers") return ["him", "her", "couples"];

  if (sub === "Branded Caps") return ["corporate", "him"];

  if (sub === "Branded T-Shirts") {
    if (n.includes("corporate") || n.includes("polo") || n.includes("employee")) return ["corporate", "him"];
    if (n.includes("team")) return ["him", "corporate"];
    if (n.includes("oversized") || n.includes("graphic")) return ["her", "him"];
    return ["corporate", "him"];
  }

  return ["him", "her"];
}

export function normalizeRecipients(list: RecipientSlug[]): RecipientSlug[] {
  return uniq(list);
}

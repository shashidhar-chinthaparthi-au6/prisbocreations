import { connectDb } from "@/lib/db";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import { minOptionPricePaise } from "@/lib/product-options";
import { Product } from "@/lib/models/Product";
import { storefrontPublishedMatch } from "@/lib/services/storefrontCatalog";
import {
  BULK_PRICE_MOQ,
  BULK_QTYS,
  bandForProductName,
  productionLead,
  tierUnitPaise,
  type BulkQty,
  type MarginBand,
} from "@/lib/bulk/pricing";

export type BulkTierPrice = {
  qty: BulkQty;
  unitPaise: number | null;
};

export type BulkCatalogueItem = {
  id: string;
  name: string;
  slug?: string;
  category: string;
  imageUrl?: string;
  retailPaise: number;
  band: MarginBand | null;
  summary?: string;
  tiers: BulkTierPrice[];
  /** Listed volume prices start here. Empty when every tier is a quote. */
  moq: number | null;
  /** Studio time for the first listed tier, after proof approval. */
  leadTime: string | null;
};

type SeedRow = {
  name: string;
  category: string;
  retailRupees: number;
  summary: string;
};

const FALLBACK: SeedRow[] = [
  { name: "Quote Pens", category: "Stationery", retailRupees: 99, summary: "A pen printed with a short quote or name." },
  { name: "Scripture Pens", category: "Stationery", retailRupees: 129, summary: "A pen printed with a short scripture line." },
  { name: "Logo Pens", category: "Stationery", retailRupees: 149, summary: "A pen printed with a church or company logo." },
  { name: "Verse Notebooks", category: "Stationery", retailRupees: 299, summary: "A ruled notebook with a verse on the cover." },
  { name: "School Notebooks", category: "Stationery", retailRupees: 199, summary: "A school notebook with a name on the cover." },
  { name: "Bookmarks", category: "Stationery", retailRupees: 99, summary: "A printed bookmark with a name or verse." },
  { name: "Verse Diaries", category: "Stationery", retailRupees: 449, summary: "A dated diary with a verse on the cover." },
  { name: "Prayer Journals", category: "Stationery", retailRupees: 449, summary: "A journal with a name on the cover." },
  { name: "Calendars", category: "Stationery", retailRupees: 349, summary: "A twelve-month calendar with a photo or verse." },
  { name: "Desk Calendars", category: "Stationery", retailRupees: 299, summary: "A standing desk calendar with a photo or verse." },
  { name: "Greeting Cards", category: "Stationery", retailRupees: 199, summary: "A folded card with a photo or short message. Sold as a set of five." },
  { name: "Scripture Stickers", category: "Stationery", retailRupees: 99, summary: "A sheet of verse stickers." },
  { name: "Car Stickers", category: "Stationery", retailRupees: 149, summary: "A weatherproof sticker for a car window." },
  { name: "Kids' Pencil Boxes", category: "Stationery", retailRupees: 249, summary: "A pencil box with a child's name on the lid." },
  { name: "Verse Bottles", category: "Drinkware", retailRupees: 499, summary: "A steel bottle with a verse along the side." },
  { name: "School Water Bottles", category: "Drinkware", retailRupees: 399, summary: "A school bottle with a child's name." },
  { name: "Mugs", category: "Drinkware", retailRupees: 349, summary: "A ceramic mug with a name or verse." },
  { name: "Photo Mugs", category: "Drinkware", retailRupees: 399, summary: "A ceramic mug with a photo and a short line." },
  { name: "T-Shirts", category: "Wear and carry", retailRupees: 599, summary: "A cotton T-shirt with a verse or small logo." },
  { name: "Wristbands", category: "Wear and carry", retailRupees: 199, summary: "A silicone wristband with a short line." },
  { name: "Tote Bags", category: "Wear and carry", retailRupees: 499, summary: "A cotton tote with a verse or logo." },
  { name: "Event Gift Bags", category: "Wear and carry", retailRupees: 299, summary: "A paper gift bag printed for an event." },
  { name: "Keychains", category: "Wear and carry", retailRupees: 149, summary: "A small keychain with a name or photo." },
  { name: "Lanyards", category: "Wear and carry", retailRupees: 149, summary: "A lanyard with a name or short line." },
  { name: "Badges & Pins", category: "Wear and carry", retailRupees: 149, summary: "A badge or pin with a name or logo." },
  { name: "Verse Posters", category: "Home", retailRupees: 399, summary: "A poster with a verse, ready to frame." },
  { name: "Scripture Wall Art", category: "Home", retailRupees: 899, summary: "A framed scripture print for a wall." },
  { name: "Wooden Wall Crosses", category: "Home", retailRupees: 799, summary: "A wooden cross with a short line at the base." },
  { name: "LED Cross Lights", category: "Home", retailRupees: 999, summary: "A lighted cross for a shelf or wall." },
  { name: "Verse LED Lamps", category: "Home", retailRupees: 1299, summary: "A small LED lamp with a verse on the shade." },
  { name: "Photo Frames", category: "Home", retailRupees: 699, summary: "A frame for a photo and a short line." },
  { name: "Name Plaques", category: "Home", retailRupees: 899, summary: "A wooden plaque with a name." },
  { name: "Key Holders", category: "Home", retailRupees: 399, summary: "A wall key holder with a family name." },
  { name: "Personalized Bible Covers", category: "Home", retailRupees: 799, summary: "A Bible cover with a name on the front." },
  { name: "Photo Magnets", category: "Gifts", retailRupees: 199, summary: "A fridge magnet with a photo. Sold as a set of four." },
  { name: "Phone Cases", category: "Gifts", retailRupees: 499, summary: "A phone case with a photo or short line." },
  { name: "Return Gifts", category: "Gifts", retailRupees: 249, summary: "A small boxed gift with a name or verse. Sold as a set of ten." },
  { name: "Gift Hampers", category: "Gifts", retailRupees: 1499, summary: "A hamper of a few personalised pieces, packed together." },
];

export function buildCatalogueItem(input: {
  id: string;
  name: string;
  slug?: string;
  category: string;
  imageUrl?: string;
  retailPaise: number;
  summary?: string;
  band?: MarginBand | null;
}): BulkCatalogueItem {
  const band = input.band === undefined ? bandForProductName(input.name) : input.band;
  const tiers = BULK_QTYS.map((qty) => ({
    qty,
    unitPaise: band ? tierUnitPaise(input.retailPaise, band, qty) : null,
  }));
  const priced = tiers.some((tier) => tier.unitPaise != null);
  return {
    id: input.id,
    name: input.name,
    ...(input.slug ? { slug: input.slug } : {}),
    category: input.category || "Other",
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    retailPaise: input.retailPaise,
    band,
    ...(input.summary ? { summary: input.summary } : {}),
    tiers,
    moq: priced ? BULK_PRICE_MOQ : null,
    leadTime: band && priced ? productionLead(band, BULK_PRICE_MOQ) : null,
  };
}

function fallbackCatalogue(): BulkCatalogueItem[] {
  return FALLBACK.map((row) =>
    buildCatalogueItem({
      id: `fallback-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: row.name,
      category: row.category,
      retailPaise: row.retailRupees * 100,
      summary: row.summary,
    }),
  );
}

function categoryName(categoryId: unknown): string {
  if (categoryId && typeof categoryId === "object" && "name" in categoryId) {
    const name = (categoryId as { name?: unknown }).name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return "Other";
}

function colourImage(raw: unknown): string | undefined {
  if (!Array.isArray(raw)) return undefined;
  for (const variant of raw) {
    if (!variant || typeof variant !== "object") continue;
    const images = (variant as { images?: unknown }).images;
    if (!Array.isArray(images)) continue;
    for (const image of images) {
      if (typeof image === "string" && image.trim()) return image.trim();
      if (image && typeof image === "object" && typeof (image as { url?: unknown }).url === "string") {
        const url = (image as { url: string }).url.trim();
        if (url) return url;
      }
    }
  }
  return undefined;
}

function sortItems(items: BulkCatalogueItem[]): BulkCatalogueItem[] {
  return [...items].sort((a, b) => {
    const cat = a.category.localeCompare(b.category, "en");
    if (cat) return cat;
    const priced = Number(b.moq != null) - Number(a.moq != null);
    if (priced) return priced;
    return a.name.localeCompare(b.name, "en");
  });
}

function trimCatalogue(items: BulkCatalogueItem[]): BulkCatalogueItem[] {
  const priced = items.filter((item) => item.moq != null).slice(0, 80);
  const quoted = items.filter((item) => item.moq == null).slice(0, 20);
  return sortItems([...priced, ...quoted]);
}

export async function loadBulkCatalogue(): Promise<BulkCatalogueItem[]> {
  try {
    await connectDb();
    const docs = await Product.find(storefrontPublishedMatch())
      .select("name slug pricePaise options images colorVariants colourVariants categoryId")
      .populate("categoryId", "name")
      .sort({ name: 1 })
      .limit(160)
      .lean();

    const live: BulkCatalogueItem[] = [];
    for (const doc of docs) {
      const name = typeof doc.name === "string" ? doc.name.trim() : "";
      if (!name) continue;
      const retailPaise = minOptionPricePaise({
        pricePaise: typeof doc.pricePaise === "number" ? doc.pricePaise : 0,
        options: doc.options,
      });
      if (!Number.isFinite(retailPaise) || retailPaise <= 0) continue;
      const images = Array.isArray(doc.images)
        ? doc.images.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
        : [];
      const imageUrl =
        listingPrimaryThumb(images, colorVariantsFromDoc(doc)) ||
        colourImage(doc.colourVariants) ||
        images[0];
      live.push(
        buildCatalogueItem({
          id: String(doc._id),
          name,
          slug: typeof doc.slug === "string" ? doc.slug : undefined,
          category: categoryName(doc.categoryId),
          ...(imageUrl ? { imageUrl } : {}),
          retailPaise,
        }),
      );
    }

    if (live.length === 0) return fallbackCatalogue();
    return trimCatalogue(live);
  } catch (err) {
    console.error("Bulk catalogue fell back to the studio list:", err);
    return fallbackCatalogue();
  }
}

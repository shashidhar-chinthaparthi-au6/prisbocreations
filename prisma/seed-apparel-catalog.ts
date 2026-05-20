import type { HydratedDocument } from "mongoose";
import type { CategoryDoc } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import { SchemaField } from "@/lib/models/SchemaField";
import { Subcategory } from "@/lib/models/Subcategory";
import { syncStorefrontFromAdminProduct } from "@/lib/admin/product-storefront-sync";
import { uniqueProductSlug } from "@/lib/admin/slug-unique";
import { customizationFieldsForSubcategory } from "@/lib/customization-fields-catalog";
import catalog from "./apparel-catalog.json";

function skuBase(name: string): string {
  const n = name
    .split(" ")
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PRI-${n}-${r}`;
}

const TSHIRT_FIELDS = [
  { key: "type", label: "Style", fieldType: "select" as const, options: ["Round Neck", "Polo", "V-Neck", "Oversized", "Henley", "Raglan", "Sleeveless", "Hoodie", "Zipper Hoodie"], isHighlight: true, isRequired: false, displayOrder: 0 },
  { key: "fabric", label: "Fabric / GSM", fieldType: "text" as const, options: [], isHighlight: true, isRequired: false, displayOrder: 1 },
  { key: "print", label: "Print method", fieldType: "select" as const, options: ["DTF Transfer", "Sublimation (full front)", "Screen Print", "Embroidery"], isHighlight: true, isRequired: false, displayOrder: 2 },
  { key: "custom", label: "Customisation", fieldType: "text" as const, options: [], isHighlight: false, isRequired: false, displayOrder: 3 },
];

const CAP_FIELDS = [
  { key: "type", label: "Cap style", fieldType: "select" as const, options: ["6-Panel Baseball Cap", "Dad Hat", "Snapback", "Trucker", "5-Panel Camp Cap", "Bucket Hat", "Beanie"], isHighlight: true, isRequired: false, displayOrder: 0 },
  { key: "fabric", label: "Fabric", fieldType: "text" as const, options: [], isHighlight: true, isRequired: false, displayOrder: 1 },
  { key: "print", label: "Print method", fieldType: "select" as const, options: ["Embroidery", "DTF", "Sublimation Patch", "Screen Print"], isHighlight: true, isRequired: false, displayOrder: 2 },
  { key: "custom", label: "Customisation", fieldType: "text" as const, options: [], isHighlight: false, isRequired: false, displayOrder: 3 },
];

const PKG = {
  tshirts: { weightKg: 0.3, lengthCm: 35, breadthCm: 28, heightCm: 3 },
  caps: { weightKg: 0.2, lengthCm: 30, breadthCm: 25, heightCm: 15 },
};

export async function seedApparelCatalog(
  catTextile: HydratedDocument<CategoryDoc>
): Promise<void> {
  // ── T-Shirts subcategory ──────────────────────────────────────────────────
  const tshirtSub = await Subcategory.create({
    categoryId: catTextile._id,
    name: "Custom T-Shirts",
    slug: "custom-t-shirts",
    sortOrder: 5,
    description:
      "Premium custom-printed t-shirts — round neck, polo, oversized, hoodies and more.",
  });
  for (const f of TSHIRT_FIELDS) {
    await SchemaField.create({ subcategoryId: tshirtSub._id, ...f });
  }

  // ── Caps & Headwear subcategory ───────────────────────────────────────────
  const capSub = await Subcategory.create({
    categoryId: catTextile._id,
    name: "Branded Caps & Headwear",
    slug: "branded-caps-headwear",
    sortOrder: 6,
    description:
      "Custom-printed caps, bucket hats, trucker hats and beanies for teams and brands.",
  });
  for (const f of CAP_FIELDS) {
    await SchemaField.create({ subcategoryId: capSub._id, ...f });
  }

  // ── Seed products ─────────────────────────────────────────────────────────
  const tshirtItems = catalog.filter((x) => x.category === "tshirts");
  const capItems = catalog.filter((x) => x.category === "caps");

  for (const item of catalog) {
    const isCap = item.category === "caps";
    const sub = isCap ? capSub : tshirtSub;
    const pkg = isCap ? PKG.caps : PKG.tshirts;
    const subcategoryName = isCap ? "Branded Caps & Headwear" : "Custom T-Shirts";

    const base = skuBase(item.prisboName);
    const slugStr = await uniqueProductSlug(item.prisboName);

    const colourVariants = item.colourVariants.map((v) => ({
      displayName: v.displayName,
      hexCode: v.hexCode,
      skuSuffix: v.skuSuffix,
      basePrice: v.basePrice,
      mrp: v.mrp,
      isActive: true,
      displayOrder: v.displayOrder,
      images: v.images.map((img, i) => ({
        url: img.url,
        isPrimary: i === 0,
        displayOrder: i,
        altText: item.prisboName,
      })),
      sizeStocks: v.sizeStocks.map((s) => ({
        size: s.size,
        stock: s.stock,
        priceOverride: null,
        isActive: true,
      })),
    }));

    const customizationFields = customizationFieldsForSubcategory(subcategoryName);

    const doc = await Product.create({
      name: item.prisboName,
      slug: slugStr,
      brand: "Prisbo Creations",
      skuBase: base,
      sku: base,
      subcategoryId: sub._id,
      categoryId: catTextile._id,
      hasColourVariants: true,
      hasSizePricing: false,
      sizesNotApplicable: isCap,
      weightKg: pkg.weightKg,
      lengthCm: pkg.lengthCm,
      breadthCm: pkg.breadthCm,
      heightCm: pkg.heightCm,
      description: "",
      descriptionTemplate: item.prisboDescription,
      specValues: {
        type: item.type,
        fabric: item.fabric ?? "",
        print: item.printMethods[0] ?? "",
        custom: item.customizationTextPlaceholder ?? "",
      },
      recipients: item.recipients,
      status: "PUBLISHED",
      publishedAt: new Date(),
      manufacturerName: "Prisbo Creations Studio",
      manufacturerAddress: "Hyderabad, Telangana, India",
      packerSameAsMfr: true,
      countryOfOrigin: "India",
      genericName: item.prisboName,
      pricePaise: 0,
      stock: 0,
      isActive: true,
      colourVariants,
      allowCustomerCustomization: customizationFields.length > 0,
      customizationFields,
    });

    await syncStorefrontFromAdminProduct(String(doc._id));
  }

  console.log(
    `✓ Apparel: ${tshirtItems.length} t-shirts + ${capItems.length} caps seeded`
  );
}

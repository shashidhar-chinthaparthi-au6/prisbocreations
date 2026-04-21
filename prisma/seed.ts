/**
 * Full catalog wipe + reseed for Prisbo Creations (MongoDB / Mongoose).
 * Run: npx tsx prisma/seed.ts
 *
 * Note: This codebase uses Mongoose for products (there is no Prisma `migrate` for this schema).
 * Product `recipients` (string[] of shop-by-recipient slugs) is defined on the
 * Mongoose model in `src/lib/models/Product.ts`. Re-run this seed to repopulate.
 * Deletion order matches the relational layout from the original spec.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";
import type { Types } from "mongoose";
import bcrypt from "bcryptjs";
import { computeInitials } from "@/lib/account/compute-initials";
import { syncStorefrontFromAdminProduct } from "@/lib/admin/product-storefront-sync";
import { uniqueProductSlug } from "@/lib/admin/slug-unique";
import { Address } from "@/lib/models/Address";
import { Category } from "@/lib/models/Category";
import { Coupon } from "@/lib/models/Coupon";
import { NewsletterSubscriber } from "@/lib/models/NewsletterSubscriber";
import { NotificationLog } from "@/lib/models/NotificationLog";
import { Order } from "@/lib/models/Order";
import { Payment } from "@/lib/models/Payment";
import { Product } from "@/lib/models/Product";
import { Review } from "@/lib/models/Review";
import { ReviewVote } from "@/lib/models/ReviewVote";
import { SchemaField } from "@/lib/models/SchemaField";
import type { FieldType } from "@/lib/models/schema-field-constants";
import { Subcategory } from "@/lib/models/Subcategory";
import { TrackingEvent } from "@/lib/models/TrackingEvent";
import { User } from "@/lib/models/User";
import { Wishlist } from "@/lib/models/Wishlist";
import type { RecipientSlug } from "@/lib/recipients";
import { recipientsForCatalogProduct, normalizeRecipients } from "./seed-recipients";
import { customizationFieldsForSubcategory } from "@/lib/customization-fields-catalog";

function requireMongoUri(): string {
  const u = process.env.MONGODB_URI;
  if (!u) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }
  return u;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function skuBase(brand: string, name: string): string {
  const b = brand.slice(0, 3).toUpperCase();
  const n = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${b}-${n}-${r}`;
}

const IMG = {
  chocolate: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&q=80",
  sticker: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  tissue: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80",
  bottle: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80",
  calendar: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&q=80",
  keychain: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80",
  plaque: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&q=80",
  topper: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80",
  bagtag: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&q=80",
  nameplate: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
  magnet: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&q=80",
  journal: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80",
  bookmark: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
  organizer: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80",
  mousepad: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&q=80",
  pen: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=600&q=80",
  flexmagnet: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600&q=80",
  polaroid: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80",
  coaster: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
  cushion: "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=80",
  mug: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&q=80",
  cap: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80",
  tshirt: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80",
} as const;

type ImgKey = keyof typeof IMG;

type SeedVariant = {
  displayName: string;
  hexCode: string;
  skuSuffix: string;
  stock: number;
  sizes?: { size: string; stock: number }[];
};

type SeedPackageDims = {
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
};

type SeedProduct = {
  name: string;
  brand: string;
  description: string;
  mrp: number;
  price: number;
  imageKey: ImgKey;
  imageKey2?: ImgKey;
  hasColourVariants: boolean;
  hasSizePricing: boolean;
  sizesNotApplicable: boolean;
  variants: SeedVariant[];
  specValues: Record<string, string | number | boolean>;
  /** When set, overrides automatic recipient tagging from subcategory + name rules. */
  recipients?: RecipientSlug[];
  /** Override default packed dimensions for this subcategory (see SUBCAT_PKG). */
  pkgOverride?: SeedPackageDims;
};

/** Default packed dimensions by subcategory name (matches `seed-catalog-blocks.ts`). */
const SUBCAT_PKG: Record<string, SeedPackageDims> = {
  "Chocolate Wrappers": { weightKg: 0.3, lengthCm: 25, breadthCm: 20, heightCm: 3 },
  "Custom Stickers & Labels": { weightKg: 0.2, lengthCm: 20, breadthCm: 15, heightCm: 2 },
  "Branded Tissue Paper": { weightKg: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 },
  "Custom Bottle Labels": { weightKg: 0.2, lengthCm: 20, breadthCm: 15, heightCm: 2 },
  "Tear-off Calendars": { weightKg: 0.4, lengthCm: 22, breadthCm: 16, heightCm: 3 },
  "Photo Keychains": { weightKg: 0.1, lengthCm: 12, breadthCm: 10, heightCm: 3 },
  "Desk Plaques": { weightKg: 0.6, lengthCm: 30, breadthCm: 25, heightCm: 8 },
  "Cake Toppers": { weightKg: 0.1, lengthCm: 25, breadthCm: 5, heightCm: 3 },
  "Custom Bag Tags": { weightKg: 0.1, lengthCm: 15, breadthCm: 8, heightCm: 2 },
  "Acrylic Name Plates": { weightKg: 0.5, lengthCm: 28, breadthCm: 20, heightCm: 6 },
  "Acrylic Fridge Magnets": { weightKg: 0.1, lengthCm: 15, breadthCm: 10, heightCm: 2 },
  "Journals & Notebooks": { weightKg: 0.5, lengthCm: 22, breadthCm: 16, heightCm: 3 },
  "Custom Bookmarks": { weightKg: 0.1, lengthCm: 22, breadthCm: 8, heightCm: 2 },
  "Desk Organizers": { weightKg: 1.2, lengthCm: 35, breadthCm: 20, heightCm: 15 },
  Mousepads: { weightKg: 0.4, lengthCm: 32, breadthCm: 28, heightCm: 4 },
  "Custom Pens": { weightKg: 0.1, lengthCm: 18, breadthCm: 5, heightCm: 3 },
  "Photo Fridge Magnets": { weightKg: 0.2, lengthCm: 20, breadthCm: 15, heightCm: 2 },
  "Polaroid-Style Prints": { weightKg: 0.3, lengthCm: 15, breadthCm: 12, heightCm: 4 },
  "Customised Coasters": { weightKg: 0.5, lengthCm: 20, breadthCm: 20, heightCm: 5 },
  "Personalised Cushions": { weightKg: 0.8, lengthCm: 45, breadthCm: 45, heightCm: 12 },
  /** Default: ceramic / magic mug 325ml; override sipper & conical in seed data. */
  "Custom Mugs & Sippers": { weightKg: 0.5, lengthCm: 14, breadthCm: 11, heightCm: 11 },
  "Branded Caps": { weightKg: 0.2, lengthCm: 30, breadthCm: 25, heightCm: 15 },
  "Branded T-Shirts": { weightKg: 0.3, lengthCm: 35, breadthCm: 28, heightCm: 3 },
};

async function clearAll(): Promise<void> {
  await NotificationLog.deleteMany({});
  await TrackingEvent.deleteMany({});
  await Payment.deleteMany({});
  await Order.deleteMany({});
  await ReviewVote.deleteMany({});
  await Review.deleteMany({});
  await Wishlist.deleteMany({});
  await NewsletterSubscriber.deleteMany({});
  await Product.deleteMany({});
  await SchemaField.deleteMany({});
  await Subcategory.deleteMany({});
  await Category.deleteMany({});
  await Address.deleteMany({});
  await User.deleteMany({});
  await Coupon.deleteMany({});
  console.log("✓ All tables cleared");
}

async function seedSubcategory(data: {
  categoryId: Types.ObjectId;
  name: string;
  displayOrder: number;
  description?: string;
  fields: {
    key: string;
    label: string;
    type: FieldType;
    options?: string[];
    isHighlight: boolean;
    isRequired: boolean;
    displayOrder: number;
  }[];
  products: SeedProduct[];
}): Promise<void> {
  const sub = await Subcategory.create({
    categoryId: data.categoryId,
    name: data.name,
    slug: slug(data.name),
    sortOrder: data.displayOrder,
    description: data.description ?? "",
  });

  for (const f of data.fields) {
    await SchemaField.create({
      subcategoryId: sub._id,
      key: f.key,
      label: f.label,
      fieldType: f.type,
      options: f.options ?? [],
      isHighlight: f.isHighlight,
      isRequired: f.isRequired,
      displayOrder: f.displayOrder,
    });
  }

  for (const p of data.products) {
    const base = skuBase(p.brand, p.name);
    const slugStr = await uniqueProductSlug(p.name);
    const pkg = p.pkgOverride ?? SUBCAT_PKG[data.name];
    if (!pkg) {
      throw new Error(`SUBCAT_PKG missing for subcategory: ${data.name}`);
    }

    const colourVariants = p.variants.map((v, vi) => {
      const images: {
        url: string;
        isPrimary: boolean;
        displayOrder: number;
        altText?: string;
      }[] = [
        {
          url: IMG[p.imageKey],
          isPrimary: true,
          displayOrder: 0,
          altText: p.name,
        },
      ];
      if (p.imageKey2) {
        images.push({
          url: IMG[p.imageKey2],
          isPrimary: false,
          displayOrder: 1,
          altText: `${p.name} view 2`,
        });
      }

      let sizeStocks: { size: string; stock: number; priceOverride: number | null; isActive: boolean }[];
      if (p.sizesNotApplicable) {
        sizeStocks = [
          { size: "one-size", stock: v.stock, priceOverride: null, isActive: true },
        ];
      } else if (v.sizes && v.sizes.length > 0) {
        sizeStocks = v.sizes.map((s) => ({
          size: s.size,
          stock: s.stock,
          priceOverride: null,
          isActive: true,
        }));
      } else {
        sizeStocks = [{ size: "ONE", stock: 0, priceOverride: null, isActive: true }];
      }

      return {
        displayName: v.displayName,
        hexCode: v.hexCode,
        skuSuffix: v.skuSuffix,
        basePrice: p.price,
        mrp: p.mrp,
        isActive: true,
        displayOrder: vi,
        images,
        sizeStocks,
      };
    });

    const recipients =
      p.recipients?.length ?
        normalizeRecipients(p.recipients)
      : normalizeRecipients(recipientsForCatalogProduct(data.name, p.name, p.specValues));

    const customizationFields = customizationFieldsForSubcategory(data.name);
    const doc = await Product.create({
      name: p.name,
      slug: slugStr,
      brand: p.brand,
      skuBase: base,
      sku: base,
      subcategoryId: sub._id,
      categoryId: data.categoryId,
      hasColourVariants: p.hasColourVariants,
      hasSizePricing: p.hasSizePricing,
      sizesNotApplicable: p.sizesNotApplicable,
      weightKg: pkg.weightKg,
      lengthCm: pkg.lengthCm,
      breadthCm: pkg.breadthCm,
      heightCm: pkg.heightCm,
      description: "",
      descriptionTemplate: p.description,
      specValues: p.specValues,
      recipients,
      status: "PUBLISHED",
      publishedAt: new Date(),
      manufacturerName: "Prisbo Creations Studio",
      manufacturerAddress: "Hyderabad, Telangana, India",
      packerSameAsMfr: true,
      countryOfOrigin: "India",
      genericName: p.name,
      pricePaise: 0,
      stock: 0,
      isActive: true,
      colourVariants,
      allowCustomerCustomization: customizationFields.length > 0,
      customizationFields,
    });

    await syncStorefrontFromAdminProduct(String(doc._id));
  }

  console.log(`  ✓ ${data.name} — ${data.products.length} products`);
}

async function upsertCoupons(): Promise<void> {
  const rows = [
    {
      code: "WELCOME10",
      type: "PERCENT" as const,
      value: 10,
      minOrderValuePaise: 500 * 100,
      maxUses: 1000,
      usedCount: 0,
      isActive: true,
    },
    {
      code: "PRISBO20",
      type: "PERCENT" as const,
      value: 20,
      minOrderValuePaise: 1000 * 100,
      maxUses: 500,
      usedCount: 0,
      isActive: true,
    },
    {
      code: "FLAT100",
      type: "FIXED" as const,
      value: 100,
      minOrderValuePaise: 799 * 100,
      maxUses: 200,
      usedCount: 0,
      isActive: true,
    },
    {
      code: "FREESHIP",
      type: "FIXED" as const,
      value: 60,
      minOrderValuePaise: 0,
      maxUses: 100,
      usedCount: 0,
      isActive: true,
    },
  ];

  for (const c of rows) {
    await Coupon.findOneAndUpdate(
      { code: c.code },
      {
        $set: {
          type: c.type,
          value: c.value,
          minOrderValuePaise: c.minOrderValuePaise,
          maxUses: c.maxUses,
          usedCount: c.usedCount,
          isActive: c.isActive,
        },
      },
      { upsert: true },
    );
  }
  console.log("✓ 4 coupons upserted");
}

/**
 * `clearAll()` removes every user. If `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`
 * are set in `.env.local`, recreate the admin so JWT login still works after a full seed.
 */
async function upsertAdminFromEnv(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) {
    console.log(
      "ℹ Skipping admin upsert — set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local to restore admin after seed.",
    );
    return;
  }
  const hash = await bcrypt.hash(adminPass, 12);
  const name = "Prisbo Admin";
  await User.findOneAndUpdate(
    { email: adminEmail.toLowerCase() },
    {
      $set: {
        email: adminEmail.toLowerCase(),
        passwordHash: hash,
        name,
        avatarInitials: computeInitials(name),
        role: "admin",
      },
    },
    { upsert: true },
  );
  console.log(`✓ Admin upserted: ${adminEmail.toLowerCase()}`);
}

async function main(): Promise<void> {
  await mongoose.connect(requireMongoUri());

  await clearAll();

  const catPaper = await Category.create({
    name: "Paper & Packaging",
    slug: "paper-packaging",
    sortOrder: 1,
    description:
      "High-quality personalised print products for gifting, events, and branding.",
    imageUrl: IMG.chocolate,
  });

  const catAcrylic = await Category.create({
    name: "Acrylic & Resin Items",
    slug: "acrylic-resin-items",
    sortOrder: 2,
    description:
      "Premium laser-cut and UV-printed acrylic gifts — keychains, plaques, cake toppers and more.",
    imageUrl: IMG.keychain,
  });

  const catStationery = await Category.create({
    name: "Stationery & Desk Accessories",
    slug: "stationery-desk-accessories",
    sortOrder: 3,
    description: "Personalised stationery and desk items for students and professionals.",
    imageUrl: IMG.journal,
  });

  const catDecor = await Category.create({
    name: "Home Decor & Lifestyle",
    slug: "home-decor-lifestyle",
    sortOrder: 4,
    description: "Personalised home decor items — magnets, prints, coasters and more.",
    imageUrl: IMG.coaster,
  });

  const catTextile = await Category.create({
    name: "Textiles & Apparel",
    slug: "textiles-apparel",
    sortOrder: 5,
    description: "Sublimation-printed personalised cushions, mugs, caps and t-shirts.",
    imageUrl: IMG.mug,
  });

  console.log("✓ 5 categories created");

  // ── Load catalog blocks from generated data file ─────────────────────
  const { runCatalogBlocks } = await import("./seed-catalog-blocks");
  await runCatalogBlocks({
    catPaper,
    catAcrylic,
    catStationery,
    catDecor,
    catTextile,
    seedSubcategory,
  });

  await upsertCoupons();

  const variantArrays = await Product.find({}).select("colourVariants").lean();
  let variantCount = 0;
  let imageCount = 0;
  let sizeStockCount = 0;
  for (const p of variantArrays) {
    const cvs = p.colourVariants ?? [];
    variantCount += cvs.length;
    for (const v of cvs) {
      imageCount += (v.images ?? []).length;
      sizeStockCount += (v.sizeStocks ?? []).length;
    }
  }

  const counts = {
    categories: await Category.countDocuments(),
    subcategories: await Subcategory.countDocuments(),
    schemaFields: await SchemaField.countDocuments(),
    products: await Product.countDocuments(),
    variants: variantCount,
    images: imageCount,
    sizeStocks: sizeStockCount,
    coupons: await Coupon.countDocuments(),
  };

  console.log("\n✅ SEED COMPLETE");
  console.log(JSON.stringify(counts, null, 2));

  await upsertAdminFromEnv();

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

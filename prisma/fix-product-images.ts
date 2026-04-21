/**
 * Normalize seeded Unsplash URLs (MongoDB). Run: npx tsx prisma/fix-product-images.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";
import { syncStorefrontFromAdminProduct } from "@/lib/admin/product-storefront-sync";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";

const IMAGE_MAP: Record<string, string> = {
  chocolate:
    "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800&h=800&fit=crop&q=80",
  sticker:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop&q=80",
  tissue:
    "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=800&fit=crop&q=80",
  bottle:
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop&q=80",
  calendar:
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=800&fit=crop&q=80",
  keychain:
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=800&fit=crop&q=80",
  plaque:
    "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=800&h=800&fit=crop&q=80",
  topper:
    "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&h=800&fit=crop&q=80",
  bagtag:
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop&q=80",
  nameplate:
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=800&fit=crop&q=80",
  magnet:
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&h=800&fit=crop&q=80",
  journal:
    "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=800&h=800&fit=crop&q=80",
  bookmark:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80",
  organizer:
    "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&h=800&fit=crop&q=80",
  mousepad:
    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&h=800&fit=crop&q=80",
  pen: "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=800&h=800&fit=crop&q=80",
  flexmagnet:
    "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&h=800&fit=crop&q=80",
  polaroid:
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=800&fit=crop&q=80",
  coaster:
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop&q=80",
  cushion:
    "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&h=800&fit=crop&q=80",
  mug: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=800&fit=crop&q=80",
  cap: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop&q=80",
  tshirt:
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop&q=80",
};

function extractUnsplashPhotoId(url: string): string | null {
  const m = url.match(/images\.unsplash\.com\/(photo-[^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

const photoIdToCanonical = new Map<string, string>();
for (const url of Object.values(IMAGE_MAP)) {
  const id = extractUnsplashPhotoId(url);
  if (id) photoIdToCanonical.set(id, url);
}

function canonicalUnsplashUrl(url: string): string | null {
  if (!url.includes("images.unsplash.com")) return null;
  const id = extractUnsplashPhotoId(url);
  if (!id) return null;
  return photoIdToCanonical.get(id) ?? null;
}

function requireMongoUri(): string {
  const u = process.env.MONGODB_URI;
  if (!u) {
    console.error("MONGODB_URI missing");
    process.exit(1);
  }
  return u;
}

async function main(): Promise<void> {
  await mongoose.connect(requireMongoUri());

  let variantImagesUpdated = 0;
  const products = await Product.find({
    "colourVariants.images.url": { $regex: /images\.unsplash\.com/i },
  }).exec();

  for (const doc of products) {
    let touched = false;
    const cvs = doc.colourVariants ?? [];
    for (const cv of cvs) {
      for (const im of cv.images ?? []) {
        const next = canonicalUnsplashUrl(im.url);
        if (next && next !== im.url) {
          im.url = next;
          touched = true;
          variantImagesUpdated += 1;
        }
      }
    }
    if (touched) {
      doc.markModified("colourVariants");
      await doc.save();
      if (typeof doc.skuBase === "string" && doc.skuBase.trim()) {
        await syncStorefrontFromAdminProduct(String(doc._id));
      }
    }
  }

  const catUpdates = [
    { slug: "paper-packaging", imageUrl: IMAGE_MAP.chocolate },
    { slug: "acrylic-resin-items", imageUrl: IMAGE_MAP.keychain },
    { slug: "stationery-desk-accessories", imageUrl: IMAGE_MAP.journal },
    { slug: "home-decor-lifestyle", imageUrl: IMAGE_MAP.coaster },
    { slug: "textiles-apparel", imageUrl: IMAGE_MAP.mug },
  ] as const;

  let categoriesUpdated = 0;
  for (const c of catUpdates) {
    const r = await Category.updateOne({ slug: c.slug }, { $set: { imageUrl: c.imageUrl } });
    if (r.matchedCount) categoriesUpdated += 1;
  }

  console.log(`✓ Updated ${variantImagesUpdated} variant image URLs across ${products.length} products (where changed)`);
  console.log(`✓ Updated ${categoriesUpdated} category images`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

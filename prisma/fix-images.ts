/**
 * Update category `imageUrl` to stable images.unsplash.com URLs (MongoDB / Mongoose).
 * Run: npx tsx prisma/fix-images.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";
import { CATEGORY_CARD_IMAGE_BY_SLUG } from "@/lib/category-hero-images";
import { Category } from "@/lib/models/Category";

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

  for (const [slug, imageUrl] of Object.entries(CATEGORY_CARD_IMAGE_BY_SLUG)) {
    const r = await Category.updateOne({ slug }, { $set: { imageUrl } });
    if (r.matchedCount === 0) {
      console.warn(`⚠ No category with slug: ${slug}`);
    } else {
      console.log(`✓ Updated ${slug}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

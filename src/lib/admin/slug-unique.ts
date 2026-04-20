import { Product } from "@/lib/models/Product";
import { slugify } from "@/lib/slugify";
import mongoose from "mongoose";

export async function uniqueProductSlug(name: string, excludeProductId?: string): Promise<string> {
  const base = slugify(name) || "product";
  let candidate = base;
  let n = 1;
  const exclude =
    excludeProductId && mongoose.isValidObjectId(excludeProductId)
      ? new mongoose.Types.ObjectId(excludeProductId)
      : null;
  for (;;) {
    const exists = await Product.findOne({
      slug: candidate,
      ...(exclude ? { _id: { $ne: exclude } } : {}),
    })
      .select("_id")
      .lean();
    if (!exists) return candidate;
    candidate = `${base}-${n++}`;
  }
}

import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Product } from "@/lib/models/Product";
import {
  productToStorefrontCard,
  storefrontPublishedMatch,
} from "@/lib/services/storefrontCatalog";
import type { ProductDoc } from "@/lib/models/Product";
import { Subcategory } from "@/lib/models/Subcategory";

export async function GET(req: Request) {
  const productId = new URL(req.url).searchParams.get("productId")?.trim() ?? "";
  if (!productId || !mongoose.isValidObjectId(productId)) {
    return jsonError("productId required", 400);
  }
  await connectDb();
  const p = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    ...storefrontPublishedMatch(),
  })
    .select("subcategoryId")
    .lean();
  if (!p?.subcategoryId) {
    return jsonOk({ items: [] });
  }
  const subId = p.subcategoryId;
  const others = await Product.find({
    subcategoryId: subId,
    _id: { $ne: new mongoose.Types.ObjectId(productId) },
    ...storefrontPublishedMatch(),
  })
    .sort({ updatedAt: -1 })
    .limit(8)
    .lean();

  const sub = await Subcategory.findById(subId).select("name").lean();
  const subName = sub?.name ? String(sub.name) : undefined;

  const items = others.slice(0, 4).map((row) =>
    productToStorefrontCard(row as ProductDoc, { subcategoryName: subName }),
  );
  return jsonOk({ items });
}

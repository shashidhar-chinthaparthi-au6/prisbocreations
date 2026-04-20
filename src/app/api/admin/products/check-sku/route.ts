import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { isSkuBaseAvailable } from "@/lib/services/adminCatalogBackend";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const sku = url.searchParams.get("skuBase")?.trim();
  const exclude = url.searchParams.get("excludeProductId")?.trim();
  if (!sku) return jsonError("skuBase required", 400);
  if (exclude && !mongoose.isValidObjectId(exclude)) {
    return jsonError("Invalid exclude id", 400);
  }
  await connectDb();
  const available = await isSkuBaseAvailable(sku, exclude ?? undefined);
  return jsonOk({ available });
}

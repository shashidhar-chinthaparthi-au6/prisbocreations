import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zObjectId } from "@/lib/admin/zod-objectid";
import { findProductIdByColourVariantId, reorderVariantImages } from "@/lib/services/adminCatalogBackend";

const bodyZ = z.object({ orderedIds: z.array(zObjectId) });

export async function PATCH(req: Request, ctx: { params: Promise<{ varId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { varId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = bodyZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  const productId = await findProductIdByColourVariantId(varId);
  if (!productId) return jsonError("Variant not found", 404);
  const doc = await reorderVariantImages(productId, varId, parsed.data.orderedIds);
  return jsonOk(doc);
}

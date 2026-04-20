import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { deleteVariantImage, findProductIdByColourVariantId } from "@/lib/services/adminCatalogBackend";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ varId: string; imgId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { varId, imgId } = await ctx.params;
  await connectDb();
  const productId = await findProductIdByColourVariantId(varId);
  if (!productId) return jsonError("Variant not found", 404);
  const doc = await deleteVariantImage(productId, varId, imgId);
  if (!doc) return jsonError("Not found", 404);
  return jsonOk(doc);
}

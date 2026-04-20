import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { findProductIdByColourVariantId, putVariantStock } from "@/lib/services/adminCatalogBackend";

const bodyZ = z.object({
  sizeStocks: z.array(
    z.object({
      size: z.string().min(1),
      stock: z.number().int().min(0),
      priceOverride: z.number().min(0).nullable().optional(),
      isActive: z.boolean().optional(),
    }),
  ),
});

export async function PUT(req: Request, ctx: { params: Promise<{ varId: string }> }) {
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
  const doc = await putVariantStock(productId, varId, parsed.data.sizeStocks);
  return jsonOk(doc);
}

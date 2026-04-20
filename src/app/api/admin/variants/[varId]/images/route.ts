import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { addVariantImage, findProductIdByColourVariantId } from "@/lib/services/adminCatalogBackend";

const postZ = z.object({
  url: z.string().min(1),
  isPrimary: z.boolean().optional(),
  displayOrder: z.number().optional(),
  altText: z.string().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ varId: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { varId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = postZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  const productId = await findProductIdByColourVariantId(varId);
  if (!productId) return jsonError("Variant not found", 404);
  const doc = await addVariantImage(productId, varId, parsed.data);
  return jsonOk(doc);
}

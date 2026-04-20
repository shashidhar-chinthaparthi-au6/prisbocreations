import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { colourVariantInputZ } from "@/lib/admin/admin-product-zod";
import { addColourVariant } from "@/lib/services/adminCatalogBackend";

const postZ = colourVariantInputZ.omit({ _id: true });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = postZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  try {
    const doc = await addColourVariant(id, parsed.data);
    if (!doc) return jsonError("Not found", 404);
    return jsonOk(doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}

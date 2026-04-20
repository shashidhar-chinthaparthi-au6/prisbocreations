import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { colourVariantInputZ } from "@/lib/admin/admin-product-zod";
import { deleteColourVariant, updateColourVariant } from "@/lib/services/adminCatalogBackend";

const patchZ = colourVariantInputZ.partial().omit({ _id: true });

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; varId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id, varId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = patchZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  const doc = await updateColourVariant(id, varId, parsed.data);
  if (!doc) return jsonError("Not found", 404);
  return jsonOk(doc);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; varId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id, varId } = await ctx.params;
  await connectDb();
  const ok = await deleteColourVariant(id, varId);
  if (!ok) return jsonError("Cannot delete (need at least one variant)", 400);
  return jsonOk({ ok: true });
}

import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { catalogImageUrlZ } from "@/lib/admin/catalog-image-url-zod";
import { adminDeleteCategoryGuarded, adminPatchCategory } from "@/lib/services/adminCatalogBackend";

const patchZ = z
  .object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
    displayOrder: z.number().int().optional(),
    imageUrl: catalogImageUrlZ,
  })
  .strict();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = patchZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  const doc = await adminPatchCategory(id, parsed.data);
  if (!doc) return jsonError("Not found", 404);
  return jsonOk(doc);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  await connectDb();
  const res = await adminDeleteCategoryGuarded(id);
  if (!res.ok) {
    return jsonError(
      `${res.count} products exist in this category. Reassign or delete them first.`,
      409,
    );
  }
  return jsonOk({ ok: true });
}

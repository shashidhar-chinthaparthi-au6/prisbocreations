import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { adminProductPatchZ } from "@/lib/admin/admin-product-zod";
import {
  applyAdminProductPatch,
  deleteAdminProduct,
  getAdminProductById,
} from "@/lib/services/adminCatalogBackend";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  await connectDb();
  const bundle = await getAdminProductById(id);
  if (!bundle) return jsonError("Not found", 404);
  return jsonOk(bundle);
}

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
  const parsed = adminProductPatchZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.flatten().formErrors.join("; "), 400);
  await connectDb();
  const doc = await applyAdminProductPatch(id, parsed.data);
  if (!doc) return jsonError("Not found", 404);
  return jsonOk(doc);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  await connectDb();
  await deleteAdminProduct(id);
  return jsonOk({ ok: true });
}

import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { duplicateAdminProduct } from "@/lib/services/adminCatalogBackend";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  await connectDb();
  const newId = await duplicateAdminProduct(id);
  if (!newId) return jsonError("Not found or not duplicable", 404);
  return jsonOk({ id: String(newId) });
}

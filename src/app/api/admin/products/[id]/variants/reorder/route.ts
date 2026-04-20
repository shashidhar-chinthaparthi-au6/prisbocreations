import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zObjectId } from "@/lib/admin/zod-objectid";
import { reorderColourVariants } from "@/lib/services/adminCatalogBackend";

const bodyZ = z.object({ orderedIds: z.array(zObjectId) });

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
  const parsed = bodyZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  await reorderColourVariants(id, parsed.data.orderedIds);
  return jsonOk({ ok: true });
}

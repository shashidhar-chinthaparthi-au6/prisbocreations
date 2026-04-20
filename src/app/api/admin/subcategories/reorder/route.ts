import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zObjectId } from "@/lib/admin/zod-objectid";
import { adminReorderSubcategories } from "@/lib/services/adminCatalogBackend";

const bodyZ = z.object({
  categoryId: zObjectId,
  orderedIds: z.array(zObjectId),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = bodyZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  await adminReorderSubcategories(parsed.data.categoryId, parsed.data.orderedIds);
  return jsonOk({ ok: true });
}

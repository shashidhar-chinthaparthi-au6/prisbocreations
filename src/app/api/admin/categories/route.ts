import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { adminCreateCategory, adminListCategoriesTree } from "@/lib/services/adminCatalogBackend";

const postZ = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  displayOrder: z.number().int().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  const tree = await adminListCategoriesTree();
  return jsonOk(tree);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
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
    const row = await adminCreateCategory(parsed.data);
    return jsonOk(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return jsonError(msg, 400);
  }
}

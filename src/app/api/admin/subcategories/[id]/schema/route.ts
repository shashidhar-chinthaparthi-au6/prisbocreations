import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { FIELD_TYPES } from "@/lib/models/schema-field-constants";
import { addSchemaField, listSchemaFields } from "@/lib/services/adminCatalogBackend";

const postZ = z.object({
  key: z.string().min(1).max(120),
  label: z.string().min(1).max(200),
  fieldType: z.enum(FIELD_TYPES),
  options: z.array(z.string()).optional(),
  isHighlight: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  await connectDb();
  const rows = await listSchemaFields(id);
  return jsonOk(rows);
}

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
    const row = await addSchemaField({ subcategoryId: id, ...parsed.data });
    return jsonOk(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return jsonError(msg, 400);
  }
}

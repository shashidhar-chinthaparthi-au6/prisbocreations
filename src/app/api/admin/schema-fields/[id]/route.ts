import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { FIELD_TYPES } from "@/lib/models/schema-field-constants";
import {
  countProductsUsingSchemaField,
  deleteSchemaField,
  patchSchemaField,
} from "@/lib/services/adminCatalogBackend";
import { SchemaField } from "@/lib/models/SchemaField";
import { Product } from "@/lib/models/Product";

const patchZ = z
  .object({
    key: z.string().min(1).max(120).optional(),
    label: z.string().min(1).max(200).optional(),
    fieldType: z.enum(FIELD_TYPES).optional(),
    options: z.array(z.string()).optional(),
    isHighlight: z.boolean().optional(),
    isRequired: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
    confirmDeleteValues: z.boolean().optional(),
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
  const { confirmDeleteValues: _c, ...patch } = parsed.data;
  const doc = await patchSchemaField(id, patch);
  if (!doc) return jsonError("Not found", 404);
  return jsonOk(doc);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const force = url.searchParams.get("confirm") === "1";
  await connectDb();
  const field = await SchemaField.findById(id).lean();
  if (!field) return jsonError("Not found", 404);
  const n = await countProductsUsingSchemaField(String(field.subcategoryId), field.key);
  if (n > 0 && !force) {
    return jsonError(
      `${n} products have data for this field. Deleting removes those values.`,
      409,
    );
  }
  if (n > 0 && force) {
    await Product.updateMany(
      { subcategoryId: field.subcategoryId },
      { $unset: { [`specValues.${field.key}`]: "" } },
    );
  }
  await deleteSchemaField(id);
  return jsonOk({ ok: true });
}

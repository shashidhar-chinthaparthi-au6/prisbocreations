import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRef, zImageRefArray } from "@/lib/api/imageRef";
import { adminUpdateSubcategory, adminDeleteSubcategory } from "@/lib/services/catalogService";

const patchSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
  images: zImageRefArray().optional(),
  imageUrl: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    zImageRef().optional(),
  ),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const doc = await adminUpdateSubcategory(id, body);
    if (!doc) return jsonError("Not found", 404);
    return jsonOk(doc);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Update failed", 400);
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  const { id } = await ctx.params;
  await adminDeleteSubcategory(id);
  return jsonOk({ deleted: true });
}

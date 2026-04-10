import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRef, zImageRefArray } from "@/lib/api/imageRef";
import {
  adminUpdateCategory,
  adminDeleteCategory,
} from "@/lib/services/catalogService";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
  images: zImageRefArray().min(1).optional(),
  imageUrl: zImageRef().optional(),
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
    const patch = patchSchema.parse(await req.json());
    const cat = await adminUpdateCategory(id, patch);
    if (!cat) return jsonError("Not found", 404);
    return jsonOk(cat);
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
  await adminDeleteCategory(id);
  return jsonOk({ deleted: true });
}

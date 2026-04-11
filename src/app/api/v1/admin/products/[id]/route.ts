import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRefArray } from "@/lib/api/imageRef";
import { slugify } from "@/lib/slugify";
import { adminUpdateProduct, adminDeleteProduct } from "@/lib/services/catalogService";
import { isHtmlContentEmpty, sanitizeProductDescription } from "@/lib/sanitize-html";

const productOptionSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(200),
  pricePaise: z.number().int().min(0),
  stock: z.number().int().min(0),
  sku: z.string().max(80).optional(),
});

const patchSchema = z
  .object({
    subcategoryId: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().min(1).max(250_000).optional(),
    pricePaise: z.number().int().positive().optional(),
    stock: z.number().int().min(0).optional(),
    images: zImageRefArray().optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    options: z.array(productOptionSchema).max(24).optional(),
  })
  .superRefine((data, ctx) => {
    const opts = data.options;
    if (!opts?.length) return;
    const keys = opts.map((o) => o.key);
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate option keys",
        path: ["options"],
      });
    }
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
    let next =
      patch.name !== undefined ? { ...patch, slug: slugify(patch.name) } : patch;
    if (next.description !== undefined) {
      const description = sanitizeProductDescription(next.description);
      if (isHtmlContentEmpty(description)) {
        return jsonError("Description cannot be empty", 400);
      }
      next = { ...next, description };
    }
    const p = await adminUpdateProduct(id, next);
    if (!p) return jsonError("Not found", 404);
    return jsonOk(p);
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
  await adminDeleteProduct(id);
  return jsonOk({ deleted: true });
}

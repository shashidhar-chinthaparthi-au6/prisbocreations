import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRef, zImageRefArray } from "@/lib/api/imageRef";
import { slugify } from "@/lib/slugify";
import { adminUpdateProduct, adminDeleteProduct } from "@/lib/services/catalogService";
import { isHtmlContentEmpty, sanitizeProductDescription } from "@/lib/sanitize-html";

const productOptionSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(200),
  pricePaise: z.number().int().min(0),
  stock: z.number().int().min(0),
  sku: z.string().max(80).optional(),
  description: z.string().max(250_000).optional(),
});

const colorVariantSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(120),
  images: z.array(zImageRef()).max(24).optional().default([]),
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
    colorVariants: z.array(colorVariantSchema).max(24).optional(),
    allowCustomerCustomization: z.boolean().optional(),
    customizationInstructions: z.string().max(10000).optional(),
    customizationTextLabel: z.string().max(200).optional(),
    customizationTextPlaceholder: z.string().max(500).optional(),
    customizationTextMaxLength: z.number().int().min(1).max(2000).optional(),
    customizationImageRequired: z.boolean().optional(),
    customizationTextRequired: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const opts = data.options;
    if (opts?.length) {
      const keys = opts.map((o) => o.key);
      if (new Set(keys).size !== keys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate option keys",
          path: ["options"],
        });
      }
    }
    const cols = data.colorVariants;
    if (cols?.length) {
      const ckeys = cols.map((c) => c.key);
      if (new Set(ckeys).size !== ckeys.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate color keys",
          path: ["colorVariants"],
        });
      }
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
    if (next.options !== undefined) {
      next = {
        ...next,
        options: next.options.map((o) => ({
          ...o,
          description: sanitizeProductDescription(o.description ?? ""),
        })),
      };
    }
    const p = await adminUpdateProduct(id, next);
    if (!p) return jsonError("Not found", 404);
    return jsonOk(p);
  } catch (e) {
    if (e instanceof z.ZodError) {
      const issue = e.issues[0];
      if (issue) {
        const path = issue.path.filter((p): p is string | number => p !== undefined).join(".");
        const where = path ? ` (${path})` : "";
        return jsonError(`${issue.message}${where}`, 400);
      }
      return jsonError("Invalid input", 400);
    }
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

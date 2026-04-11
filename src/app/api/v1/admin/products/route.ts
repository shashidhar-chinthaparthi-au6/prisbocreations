import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRef, zImageRefArray } from "@/lib/api/imageRef";
import { generateSku } from "@/lib/generate-sku";
import { slugify } from "@/lib/slugify";
import { adminCreateProduct, adminListProducts } from "@/lib/services/catalogService";
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

const createSchema = z
  .object({
    subcategoryId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1).max(250_000),
    pricePaise: z.number().int().positive(),
    stock: z.number().int().min(0),
    images: zImageRefArray(),
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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  return jsonOk(await adminListProducts());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const body = createSchema.parse(await req.json());
    const { options, colorVariants, description: rawDescription, ...rest } = body;
    const description = sanitizeProductDescription(rawDescription);
    if (isHtmlContentEmpty(description)) {
      return jsonError("Description cannot be empty", 400);
    }
    const optionsSanitized = options?.map((o) => ({
      ...o,
      description: sanitizeProductDescription(o.description ?? ""),
    }));
    const p = await adminCreateProduct({
      ...rest,
      description,
      slug: slugify(body.name),
      sku: generateSku(),
      ...(optionsSanitized?.length ? { options: optionsSanitized } : {}),
      ...(colorVariants?.length ? { colorVariants } : {}),
    });
    return jsonOk(p);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}

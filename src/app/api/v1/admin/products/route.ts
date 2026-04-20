import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRef, zImageRefArray } from "@/lib/api/imageRef";
import { generateSku } from "@/lib/generate-sku";
import { slugify } from "@/lib/slugify";
import mongoose from "mongoose";
import { Subcategory } from "@/lib/models/Subcategory";
import { adminCreateProduct, adminListProducts } from "@/lib/services/catalogService";
import {
  isHtmlContentEmpty,
  sanitizeAdminProductOption,
  sanitizePlainField,
  sanitizePlainLines,
  sanitizeProductDescription,
} from "@/lib/sanitize-html";

const specificationRowSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.string().min(1).max(2000),
});

const productOptionSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(200),
  pricePaise: z.number().int().min(0),
  stock: z.number().int().min(0),
  sku: z.string().max(80).optional(),
  description: z.string().max(250_000).optional(),
  specificationRows: z.array(specificationRowSchema).max(80).optional(),
  featureLines: z.array(z.string().max(500)).max(120).optional(),
  highlightLines: z.array(z.string().max(500)).max(120).optional(),
});

const colorVariantSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(120),
  images: z.array(zImageRef()).max(24).optional().default([]),
});

const objectIdZ = z.string().refine((s) => mongoose.isValidObjectId(s), "Invalid id");

const createSchema = z
  .object({
    categoryId: objectIdZ,
    subcategoryId: objectIdZ.optional(),
    name: z.string().min(1),
    description: z.string().min(1).max(250_000),
    specificationRows: z.array(specificationRowSchema).max(80).optional(),
    featureLines: z.array(z.string().max(500)).max(120).optional(),
    highlightLines: z.array(z.string().max(500)).max(120).optional(),
    pricePaise: z.number().int().positive(),
    compareAtPaise: z.number().int().min(0).optional(),
    stock: z.number().int().min(0),
    images: zImageRefArray(),
    tags: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
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
    const cap = data.compareAtPaise;
    if (typeof cap === "number" && cap > 0 && cap <= data.pricePaise) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Compare-at (was price) must be greater than the selling price",
        path: ["compareAtPaise"],
      });
    }
  });

const adminProductsListQuerySchema = z
  .object({
    categoryId: objectIdZ.optional(),
    subcategoryId: objectIdZ.optional(),
    name: z.string().max(200).optional(),
    sku: z.string().max(80).optional(),
    minPricePaise: z.coerce.number().int().min(0).optional(),
    maxPricePaise: z.coerce.number().int().min(0).optional(),
    minStock: z.coerce.number().int().min(0).optional(),
    maxStock: z.coerce.number().int().min(0).optional(),
    sort: z
      .enum(["category", "subcategory", "name", "sku", "price", "stock", "updatedAt"])
      .optional(),
    order: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((data, ctx) => {
    if (
      data.minPricePaise != null &&
      data.maxPricePaise != null &&
      data.minPricePaise > data.maxPricePaise
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minPricePaise must be <= maxPricePaise",
        path: ["maxPricePaise"],
      });
    }
    if (data.minStock != null && data.maxStock != null && data.minStock > data.maxStock) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "minStock must be <= maxStock",
        path: ["maxStock"],
      });
    }
  });

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();

  const url = new URL(req.url);
  const raw = Object.fromEntries(
    [...url.searchParams.entries()].filter(([, v]) => v !== ""),
  );
  const parsed = adminProductsListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonError(first?.message ?? "Invalid query", 400);
  }

  const q = parsed.data;
  if (q.categoryId && q.subcategoryId) {
    const sub = await Subcategory.findById(q.subcategoryId).select("categoryId").lean();
    if (!sub || String(sub.categoryId) !== q.categoryId) {
      return jsonError("Subcategory does not belong to the given category", 400);
    }
  }

  return jsonOk(await adminListProducts(q));
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const body = createSchema.parse(await req.json());
    const {
      options,
      colorVariants,
      description: rawDescription,
      specificationRows: rawSpecRows,
      featureLines: rawFeatureLines,
      highlightLines: rawHighlightLines,
      ...rest
    } = body;
    const description = sanitizeProductDescription(rawDescription);
    if (isHtmlContentEmpty(description)) {
      return jsonError("Description cannot be empty", 400);
    }
    const specificationRows =
      rawSpecRows !== undefined
        ? rawSpecRows.map((r) => ({
            key: sanitizePlainField(r.key, 120),
            value: sanitizePlainField(r.value, 2000),
          }))
        : undefined;
    const featureLines =
      rawFeatureLines !== undefined
        ? sanitizePlainLines(rawFeatureLines, 500, 120)
        : undefined;
    const highlightLines =
      rawHighlightLines !== undefined
        ? sanitizePlainLines(rawHighlightLines, 500, 120)
        : undefined;
    if (body.subcategoryId) {
      const sub = await Subcategory.findById(body.subcategoryId).select("categoryId").lean();
      if (!sub || String(sub.categoryId) !== body.categoryId) {
        return jsonError("Subcategory does not belong to the selected category", 400);
      }
    }
    const optionsSanitized = options?.map((o) => sanitizeAdminProductOption(o));
    const p = await adminCreateProduct({
      ...rest,
      subcategoryId: body.subcategoryId,
      description,
      ...(specificationRows !== undefined ? { specificationRows } : {}),
      ...(featureLines !== undefined ? { featureLines } : {}),
      ...(highlightLines !== undefined ? { highlightLines } : {}),
      slug: slugify(body.name),
      sku: generateSku(),
      ...(optionsSanitized?.length ? { options: optionsSanitized } : {}),
      ...(colorVariants?.length ? { colorVariants } : {}),
    });
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
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}

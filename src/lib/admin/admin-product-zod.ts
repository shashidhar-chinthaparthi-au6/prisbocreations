import { z } from "zod";
import { RECIPIENT_SLUGS } from "@/lib/recipients";

const objectIdStr = z.string().refine((s) => /^[a-f\d]{24}$/i.test(s), "Invalid id");

const recipientSlugZ = z.enum(RECIPIENT_SLUGS);

const variantImageZ = z.object({
  _id: objectIdStr.optional(),
  url: z.string().min(1),
  isPrimary: z.boolean().optional(),
  displayOrder: z.number().optional(),
  altText: z.string().optional(),
});

const sizeStockZ = z.object({
  size: z.string().min(1),
  stock: z.number().int().min(0),
  priceOverride: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const colourVariantInputZ = z.object({
  _id: objectIdStr.optional(),
  displayName: z.string().min(1),
  hexCode: z.string().min(1),
  skuSuffix: z.string().min(1).max(12),
  basePrice: z.number().min(0),
  mrp: z.number().min(0),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
  images: z.array(variantImageZ).optional(),
  sizeStocks: z.array(sizeStockZ).optional(),
});

export const adminProductPatchZ = z
  .object({
    categoryId: objectIdStr.optional(),
    subcategoryId: objectIdStr.optional(),
    name: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    skuBase: z.string().min(1).optional(),
    hasColourVariants: z.boolean().optional(),
    hasSizePricing: z.boolean().optional(),
    sizesNotApplicable: z.boolean().optional(),
    packOf: z.number().int().min(1).optional(),
    descriptionTemplate: z.string().optional(),
    specValues: z
      .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
    manufacturerName: z.string().nullable().optional(),
    manufacturerAddress: z.string().nullable().optional(),
    packerSameAsMfr: z.boolean().optional(),
    packerAddress: z.string().nullable().optional(),
    countryOfOrigin: z.string().optional(),
    genericName: z.string().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    publishedAt: z.coerce.date().nullable().optional(),
    scheduledPublishAt: z.coerce.date().nullable().optional(),
    colourVariants: z.array(colourVariantInputZ).optional(),
    featured: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    recipients: z.array(recipientSlugZ).max(5).optional(),
  })
  .strict();

export type AdminProductPatchInput = z.infer<typeof adminProductPatchZ>;

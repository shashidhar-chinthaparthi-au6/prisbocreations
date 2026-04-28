import { z } from "zod";

const sortVals = ["relevance", "newest", "price_asc", "price_desc", "popular", "name_asc"] as const;

/** Raw JSON shape Sarvam is asked to emit (validated / sanitised server-side). */
export const storefrontAssistantAnswerSchema = z.object({
  reply: z.string().min(1),
  filters: z
    .object({
      q: z.string().optional().nullable(),
      /** Narrow to one or many category slugs (union). Prefer with subcategories when the catalogue distinguishes them. */
      categories: z.array(z.string()).max(12).optional().nullable(),
      category: z.string().optional().nullable(),
      /**
       * Granular scope: union of storefront subcategories (slug + optional parent category slug when ambiguous).
       */
      subcategories: z
        .array(
          z.object({
            slug: z.string(),
            category: z.string().optional().nullable(),
          }),
        )
        .max(12)
        .optional()
        .nullable(),
      subcategory: z.string().optional().nullable(),
      recipient: z.string().optional().nullable(),
      sort: z.enum(sortVals).optional().nullable(),
      price_min: z.number().optional().nullable(),
      price_max: z.number().optional().nullable(),
      in_stock: z.boolean().optional().nullable(),
      occasion: z.string().optional().nullable(),
      material: z.string().optional().nullable(),
      rating: z.literal("4").optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type StorefrontAssistantAnswer = z.infer<typeof storefrontAssistantAnswerSchema>;

export type RawAssistantFilters = NonNullable<NonNullable<StorefrontAssistantAnswer["filters"]>>;

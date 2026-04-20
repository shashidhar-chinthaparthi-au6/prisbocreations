import mongoose from "mongoose";
import { Product } from "@/lib/models/Product";
import { Category } from "@/lib/models/Category";
import { Subcategory } from "@/lib/models/Subcategory";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import type { ProductDoc } from "@/lib/models/Product";

function searchPattern(q: string): RegExp {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

/** Active products visible on the storefront (legacy rows may omit `status`). */
export function storefrontPublishedMatch(): Record<string, unknown> {
  return {
    isActive: true,
    $or: [{ status: { $exists: false } }, { status: "PUBLISHED" }],
  };
}

export type StorefrontSort =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "popular"
  | "name_asc";

export type StorefrontListParams = {
  categorySlugs?: string[];
  subcategorySlug?: string;
  /** When subcategory slug is ambiguous, narrow by parent category slug. */
  subcategoryCategorySlug?: string;
  priceMinPaise?: number;
  priceMaxPaise?: number;
  inStockOnly?: boolean;
  featured?: boolean;
  ids?: string[];
  /** Matches `tags` (case-insensitive) for recipient collections, e.g. him, her, kids. */
  recipient?: string;
  q?: string;
  sort?: StorefrontSort;
  page?: number;
  pageSize?: number;
};

function effectivePricePaise(p: Pick<ProductDoc, "pricePaise" | "options">): number {
  return minOptionPricePaise(p);
}

function effectiveStock(p: ProductDoc): number {
  if (productHasOptions(p) && p.options?.length) {
    return p.options.reduce((s, o) => s + Math.max(0, Number(o.stock) || 0), 0);
  }
  return Math.max(0, Number(p.stock) || 0);
}

export type StorefrontProductCard = {
  id: string;
  slug: string;
  name: string;
  subcategoryName?: string;
  listPricePaise: number;
  compareAtPaise?: number;
  stock: number;
  imageUrl?: string;
  hoverImageUrl?: string;
  multi: boolean;
  hasColorVariants: boolean;
  featured: boolean;
  isNew: boolean;
  tags: string[];
};

function daysSince(date: Date | undefined): number {
  if (!date) return 9999;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

export function productToStorefrontCard(
  p: ProductDoc,
  extras?: { subcategoryName?: string },
): StorefrontProductCard {
  const colorVariants = colorVariantsFromDoc(p);
  const defaultImages = Array.isArray(p.images) ? p.images : [];
  const thumb = listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];
  const hoverCandidate = defaultImages.find((u) => u && u !== thumb) ?? defaultImages[1];
  const hoverImageUrl =
    typeof hoverCandidate === "string" && hoverCandidate.trim() && hoverCandidate !== thumb
      ? hoverCandidate.trim()
      : undefined;
  const multi = productHasOptions(p);
  const price = effectivePricePaise(p);
  const cap =
    typeof p.compareAtPaise === "number" && Number.isFinite(p.compareAtPaise)
      ? p.compareAtPaise
      : undefined;
  const created = p.createdAt instanceof Date ? p.createdAt : undefined;
  const isNew = daysSince(created) <= 45;

  return {
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    ...(extras?.subcategoryName ? { subcategoryName: extras.subcategoryName } : {}),
    listPricePaise: price,
    ...(typeof cap === "number" && cap > price ? { compareAtPaise: cap } : {}),
    stock: effectiveStock(p),
    imageUrl: typeof thumb === "string" ? thumb : undefined,
    ...(hoverImageUrl ? { hoverImageUrl } : {}),
    multi,
    hasColorVariants: colorVariants.length > 0,
    featured: Boolean(p.featured),
    isNew,
    tags: Array.isArray(p.tags) ? p.tags : [],
  };
}

async function resolveSubcategoryObjectId(
  subSlug: string,
  categorySlug?: string,
): Promise<mongoose.Types.ObjectId | null> {
  const subSlugNorm = subSlug.trim().toLowerCase();
  if (!subSlugNorm) return null;
  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug.trim().toLowerCase() })
      .select("_id")
      .lean();
    if (!cat) return null;
    const sub = await Subcategory.findOne({
      categoryId: cat._id,
      slug: subSlugNorm,
    })
      .select("_id")
      .lean();
    return sub ? (sub._id as mongoose.Types.ObjectId) : null;
  }
  const subs = await Subcategory.find({ slug: subSlugNorm }).select("_id").lean();
  if (subs.length === 1) return subs[0]._id as mongoose.Types.ObjectId;
  return null;
}

const RECIPIENT_TAG_MAP: Record<string, string[]> = {
  him: ["for-him", "him", "for him", "men", "gifts-for-him"],
  her: ["for-her", "her", "for her", "women", "gifts-for-her"],
  kids: ["kids", "for-kids", "children", "gifts-for-kids"],
  couples: ["couples", "for-couples", "wedding", "gifts-for-couples"],
  corporate: ["corporate", "business", "bulk", "corporate-gifts"],
};

export async function listStorefrontProducts(
  params: StorefrontListParams,
): Promise<{ items: StorefrontProductCard[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 12));
  const skip = (page - 1) * pageSize;

  const match: Record<string, unknown> = { ...storefrontPublishedMatch() };

  if (params.featured) {
    match.featured = true;
  }

  if (params.ids?.length) {
    const oids = params.ids.filter((id) => mongoose.isValidObjectId(id));
    if (!oids.length) {
      return { items: [], total: 0, page, pageSize };
    }
    match._id = { $in: oids.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  const catSlugs = (params.categorySlugs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (catSlugs.length) {
    const cats = await Category.find({ slug: { $in: catSlugs } })
      .select("_id")
      .lean();
    const catIds = cats.map((c) => c._id);
    if (!catIds.length) {
      return { items: [], total: 0, page, pageSize };
    }
    const subs = await Subcategory.find({ categoryId: { $in: catIds } }).select("_id").lean();
    const subIds = subs.map((s) => s._id);
    const or: Record<string, unknown>[] = [{ categoryId: { $in: catIds } }];
    if (subIds.length) or.push({ subcategoryId: { $in: subIds } });
    match.$or = or;
  }

  if (params.subcategorySlug) {
    const subOid = await resolveSubcategoryObjectId(
      params.subcategorySlug,
      params.subcategoryCategorySlug,
    );
    if (!subOid) {
      return { items: [], total: 0, page, pageSize };
    }
    match.subcategoryId = subOid;
  }

  const qTrim = params.q?.trim().slice(0, 200) ?? "";
  if (qTrim) {
    const rx = searchPattern(qTrim);
    match.$and = [
      ...(Array.isArray(match.$and) ? match.$and : []),
      {
        $or: [
          { name: rx },
          { description: rx },
          { brand: rx },
          { "specificationRows.key": rx },
          { "specificationRows.value": rx },
          { featureLines: rx },
          { highlightLines: rx },
          { specificationsHtml: rx },
          { featuresHtml: rx },
          { highlightsHtml: rx },
          { tags: rx },
          { sku: rx },
        ],
      },
    ];
  }

  const recipient = params.recipient?.trim().toLowerCase();
  if (recipient) {
    const candidates = RECIPIENT_TAG_MAP[recipient] ?? [recipient];
    const tagOr = candidates.map((c) => ({
      tags: new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
    }));
    match.$and = [...(Array.isArray(match.$and) ? match.$and : []), { $or: tagOr }];
  }

  const allForFilter = await Product.find(match).lean();
  const priceMin = params.priceMinPaise;
  const priceMax = params.priceMaxPaise;

  let filtered = allForFilter.filter((p) => {
    const doc = p as ProductDoc;
    const price = effectivePricePaise(doc);
    if (priceMin != null && price < priceMin) return false;
    if (priceMax != null && price > priceMax) return false;
    if (params.inStockOnly && effectiveStock(doc) <= 0) return false;
    return true;
  });

  const sort = params.sort ?? "relevance";
  if (sort === "newest") {
    filtered.sort((a, b) => {
      const ta = new Date((a as { createdAt?: Date }).createdAt ?? 0).getTime();
      const tb = new Date((b as { createdAt?: Date }).createdAt ?? 0).getTime();
      return tb - ta;
    });
  } else if (sort === "price_asc") {
    filtered.sort(
      (a, b) => effectivePricePaise(a as ProductDoc) - effectivePricePaise(b as ProductDoc),
    );
  } else if (sort === "price_desc") {
    filtered.sort(
      (a, b) => effectivePricePaise(b as ProductDoc) - effectivePricePaise(a as ProductDoc),
    );
  } else if (sort === "name_asc") {
    filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  } else if (sort === "popular") {
    filtered.sort((a, b) => {
      const fa = a.featured === true ? 1 : 0;
      const fb = b.featured === true ? 1 : 0;
      if (fb !== fa) return fb - fa;
      const ua = new Date((a as { updatedAt?: Date }).updatedAt ?? 0).getTime();
      const ub = new Date((b as { updatedAt?: Date }).updatedAt ?? 0).getTime();
      return ub - ua;
    });
  } else {
    filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  const total = filtered.length;
  const pageRows = filtered.slice(skip, skip + pageSize);

  const subIds = [
    ...new Set(
      pageRows
        .map((p) => p.subcategoryId)
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  ];
  const subDocs =
    subIds.length > 0
      ? await Subcategory.find({ _id: { $in: subIds } }).select("name").lean()
      : [];
  const subNameById = new Map(subDocs.map((s) => [String(s._id), s.name]));

  const items = pageRows.map((p) =>
    productToStorefrontCard(p as ProductDoc, {
      subcategoryName: p.subcategoryId ? subNameById.get(String(p.subcategoryId)) : undefined,
    }),
  );

  return { items, total, page, pageSize };
}

export async function getStorefrontProductDetailBySlug(slug: string) {
  const p = await Product.findOne({ slug: slug.trim().toLowerCase(), ...storefrontPublishedMatch() }).lean();
  return p as ProductDoc | null;
}

/** Typeahead for search overlay — published products only. */
export async function listStorefrontProductSuggestions(q: string, limit = 8) {
  const qTrim = q.trim().slice(0, 200);
  if (!qTrim) return [];
  const rx = searchPattern(qTrim);
  const cap = Math.min(Math.max(limit, 1), 20);
  const query = {
    ...storefrontPublishedMatch(),
    $or: [
      { name: rx },
      { description: rx },
      { brand: rx },
      { tags: rx },
      { sku: rx },
    ],
  };
  const rows = await Product.find(query)
    .select("name slug images sku pricePaise options compareAtPaise")
    .sort({ name: 1 })
    .limit(cap)
    .lean();
  return rows.map((p) => {
    const doc = p as ProductDoc;
    const price = effectivePricePaise(doc);
    const thumb = listingPrimaryThumb(Array.isArray(doc.images) ? doc.images : [], colorVariantsFromDoc(doc)) ?? doc.images?.[0];
    return {
      slug: doc.slug,
      name: doc.name,
      thumb: thumb ?? null,
      sku: doc.sku,
      displayPricePaise: price,
      hasPackOptions: productHasOptions(doc),
    };
  });
}

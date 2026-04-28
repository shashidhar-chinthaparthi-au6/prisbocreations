import mongoose from "mongoose";
import { Product } from "@/lib/models/Product";
import { Category } from "@/lib/models/Category";
import { Subcategory } from "@/lib/models/Subcategory";
import { Review } from "@/lib/models/Review";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import type { ProductDoc } from "@/lib/models/Product";
import { parseRecipientSlug } from "@/lib/recipients";

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

/** URL: `in_stock=true` or `in_stock=1` (mobile form) narrows to buyable quantity. Default = show all. */
export function listingWantsInStockOnly(
  raw: string | string[] | undefined,
): boolean {
  if (typeof raw === "string") return raw === "true" || raw === "1";
  if (Array.isArray(raw)) return raw.some((x) => x === "true" || x === "1");
  return false;
}

export type StorefrontListParams = {
  categorySlugs?: string[];
  subcategorySlug?: string;
  /** When subcategory slug is ambiguous, narrow by parent category slug. */
  subcategoryCategorySlug?: string;
  priceMinPaise?: number;
  priceMaxPaise?: number;
  /** When `true`, exclude zero–effective-stock products. When omitted or `false`, include all. */
  inStockOnly?: boolean;
  featured?: boolean;
  ids?: string[];
  /** Exclude one product (e.g. “You might also like”). */
  excludeProductId?: string;
  /** Exclude many product ids (e.g. homepage “Load more” without duplicates). */
  excludeProductIds?: string[];
  /** Matches `specValues.occasion` (normalized string). */
  occasion?: string;
  /** Matches `specValues.material` (normalized string). */
  material?: string;
  /** When set (e.g. 4), only products whose approved reviews average ≥ this value. */
  minAverageRating?: number;
  /** Matches `recipients` array (canonical slug: him | her | kids | couples | corporate). */
  recipient?: string;
  q?: string;
  sort?: StorefrontSort;
  page?: number;
  pageSize?: number;
  /** When set, slice starts at this index instead of `(page - 1) * pageSize` (for “load more” append). */
  skip?: number;
};

function effectivePricePaise(p: Pick<ProductDoc, "pricePaise" | "options">): number {
  return minOptionPricePaise(p);
}

function effectiveStock(p: ProductDoc): number {
  if (productHasOptions(p) && p.options?.length) {
    return p.options.reduce((s, o) => s + Math.max(0, Number(o.stock) || 0), 0);
  }
  const cvs = p.colourVariants;
  if (Array.isArray(cvs) && cvs.length > 0) {
    let sum = 0;
    for (const v of cvs) {
      if (!v || typeof v !== "object") continue;
      const rec = v as { isActive?: boolean; sizeStocks?: unknown };
      if (rec.isActive === false) continue;
      const rows = rec.sizeStocks;
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        if (!row || typeof row !== "object") continue;
        const sr = row as { isActive?: boolean; stock?: unknown };
        if (sr.isActive === false) continue;
        sum += Math.max(0, Number(sr.stock) || 0);
      }
    }
    return sum;
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
  /** Unique first-image thumbs per colour (listing swatches); set when ≥2 variants. */
  colorPreviewUrls?: string[];
  /** Up to 6 colour rows for home grid expansion (one card per colour). */
  colorListingSlices?: { key: string; label: string; imageUrl: string; hoverImageUrl?: string }[];
  /** When this card was expanded for a specific colour, link + label for PDP. */
  listingColorKey?: string;
  listingColorLabel?: string;
  featured: boolean;
  isNew: boolean;
  tags: string[];
  /** Present when reviews exist for this product. */
  avgRating?: number;
  reviewCount?: number;
};

function daysSince(date: Date | undefined): number {
  if (!date) return 9999;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function specValuesString(doc: ProductDoc, key: string): string {
  const raw = doc.specValues;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "";
  const v = (raw as Record<string, unknown>)[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

async function productIdsMeetingMinAverageRating(min: number): Promise<Set<string>> {
  const rows = await Review.aggregate<{ _id: mongoose.Types.ObjectId }>([
    { $match: { isApproved: true } },
    { $group: { _id: "$productId", avg: { $avg: "$rating" } } },
    { $match: { avg: { $gte: min } } },
  ]);
  return new Set(rows.map((r) => String(r._id)));
}

async function reviewStatsForProductIds(
  ids: string[],
): Promise<Map<string, { avg: number; count: number }>> {
  const oids = ids.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
  if (!oids.length) return new Map();
  const rows = await Review.aggregate<{
    _id: mongoose.Types.ObjectId;
    avg: number;
    count: number;
  }>([
    { $match: { productId: { $in: oids }, isApproved: true } },
    {
      $group: {
        _id: "$productId",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = new Map<string, { avg: number; count: number }>();
  for (const r of rows) {
    map.set(String(r._id), {
      avg: Math.round(r.avg * 10) / 10,
      count: r.count,
    });
  }
  return map;
}

export function productToStorefrontCard(
  p: ProductDoc,
  extras?: {
    subcategoryName?: string;
    avgRating?: number;
    reviewCount?: number;
  },
): StorefrontProductCard {
  const colorVariants = colorVariantsFromDoc(p);
  const defaultImages = Array.isArray(p.images) ? p.images : [];
  const thumb = listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];
  /** First image per colour (deduped) for catalogue swatches. */
  let colorPreviewUrls: string[] | undefined;
  let colorListingSlices: { key: string; label: string; imageUrl: string; hoverImageUrl?: string }[] | undefined;
  if (colorVariants.length >= 2) {
    const seen = new Set<string>();
    const previews: string[] = [];
    for (const v of colorVariants) {
      const cand = typeof v.images[0] === "string" && v.images[0].trim().length ? v.images[0].trim() : "";
      const u = (cand || (typeof thumb === "string" ? thumb : "")).trim();
      if (u.length && !seen.has(u)) {
        seen.add(u);
        previews.push(u);
      }
      if (previews.length >= 6) break;
    }
    if (previews.length >= 2) colorPreviewUrls = previews;

    const baseThumb = typeof thumb === "string" ? thumb : "";
    const slices: { key: string; label: string; imageUrl: string; hoverImageUrl?: string }[] = [];
    for (const v of colorVariants.slice(0, 6)) {
      const img = (v.images[0] || baseThumb || "").trim();
      if (!img.length) continue;
      const h = typeof v.images[1] === "string" && v.images[1].trim().length ? v.images[1].trim() : undefined;
      slices.push({
        key: v.key,
        label: v.label,
        imageUrl: img,
        ...(h && h !== img ? { hoverImageUrl: h } : {}),
      });
    }
    if (slices.length >= 2) colorListingSlices = slices;
  }
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
  const isNew = daysSince(created) <= 14;

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
    ...(colorPreviewUrls ? { colorPreviewUrls } : {}),
    ...(colorListingSlices ? { colorListingSlices } : {}),
    featured: Boolean(p.featured),
    isNew,
    tags: Array.isArray(p.tags) ? p.tags : [],
    ...(extras?.avgRating != null && extras.reviewCount != null && extras.reviewCount > 0
      ? { avgRating: extras.avgRating, reviewCount: extras.reviewCount }
      : {}),
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

type BrowseMatchParams = Pick<
  StorefrontListParams,
  | "categorySlugs"
  | "subcategorySlug"
  | "subcategoryCategorySlug"
  | "q"
  | "recipient"
  | "featured"
  | "ids"
>;

/** Shared Mongo match for storefront browse / filter facets (before price & post-filters). */
async function buildStorefrontBrowseMatch(
  params: BrowseMatchParams,
): Promise<{ match: Record<string, unknown> } | { empty: true }> {
  const match: Record<string, unknown> = { ...storefrontPublishedMatch() };

  if (params.featured) {
    match.featured = true;
  }

  if (params.ids?.length) {
    const oids = params.ids.filter((id) => mongoose.isValidObjectId(id));
    if (!oids.length) {
      return { empty: true };
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
      return { empty: true };
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
      return { empty: true };
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

  const recipientRaw = params.recipient?.trim() ?? "";
  if (recipientRaw) {
    const slug = parseRecipientSlug(recipientRaw);
    if (!slug) {
      return { empty: true };
    }
    match.recipients = slug;
  }

  return { match };
}

/** Distinct non-empty `specValues.occasion` / `specValues.material` for the given catalog scope. */
export async function listStorefrontFilterFacets(params: {
  categorySlugs?: string[];
  subcategorySlug?: string;
  subcategoryCategorySlug?: string;
  recipient?: string;
}): Promise<{ occasions: string[]; materials: string[] }> {
  const built = await buildStorefrontBrowseMatch({
    categorySlugs: params.categorySlugs,
    subcategorySlug: params.subcategorySlug,
    subcategoryCategorySlug: params.subcategoryCategorySlug,
    recipient: params.recipient,
  });
  if ("empty" in built) return { occasions: [], materials: [] };
  const rows = await Product.find(built.match).select("specValues").lean();
  const occ = new Set<string>();
  const mat = new Set<string>();
  for (const row of rows) {
    const o = specValuesString(row as ProductDoc, "occasion");
    const m = specValuesString(row as ProductDoc, "material");
    if (o) occ.add(o);
    if (m) mat.add(m);
  }
  return {
    occasions: [...occ].sort((a, b) => a.localeCompare(b)),
    materials: [...mat].sort((a, b) => a.localeCompare(b)),
  };
}

export async function listStorefrontProducts(
  params: StorefrontListParams,
): Promise<{ items: StorefrontProductCard[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, params.pageSize ?? 12));
  const skip =
    params.skip != null && Number.isFinite(params.skip)
      ? Math.max(0, Math.floor(Number(params.skip)))
      : (page - 1) * pageSize;

  const built = await buildStorefrontBrowseMatch({
    categorySlugs: params.categorySlugs,
    subcategorySlug: params.subcategorySlug,
    subcategoryCategorySlug: params.subcategoryCategorySlug,
    q: params.q,
    recipient: params.recipient,
    featured: params.featured,
    ids: params.ids,
  });
  if ("empty" in built) {
    const logicalPage =
      params.skip != null && Number.isFinite(params.skip)
        ? Math.floor(Math.max(0, Number(params.skip)) / pageSize) + 1
        : page;
    return { items: [], total: 0, page: logicalPage, pageSize };
  }
  const match = built.match;

  const allForFilter = await Product.find(match).lean();
  const priceMin = params.priceMinPaise;
  const priceMax = params.priceMaxPaise;

  const ratingOk =
    params.minAverageRating != null && params.minAverageRating > 0
      ? await productIdsMeetingMinAverageRating(params.minAverageRating)
      : null;

  const excludedIds = new Set<string>();
  if (params.excludeProductId?.trim()) {
    excludedIds.add(String(params.excludeProductId).trim());
  }
  if (params.excludeProductIds?.length) {
    for (const id of params.excludeProductIds) {
      const s = typeof id === "string" ? id.trim() : "";
      if (s && mongoose.isValidObjectId(s)) excludedIds.add(s);
    }
  }

  let filtered = allForFilter.filter((p) => {
    const doc = p as ProductDoc;
    const idStr = String(doc._id);
    const price = effectivePricePaise(doc);
    if (priceMin != null && price < priceMin) return false;
    if (priceMax != null && price > priceMax) return false;
    if (params.inStockOnly === true && effectiveStock(doc) <= 0) return false;
    if (excludedIds.has(idStr)) return false;
    if (ratingOk && !ratingOk.has(String(doc._id))) return false;
    const occ = params.occasion?.trim().toLowerCase();
    if (occ && specValuesString(doc, "occasion").toLowerCase() !== occ) return false;
    const mat = params.material?.trim().toLowerCase();
    if (mat && specValuesString(doc, "material").toLowerCase() !== mat) return false;
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
  } else if (sort === "relevance") {
    filtered.sort((a, b) => {
      const ta = new Date((a as { createdAt?: Date }).createdAt ?? 0).getTime();
      const tb = new Date((b as { createdAt?: Date }).createdAt ?? 0).getTime();
      return tb - ta;
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

  const pageIds = pageRows.map((p) => String(p._id));
  const reviewMap = await reviewStatsForProductIds(pageIds);

  const items = pageRows.map((p) => {
    const st = reviewMap.get(String(p._id));
    return productToStorefrontCard(p as ProductDoc, {
      subcategoryName: p.subcategoryId ? subNameById.get(String(p.subcategoryId)) : undefined,
      ...(st && st.count > 0 ? { avgRating: st.avg, reviewCount: st.count } : {}),
    });
  });

  const logicalPage =
    params.skip != null && Number.isFinite(params.skip)
      ? Math.floor(skip / pageSize) + 1
      : page;

  return { items, total, page: logicalPage, pageSize };
}

/** Categories with published product counts (for filter sidebar). */
export async function listStorefrontCategoryRows(): Promise<
  { slug: string; name: string; count: number }[]
> {
  const cats = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const pub = storefrontPublishedMatch();
  const out: { slug: string; name: string; count: number }[] = [];
  for (const c of cats) {
    const subs = await Subcategory.find({ categoryId: c._id }).select("_id").lean();
    const subIds = subs.map((s) => s._id);
    const n = await Product.countDocuments({
      ...pub,
      $or: [
        { categoryId: c._id },
        ...(subIds.length ? [{ subcategoryId: { $in: subIds } }] : []),
      ],
    });
    out.push({ slug: c.slug, name: c.name, count: n });
  }
  return out;
}

/** Subcategories in a category with product counts. */
export async function listStorefrontSubcategoryRowsForCategory(
  categorySlug: string,
): Promise<{ slug: string; name: string; count: number }[]> {
  const cat = await Category.findOne({ slug: categorySlug.trim().toLowerCase() }).lean();
  if (!cat) return [];
  const subs = await Subcategory.find({ categoryId: cat._id })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const pub = storefrontPublishedMatch();
  const out: { slug: string; name: string; count: number }[] = [];
  for (const s of subs) {
    const n = await Product.countDocuments({ ...pub, subcategoryId: s._id });
    out.push({ slug: s.slug, name: s.name, count: n });
  }
  return out;
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

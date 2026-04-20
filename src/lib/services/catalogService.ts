import { Category } from "@/lib/models/Category";
import { Subcategory } from "@/lib/models/Subcategory";
import { Product } from "@/lib/models/Product";
import { withNormalizedCatalogImages } from "@/lib/catalog-images";
import type { ProductSuggestion } from "@/lib/product-suggestion";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import mongoose, { type PipelineStage } from "mongoose";
import type { ExploreFeedMode } from "@/lib/explore-feed-mode";

export type { ProductSuggestion };
export type { ExploreFeedMode };

/** Safe substring search: user input must not break RegExp construction. */
function searchPattern(q: string): RegExp {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

export async function listCategories() {
  const rows = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  return rows.map((d) => withNormalizedCatalogImages(d));
}

/** Minimal tree for storefront header nav (categories + subcategory links). */
export type NavCategoryTreeItem = {
  slug: string;
  name: string;
  subcategories: { slug: string; name: string }[];
};

export async function listNavCategoryTree(): Promise<NavCategoryTreeItem[]> {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  if (categories.length === 0) return [];
  const allSubs = await Subcategory.find().sort({ sortOrder: 1, name: 1 }).lean();
  const byCategoryId = new Map<string, { slug: string; name: string }[]>();
  for (const s of allSubs) {
    const key = String(s.categoryId);
    const row = { slug: s.slug, name: s.name };
    const list = byCategoryId.get(key);
    if (list) list.push(row);
    else byCategoryId.set(key, [row]);
  }
  return categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    subcategories: byCategoryId.get(String(c._id)) ?? [],
  }));
}

export async function getCategoryBySlug(slug: string) {
  const doc = await Category.findOne({ slug }).lean();
  return doc ? withNormalizedCatalogImages(doc) : null;
}

export async function listSubcategoriesByCategorySlug(categorySlug: string) {
  const cat = await Category.findOne({ slug: categorySlug }).lean();
  if (!cat) return [];
  const rows = await Subcategory.find({ categoryId: cat._id })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  return rows.map((d) => withNormalizedCatalogImages(d));
}

export async function getSubcategoryByCategoryAndSlug(categorySlug: string, subSlug: string) {
  const cat = await Category.findOne({ slug: categorySlug }).lean();
  if (!cat) return null;
  const doc = await Subcategory.findOne({ categoryId: cat._id, slug: subSlug }).lean();
  return doc ? withNormalizedCatalogImages(doc) : null;
}

/** Unique media URLs for subcategory cards: sub gallery, then that subcategory’s products only */
export async function listPreviewImagesForSubcategory(
  subcategoryId: string,
  extras: {
    subcategoryImages?: string[];
  } = {},
): Promise<string[]> {
  if (!mongoose.isValidObjectId(subcategoryId)) return [];
  const subOid = new mongoose.Types.ObjectId(subcategoryId);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (u: string | null | undefined) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  for (const u of extras.subcategoryImages ?? []) push(u);
  const products = await Product.find({
    subcategoryId: subOid,
    isActive: true,
  })
    .select("images")
    .sort({ name: 1 })
    .limit(12)
    .lean();
  for (const p of products) {
    for (const img of p.images ?? []) push(img);
  }
  return out;
}

export async function listProducts(filters: {
  categorySlug?: string;
  subcategorySlug?: string;
  q?: string;
}) {
  const query: Record<string, unknown> = { isActive: true };

  if (filters.categorySlug && filters.subcategorySlug) {
    const sub = await getSubcategoryByCategoryAndSlug(
      filters.categorySlug,
      filters.subcategorySlug
    );
    if (!sub) return [];
    query.subcategoryId = sub._id;
  } else if (filters.categorySlug || filters.subcategorySlug) {
    return [];
  }

  const qTrim = filters.q?.trim() ?? "";
  if (qTrim) {
    const qSafe = qTrim.slice(0, 200);
    const rx = searchPattern(qSafe);
    query.$or = [
      { name: rx },
      { description: rx },
      { "specificationRows.key": rx },
      { "specificationRows.value": rx },
      { featureLines: rx },
      { highlightLines: rx },
      { specificationsHtml: rx },
      { featuresHtml: rx },
      { highlightsHtml: rx },
      { tags: rx },
      { sku: rx },
    ];
  }

  return Product.find(query).sort({ name: 1 }).lean();
}

/** Lightweight typeahead rows — same DB match as listProducts, capped for speed. */
export async function listProductSuggestions(q: string, limit = 8): Promise<ProductSuggestion[]> {
  const qTrim = q.trim().slice(0, 200);
  if (!qTrim) return [];
  const rx = searchPattern(qTrim);
  const query = {
    isActive: true,
    $or: [
      { name: rx },
      { description: rx },
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
  };
  const cap = Math.min(Math.max(limit, 1), 20);
  const rows = await Product.find(query)
    .select("name slug images sku pricePaise options")
    .sort({ name: 1 })
    .limit(cap)
    .lean();
  return rows.map((p) => ({
    slug: p.slug,
    name: p.name,
    thumb: p.images?.[0] ?? null,
    sku: p.sku,
    displayPricePaise: minOptionPricePaise(p),
    hasPackOptions: productHasOptions(p),
  }));
}

export async function listFeaturedProducts(limit = 12) {
  return Product.find({ isActive: true, featured: true })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
}

async function distinctFeaturedProductIds(): Promise<mongoose.Types.ObjectId[]> {
  const raw = await Product.find({ isActive: true, featured: true }).distinct("_id");
  const out: mongoose.Types.ObjectId[] = [];
  for (const id of raw ?? []) {
    if (id instanceof mongoose.Types.ObjectId) out.push(id);
    else if (mongoose.isValidObjectId(id)) out.push(new mongoose.Types.ObjectId(String(id)));
  }
  return out;
}

/** Newest active products for home “explore”; excludes featured when any exist; else all active (fallback). */
export async function listExploreProductsForHome(
  limit: number,
  _excludeIds: string[] = [],
) {
  const cap = Math.min(Math.max(limit, 1), 48);
  const featuredIds = await distinctFeaturedProductIds();
  const query: Record<string, unknown> = { isActive: true };
  if (featuredIds.length > 0) {
    query._id = { $nin: featuredIds };
  }
  let rows = await Product.find(query).sort({ updatedAt: -1, _id: -1 }).limit(cap).lean();
  let mode: ExploreFeedMode = "non-featured";
  if (rows.length === 0) {
    rows = await Product.find({ isActive: true })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(cap)
      .lean();
    mode = "all-active";
  }
  return { rows, mode };
}

/** Paginated explore feed; use the same `mode` returned from {@link listExploreProductsForHome}. */
export async function listExploreProductsPaged(
  limit: number,
  skip: number,
  mode: ExploreFeedMode,
) {
  const lim = Math.min(Math.max(limit, 1), 48);
  const sk = Math.max(0, Math.floor(skip));
  if (mode === "all-active") {
    return Product.find({ isActive: true })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(sk)
      .limit(lim)
      .lean();
  }
  const featuredIds = await distinctFeaturedProductIds();
  const query: Record<string, unknown> = { isActive: true };
  if (featuredIds.length > 0) {
    query._id = { $nin: featuredIds };
  }
  return Product.find(query).sort({ updatedAt: -1, _id: -1 }).skip(sk).limit(lim).lean();
}

export async function getProductBySlug(slug: string) {
  return Product.findOne({ slug, isActive: true }).lean();
}

export async function getProductBreadcrumb(productSlug: string) {
  const p = await Product.findOne({ slug: productSlug, isActive: true }).lean();
  if (!p) return null;
  const subRaw = p.subcategoryId ? await Subcategory.findById(p.subcategoryId).lean() : null;
  if (subRaw) {
    const sub = withNormalizedCatalogImages(subRaw);
    const catRaw = await Category.findById(sub.categoryId).lean();
    const category = catRaw ? withNormalizedCatalogImages(catRaw) : null;
    return { product: p, subcategory: sub, category };
  }
  const catId = p.categoryId ?? null;
  if (!catId) return { product: p, subcategory: null, category: null };
  const catRaw = await Category.findById(catId).lean();
  const category = catRaw ? withNormalizedCatalogImages(catRaw) : null;
  return { product: p, subcategory: null, category };
}

/** Query params for GET /api/v1/admin/products — all filtering and sorting run server-side. */
export type AdminListProductsParams = {
  categoryId?: string;
  subcategoryId?: string;
  name?: string;
  sku?: string;
  minPricePaise?: number;
  maxPricePaise?: number;
  minStock?: number;
  maxStock?: number;
  sort?: "category" | "subcategory" | "name" | "sku" | "price" | "stock" | "updatedAt";
  order?: "asc" | "desc";
  /** 1-based page index. */
  page?: number;
  pageSize?: number;
};

export type AdminListProductsResult = {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
};

const effectivePriceAddFields: PipelineStage = {
  $addFields: {
    effectivePrice: {
      $cond: [
        { $gt: [{ $size: { $ifNull: ["$options", []] } }, 0] },
        { $min: { $map: { input: "$options", as: "o", in: "$$o.pricePaise" } } },
        "$pricePaise",
      ],
    },
  },
};

async function buildAdminProductMatch(
  params: AdminListProductsParams,
): Promise<{ match: Record<string, unknown> } | { empty: true } | { invalid: true }> {
  const match: Record<string, unknown> = {};

  if (params.subcategoryId) {
    if (!mongoose.isValidObjectId(params.subcategoryId)) return { invalid: true };
    match.subcategoryId = new mongoose.Types.ObjectId(params.subcategoryId);
  } else if (params.categoryId) {
    if (!mongoose.isValidObjectId(params.categoryId)) return { invalid: true };
    const catOid = new mongoose.Types.ObjectId(params.categoryId);
    const subs = await Subcategory.find({ categoryId: params.categoryId }).select("_id").lean();
    const subIds = subs.map((s) => s._id);
    const or: Record<string, unknown>[] = [{ categoryId: catOid }];
    if (subIds.length) {
      or.push({ subcategoryId: { $in: subIds } });
    }
    match.$or = or;
  }

  const name = params.name?.trim();
  if (name) match.name = searchPattern(name.slice(0, 200));

  const sku = params.sku?.trim();
  if (sku) match.sku = searchPattern(sku.slice(0, 80));

  const stockRange: Record<string, number> = {};
  if (params.minStock != null) stockRange.$gte = params.minStock;
  if (params.maxStock != null) stockRange.$lte = params.maxStock;
  if (Object.keys(stockRange).length) match.stock = stockRange;

  return { match };
}

function adminListSimpleSort(
  sort: AdminListProductsParams["sort"],
  order: AdminListProductsParams["order"],
): Record<string, 1 | -1> {
  const dir = order === "asc" ? 1 : -1;
  const col = sort ?? "updatedAt";
  if (col === "updatedAt") return { updatedAt: dir, _id: dir };
  if (col === "name") return { name: dir, _id: dir };
  if (col === "sku") return { sku: dir, _id: dir };
  if (col === "stock") return { stock: dir, _id: dir };
  return { updatedAt: -1, _id: -1 };
}

const ADMIN_PRODUCTS_DEFAULT_PAGE_SIZE = 20;
const ADMIN_PRODUCTS_MAX_PAGE_SIZE = 100;

/**
 * Admin product list with optional filters and sort. Matches storefront “display” price when
 * products have pack options: effective price = min(option.pricePaise) or base `pricePaise`.
 */
export async function adminListProducts(
  params: AdminListProductsParams = {},
): Promise<AdminListProductsResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    ADMIN_PRODUCTS_MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? ADMIN_PRODUCTS_DEFAULT_PAGE_SIZE),
  );
  const skip = (page - 1) * pageSize;

  const built = await buildAdminProductMatch(params);
  if ("invalid" in built) {
    return { items: [], total: 0, page, pageSize };
  }
  if ("empty" in built) {
    return { items: [], total: 0, page, pageSize };
  }

  const { match } = built;
  const sort = params.sort ?? "updatedAt";
  const order = params.order;
  const dir = order === "asc" ? 1 : -1;

  const priceFilter =
    params.minPricePaise != null ||
    params.maxPricePaise != null ||
    sort === "price";
  const needsJoinSort = sort === "category" || sort === "subcategory";
  const needsAggregate = priceFilter || needsJoinSort;

  const projectStage: PipelineStage = {
    $project: {
      effectivePrice: 0,
      _sub: 0,
      _cat: 0,
      _categoryRefId: 0,
    },
  };

  let aggregateSortStage: PipelineStage;
  if (sort === "category") {
    aggregateSortStage = { $sort: { "_cat.name": dir, name: dir, _id: dir } };
  } else if (sort === "subcategory") {
    aggregateSortStage = { $sort: { "_sub.name": dir, name: dir, _id: dir } };
  } else if (sort === "price") {
    aggregateSortStage = { $sort: { effectivePrice: dir, _id: dir } };
  } else if (sort === "name") {
    aggregateSortStage = { $sort: { name: dir, _id: dir } };
  } else if (sort === "sku") {
    aggregateSortStage = { $sort: { sku: dir, _id: dir } };
  } else if (sort === "stock") {
    aggregateSortStage = { $sort: { stock: dir, _id: dir } };
  } else {
    aggregateSortStage = { $sort: { updatedAt: dir, _id: dir } };
  }

  if (!needsAggregate) {
    const [items, total] = await Promise.all([
      Product.find(match)
        .sort(adminListSimpleSort(sort, order))
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(match),
    ]);
    return { items, total, page, pageSize };
  }

  const pipeline: PipelineStage[] = [{ $match: match }];

  if (priceFilter) {
    pipeline.push(effectivePriceAddFields);
    const priceExpr: Record<string, unknown>[] = [];
    if (params.minPricePaise != null) {
      priceExpr.push({ $gte: ["$effectivePrice", params.minPricePaise] });
    }
    if (params.maxPricePaise != null) {
      priceExpr.push({ $lte: ["$effectivePrice", params.maxPricePaise] });
    }
    if (priceExpr.length === 1) {
      pipeline.push({ $match: { $expr: priceExpr[0] } });
    } else if (priceExpr.length > 1) {
      pipeline.push({ $match: { $expr: { $and: priceExpr } } });
    }
  }

  if (needsJoinSort) {
    pipeline.push(
      {
        $lookup: {
          from: Subcategory.collection.name,
          localField: "subcategoryId",
          foreignField: "_id",
          as: "_sub",
        },
      },
      { $unwind: { path: "$_sub", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          _categoryRefId: { $ifNull: ["$_sub.categoryId", "$categoryId"] },
        },
      },
      {
        $lookup: {
          from: Category.collection.name,
          localField: "_categoryRefId",
          foreignField: "_id",
          as: "_cat",
        },
      },
      { $unwind: { path: "$_cat", preserveNullAndEmptyArrays: true } },
    );
  }

  pipeline.push({
    $facet: {
      meta: [{ $count: "total" }],
      data: [
        aggregateSortStage,
        { $skip: skip },
        { $limit: pageSize },
        projectStage,
      ],
    },
  });

  const [aggResult] = await Product.aggregate(pipeline).allowDiskUse(true).exec();
  const total =
    aggResult && Array.isArray(aggResult.meta) && aggResult.meta[0]
      ? Number((aggResult.meta[0] as { total?: number }).total ?? 0)
      : 0;
  const items = Array.isArray(aggResult?.data) ? aggResult.data : [];
  return { items, total, page, pageSize };
}

export async function adminListSubcategories() {
  const rows = await Subcategory.find().sort({ categoryId: 1, sortOrder: 1, name: 1 }).lean();
  return rows.map((d) => withNormalizedCatalogImages(d));
}

export async function adminCreateCategory(input: {
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  images: string[];
}) {
  const doc = await Category.create({
    ...input,
    imageUrl: input.images[0],
  });
  const lean = doc.toObject();
  return withNormalizedCatalogImages(lean);
}

export async function adminUpdateCategory(
  id: string,
  patch: Partial<{
    name: string;
    slug: string;
    description: string;
    sortOrder: number;
    images: string[];
    imageUrl: string;
  }>,
) {
  const next = { ...patch };
  if (patch.images !== undefined) {
    (next as { imageUrl?: string }).imageUrl = patch.images[0] ?? "";
  }
  const doc = await Category.findByIdAndUpdate(id, next, { new: true }).lean();
  return doc ? withNormalizedCatalogImages(doc) : null;
}

export async function adminDeleteCategory(id: string) {
  const oid = new mongoose.Types.ObjectId(id);
  await Product.deleteMany({ categoryId: oid });
  const subs = await Subcategory.find({ categoryId: oid }).select("_id").lean();
  for (const s of subs) {
    await Product.deleteMany({ subcategoryId: s._id });
  }
  await Subcategory.deleteMany({ categoryId: oid });
  await Category.findByIdAndDelete(id);
}

export async function adminCreateSubcategory(input: {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  images?: string[];
  imageUrl?: string;
}) {
  const images =
    input.images?.length ? input.images : input.imageUrl ? [input.imageUrl] : [];
  const doc = await Subcategory.create({
    categoryId: input.categoryId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    sortOrder: input.sortOrder,
    images,
    imageUrl: images[0],
  });
  return withNormalizedCatalogImages(doc.toObject());
}

export async function adminUpdateSubcategory(
  id: string,
  patch: Partial<{
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    sortOrder: number;
    images: string[];
    imageUrl: string;
  }>,
) {
  const next = { ...patch };
  if (patch.images !== undefined) {
    (next as { imageUrl?: string }).imageUrl = patch.images[0] ?? "";
  }
  const doc = await Subcategory.findByIdAndUpdate(id, next, { new: true }).lean();
  return doc ? withNormalizedCatalogImages(doc) : null;
}

export async function adminDeleteSubcategory(id: string) {
  const oid = new mongoose.Types.ObjectId(id);
  await Product.deleteMany({ subcategoryId: oid });
  await Subcategory.findByIdAndDelete(id);
}

export type AdminProductOptionInput = {
  key: string;
  label: string;
  pricePaise: number;
  stock: number;
  sku?: string;
  description?: string;
  specificationRows?: { key: string; value: string }[];
  featureLines?: string[];
  highlightLines?: string[];
};

export type AdminProductColorVariantInput = {
  key: string;
  label: string;
  images: string[];
};

export async function adminCreateProduct(input: {
  categoryId: string;
  /** Omit for products placed directly under the category (no subcategory). */
  subcategoryId?: string | null;
  name: string;
  slug: string;
  description: string;
  specificationRows?: { key: string; value: string }[];
  featureLines?: string[];
  highlightLines?: string[];
  pricePaise: number;
  sku: string;
  stock: number;
  images: string[];
  tags?: string[];
  featured?: boolean;
  isActive?: boolean;
  /** “Was” price for sale strikethrough; should exceed `pricePaise`. */
  compareAtPaise?: number;
  options?: AdminProductOptionInput[];
  colorVariants?: AdminProductColorVariantInput[];
  allowCustomerCustomization?: boolean;
  customizationInstructions?: string;
  customizationTextLabel?: string;
  customizationTextPlaceholder?: string;
  customizationTextMaxLength?: number;
  customizationImageRequired?: boolean;
  customizationTextRequired?: boolean;
}) {
  const { options, colorVariants, compareAtPaise, categoryId, subcategoryId: subIn, ...rest } =
    input;
  const catOid = new mongoose.Types.ObjectId(categoryId);
  let subOid: mongoose.Types.ObjectId | undefined;
  if (subIn) {
    const sub = await Subcategory.findById(subIn).select("categoryId").lean();
    if (!sub) throw new Error("Subcategory not found");
    if (String(sub.categoryId) !== categoryId) {
      throw new Error("Subcategory does not belong to the selected category");
    }
    subOid = new mongoose.Types.ObjectId(subIn);
  }
  const cap =
    typeof compareAtPaise === "number" &&
    Number.isFinite(compareAtPaise) &&
    compareAtPaise > rest.pricePaise
      ? compareAtPaise
      : undefined;
  return Product.create({
    ...rest,
    categoryId: catOid,
    ...(subOid ? { subcategoryId: subOid } : {}),
    ...(cap !== undefined ? { compareAtPaise: cap } : {}),
    options: (options ?? []).map((o) => ({
      key: o.key.trim(),
      label: o.label.trim(),
      pricePaise: o.pricePaise,
      stock: o.stock,
      sku: o.sku?.trim() ?? "",
      description: o.description?.trim() ?? "",
      specificationRows: o.specificationRows ?? [],
      featureLines: o.featureLines ?? [],
      highlightLines: o.highlightLines ?? [],
    })),
    colorVariants: (colorVariants ?? []).map((v) => ({
      key: v.key.trim(),
      label: v.label.trim(),
      images: (v.images ?? []).map((u) => u.trim()).filter(Boolean),
    })),
  });
}

export async function adminUpdateProduct(
  id: string,
  patch: Partial<{
    categoryId: string;
    subcategoryId: string | null;
    name: string;
    slug: string;
    description: string;
    specificationRows?: { key: string; value: string }[];
    featureLines?: string[];
    highlightLines?: string[];
    pricePaise: number;
    sku: string;
    stock: number;
    images: string[];
    tags: string[];
    isActive: boolean;
    featured: boolean;
    compareAtPaise: number | null;
    options: AdminProductOptionInput[];
    colorVariants: AdminProductColorVariantInput[];
    allowCustomerCustomization: boolean;
    customizationInstructions: string;
    customizationTextLabel: string;
    customizationTextPlaceholder: string;
    customizationTextMaxLength: number;
    customizationImageRequired: boolean;
    customizationTextRequired: boolean;
  }>,
) {
  const {
    compareAtPaise,
    categoryId,
    subcategoryId,
    options,
    colorVariants,
    ...patchRest
  } = patch;
  const next = { ...patchRest } as Record<string, unknown>;
  if (categoryId !== undefined) {
    next.categoryId = new mongoose.Types.ObjectId(categoryId);
  }
  if (subcategoryId !== undefined && subcategoryId !== null) {
    next.subcategoryId = new mongoose.Types.ObjectId(subcategoryId);
  }
  if (options !== undefined) {
    next.options = options.map((o) => ({
      key: o.key.trim(),
      label: o.label.trim(),
      pricePaise: o.pricePaise,
      stock: o.stock,
      sku: o.sku?.trim() ?? "",
      description: o.description?.trim() ?? "",
      specificationRows: o.specificationRows ?? [],
      featureLines: o.featureLines ?? [],
      highlightLines: o.highlightLines ?? [],
    }));
  }
  if (colorVariants !== undefined) {
    next.colorVariants = colorVariants.map((v) => ({
      key: v.key.trim(),
      label: v.label.trim(),
      images: (v.images ?? []).map((u) => u.trim()).filter(Boolean),
    }));
  }
  const unset: Record<string, string> = {};
  if (compareAtPaise === null) unset.compareAtPaise = "";
  if (subcategoryId === null) unset.subcategoryId = "";
  if (typeof compareAtPaise === "number" && Number.isFinite(compareAtPaise)) {
    next.compareAtPaise = compareAtPaise;
  }
  if (Object.keys(unset).length > 0) {
    return Product.findByIdAndUpdate(id, { $set: next, $unset: unset }, { new: true }).lean();
  }
  return Product.findByIdAndUpdate(id, next, { new: true }).lean();
}

export async function adminDeleteProduct(id: string) {
  await Product.findByIdAndDelete(id);
}

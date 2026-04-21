import mongoose from "mongoose";
import { Category } from "@/lib/models/Category";
import { Subcategory } from "@/lib/models/Subcategory";
import { Product } from "@/lib/models/Product";
import { SchemaField } from "@/lib/models/SchemaField";
import { syncStorefrontFromAdminProduct } from "@/lib/admin/product-storefront-sync";
import { uniqueProductSlug } from "@/lib/admin/slug-unique";
import { getLowStockThreshold } from "@/lib/admin/low-stock";
import type { FieldType } from "@/lib/models/schema-field-constants";
import type { AdminProductPatchInput } from "@/lib/admin/admin-product-zod";

// ——— Categories ———

export async function adminListCategoriesTree() {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  const subs = await Subcategory.find().sort({ sortOrder: 1, name: 1 }).lean();
  const subToCat = new Map<string, mongoose.Types.ObjectId>();
  for (const s of subs) {
    subToCat.set(String(s._id), s.categoryId as mongoose.Types.ObjectId);
  }

  const countMap = new Map<string, number>();
  const prods = await Product.find().select("categoryId subcategoryId").lean();
  for (const p of prods) {
    let catKey = p.categoryId ? String(p.categoryId) : "";
    if (!catKey && p.subcategoryId) {
      const c = subToCat.get(String(p.subcategoryId));
      if (c) catKey = String(c);
    }
    if (!catKey) continue;
    countMap.set(catKey, (countMap.get(catKey) ?? 0) + 1);
  }

  const schemaCounts = await SchemaField.aggregate<{ _id: mongoose.Types.ObjectId; c: number }>([
    { $group: { _id: "$subcategoryId", c: { $sum: 1 } } },
  ]).exec();
  const schemaBySub = new Map<string, number>();
  for (const row of schemaCounts) {
    schemaBySub.set(String(row._id), row.c);
  }

  return categories.map((c) => ({
    ...c,
    displayOrder: c.sortOrder,
    productCount: countMap.get(String(c._id)) ?? 0,
    subcategories: subs
      .filter((s) => String(s.categoryId) === String(c._id))
      .map((s) => ({
        ...s,
        displayOrder: s.sortOrder,
        schemaFieldCount: schemaBySub.get(String(s._id)) ?? 0,
      })),
  }));
}

export async function adminCreateCategory(input: {
  name: string;
  slug: string;
  displayOrder?: number;
  imageUrl?: string | null;
}) {
  const doc = await Category.create({
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    sortOrder: input.displayOrder ?? 0,
    description: "",
    images: [],
    ...(input.imageUrl != null && String(input.imageUrl).trim() !== "" ?
      { imageUrl: String(input.imageUrl).trim() }
    : {}),
  });
  return doc.toObject();
}

export async function adminPatchCategory(
  id: string,
  patch: Partial<{ name: string; slug: string; displayOrder: number; imageUrl: string | null }>,
) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  if (patch.name !== undefined) $set.name = patch.name.trim();
  if (patch.slug !== undefined) $set.slug = patch.slug.trim().toLowerCase();
  if (patch.displayOrder !== undefined) $set.sortOrder = patch.displayOrder;
  if (patch.imageUrl !== undefined) {
    if (patch.imageUrl === null || patch.imageUrl === "") {
      $unset.imageUrl = 1;
    } else {
      $set.imageUrl = patch.imageUrl.trim();
    }
  }
  const update: mongoose.UpdateQuery<Record<string, unknown>> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!update.$set && !update.$unset) {
    return Category.findById(id).lean();
  }
  const doc = await Category.findByIdAndUpdate(id, update, { new: true }).lean();
  return doc;
}

export async function adminDeleteCategoryGuarded(id: string): Promise<
  { ok: true } | { ok: false; code: "HAS_PRODUCTS"; count: number }
> {
  const catOid = new mongoose.Types.ObjectId(id);
  const subs = await Subcategory.find({ categoryId: id }).select("_id").lean();
  const subIds = subs.map((s) => s._id);
  const count = await Product.countDocuments({
    $or: [{ categoryId: catOid }, { subcategoryId: { $in: subIds } }],
  });
  if (count > 0) return { ok: false, code: "HAS_PRODUCTS", count };
  await Subcategory.deleteMany({ categoryId: catOid });
  await Category.findByIdAndDelete(id);
  return { ok: true };
}

export async function adminReorderCategories(orderedIds: string[]) {
  const bulk = orderedIds.map((cid, idx) => ({
    updateOne: {
      filter: { _id: cid },
      update: { $set: { sortOrder: idx } },
    },
  }));
  if (bulk.length) await Category.bulkWrite(bulk);
}

// ——— Subcategories ———

export async function adminCreateSubcategory(input: {
  categoryId: string;
  name: string;
  slug: string;
  displayOrder?: number;
  imageUrl?: string | null;
}) {
  const cat = await Category.findById(input.categoryId).select("_id").lean();
  if (!cat) throw new Error("Category not found");
  const doc = await Subcategory.create({
    categoryId: input.categoryId,
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    sortOrder: input.displayOrder ?? 0,
    description: "",
    images: [],
    ...(input.imageUrl != null && String(input.imageUrl).trim() !== "" ?
      { imageUrl: String(input.imageUrl).trim() }
    : {}),
  });
  return doc.toObject();
}

export async function adminPatchSubcategory(
  id: string,
  patch: Partial<{
    categoryId: string;
    name: string;
    slug: string;
    displayOrder: number;
    imageUrl: string | null;
  }>,
) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  if (patch.categoryId !== undefined) $set.categoryId = patch.categoryId;
  if (patch.name !== undefined) $set.name = patch.name.trim();
  if (patch.slug !== undefined) $set.slug = patch.slug.trim().toLowerCase();
  if (patch.displayOrder !== undefined) $set.sortOrder = patch.displayOrder;
  if (patch.imageUrl !== undefined) {
    if (patch.imageUrl === null || patch.imageUrl === "") {
      $unset.imageUrl = 1;
    } else {
      $set.imageUrl = patch.imageUrl.trim();
    }
  }
  const update: mongoose.UpdateQuery<Record<string, unknown>> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!update.$set && !update.$unset) {
    return Subcategory.findById(id).lean();
  }
  return Subcategory.findByIdAndUpdate(id, update, { new: true }).lean();
}

export async function adminDeleteSubcategoryGuarded(
  id: string,
): Promise<{ ok: true } | { ok: false; code: "HAS_PRODUCTS" | "HAS_SCHEMA"; count: number }> {
  const nSchema = await SchemaField.countDocuments({ subcategoryId: id });
  if (nSchema > 0) return { ok: false, code: "HAS_SCHEMA", count: nSchema };
  const nProducts = await Product.countDocuments({ subcategoryId: id });
  if (nProducts > 0) return { ok: false, code: "HAS_PRODUCTS", count: nProducts };
  await Subcategory.findByIdAndDelete(id);
  return { ok: true };
}

export async function adminReorderSubcategories(categoryId: string, orderedIds: string[]) {
  const bulk = orderedIds.map((sid, idx) => ({
    updateOne: {
      filter: { _id: sid, categoryId },
      update: { $set: { sortOrder: idx } },
    },
  }));
  if (bulk.length) await Subcategory.bulkWrite(bulk);
}

// ——— Schema fields ———

export async function listSchemaFields(subcategoryId: string) {
  return SchemaField.find({ subcategoryId }).sort({ displayOrder: 1, label: 1 }).lean();
}

export async function countProductsUsingSchemaField(
  subcategoryId: string,
  fieldKey: string,
): Promise<number> {
  return Product.countDocuments({
    subcategoryId,
    [`specValues.${fieldKey}`]: { $exists: true, $nin: [null, "", undefined] },
  });
}

export async function addSchemaField(input: {
  subcategoryId: string;
  key: string;
  label: string;
  fieldType: FieldType;
  options?: string[];
  isHighlight?: boolean;
  isRequired?: boolean;
  displayOrder?: number;
}) {
  const maxOrder = await SchemaField.findOne({ subcategoryId: input.subcategoryId })
    .sort({ displayOrder: -1 })
    .select("displayOrder")
    .lean();
  const displayOrder =
    input.displayOrder ?? (maxOrder?.displayOrder != null ? maxOrder.displayOrder + 1 : 0);
  const doc = await SchemaField.create({
    subcategoryId: input.subcategoryId,
    key: input.key.trim(),
    label: input.label.trim(),
    fieldType: input.fieldType,
    options: input.options ?? [],
    isHighlight: input.isHighlight ?? false,
    isRequired: input.isRequired ?? false,
    displayOrder,
  });
  return doc.toObject();
}

export async function patchSchemaField(
  id: string,
  patch: Partial<{
    key: string;
    label: string;
    fieldType: FieldType;
    options: string[];
    isHighlight: boolean;
    isRequired: boolean;
    displayOrder: number;
  }>,
) {
  return SchemaField.findByIdAndUpdate(id, patch, { new: true }).lean();
}

export async function deleteSchemaField(id: string) {
  await SchemaField.findByIdAndDelete(id);
}

export async function reorderSchemaFields(subcategoryId: string, orderedIds: string[]) {
  const bulk = orderedIds.map((fid, idx) => ({
    updateOne: {
      filter: { _id: fid, subcategoryId },
      update: { $set: { displayOrder: idx } },
    },
  }));
  if (bulk.length) await SchemaField.bulkWrite(bulk);
}

// ——— Products ———

export type AdminProductListFilters = {
  search?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "all";
  categoryId?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "name" | "price" | "stock" | "updatedAt";
  order?: "asc" | "desc";
};

function searchRx(q: string): RegExp {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}

export async function adminListProductsV2(params: AdminProductListFilters) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
  const skip = (page - 1) * pageSize;
  const clauses: Record<string, unknown>[] = [];
  if (params.status && params.status !== "all") {
    if (params.status === "PUBLISHED") {
      clauses.push({
        $or: [{ status: "PUBLISHED" }, { status: { $exists: false }, isActive: true }],
      });
    } else if (params.status === "DRAFT") {
      clauses.push({ status: "DRAFT" });
    } else if (params.status === "ARCHIVED") {
      clauses.push({ status: "ARCHIVED" });
    }
  }
  if (params.categoryId && mongoose.isValidObjectId(params.categoryId)) {
    const catOid = new mongoose.Types.ObjectId(params.categoryId);
    const subs = await Subcategory.find({ categoryId: params.categoryId }).select("_id").lean();
    const subIds = subs.map((s) => s._id);
    clauses.push({ $or: [{ categoryId: catOid }, { subcategoryId: { $in: subIds } }] });
  }
  const q = params.search?.trim();
  if (q) {
    const rx = searchRx(q.slice(0, 200));
    clauses.push({ $or: [{ name: rx }, { brand: rx }, { skuBase: rx }, { sku: rx }] });
  }

  const lowTh = getLowStockThreshold();
  if (params.lowStock) {
    clauses.push({
      $or: [
        { stock: { $lt: lowTh } },
        { colourVariants: { $elemMatch: { sizeStocks: { $elemMatch: { stock: { $lt: lowTh } } } } } },
      ],
    });
  }

  const match: Record<string, unknown> =
    clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0]! : { $and: clauses };

  const pipeline: mongoose.PipelineStage[] = [{ $match: match }];

  const sortKey = params.sort ?? "updatedAt";
  const dir = params.order === "asc" ? 1 : -1;
  const sortStage: Record<string, 1 | -1> =
    sortKey === "name"
      ? { name: dir, _id: dir }
      : sortKey === "price"
        ? { pricePaise: dir, _id: dir }
        : sortKey === "stock"
          ? { stock: dir, _id: dir }
          : { updatedAt: dir, _id: dir };

  pipeline.push({
    $facet: {
      meta: [{ $count: "total" }],
      data: [{ $sort: sortStage }, { $skip: skip }, { $limit: pageSize }],
    },
  });

  const [agg] = await Product.aggregate(pipeline).exec();
  const total =
    agg && Array.isArray(agg.meta) && agg.meta[0] ? Number((agg.meta[0] as { total: number }).total) : 0;
  const items = Array.isArray(agg?.data) ? agg.data : [];

  const catIds = new Set<string>();
  const subIds = new Set<string>();
  for (const row of items) {
    if (row.categoryId) catIds.add(String(row.categoryId));
    if (row.subcategoryId) subIds.add(String(row.subcategoryId));
  }
  const [cats, subs] = await Promise.all([
    Category.find({ _id: { $in: [...catIds] } })
      .select("name slug")
      .lean(),
    Subcategory.find({ _id: { $in: [...subIds] } })
      .select("name slug categoryId")
      .lean(),
  ]);
  const catById = new Map(cats.map((c) => [String(c._id), c]));
  const subById = new Map(subs.map((s) => [String(s._id), s]));

  const enriched = (items as Record<string, unknown>[]).map((p) => {
    const subId = p.subcategoryId;
    const catId = p.categoryId;
    const sub = subId ? subById.get(String(subId)) : undefined;
    const cat =
      catId ?
        catById.get(String(catId))
      : sub?.categoryId ?
        catById.get(String(sub.categoryId))
      : undefined;
    return { ...p, _category: cat ?? null, _subcategory: sub ?? null };
  });

  return { items: enriched, total, page, pageSize };
}

export async function getAdminProductById(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  const p = await Product.findById(id).lean();
  if (!p) return null;
  const sub = p.subcategoryId
    ? await Subcategory.findById(p.subcategoryId).lean()
    : null;
  const cat =
    sub?.categoryId != null
      ? await Category.findById(sub.categoryId).lean()
      : p.categoryId
        ? await Category.findById(p.categoryId).lean()
        : null;
  const schema = p.subcategoryId
    ? await listSchemaFields(String(p.subcategoryId))
    : [];
  return { product: p, category: cat, subcategory: sub, schemaFields: schema };
}

export async function createAdminProductShell(input: {
  subcategoryId: string;
  name: string;
  brand: string;
  skuBase: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}) {
  const sub = await Subcategory.findById(input.subcategoryId).lean();
  if (!sub) throw new Error("Subcategory not found");
  const slug = await uniqueProductSlug(input.name);
  const skuBase = input.skuBase.trim().toUpperCase();
  const doc = await Product.create({
    name: input.name.trim(),
    brand: input.brand.trim(),
    skuBase,
    sku: skuBase,
    slug,
    subcategoryId: sub._id,
    categoryId: sub.categoryId,
    status: input.status ?? "DRAFT",
    description: "",
    descriptionTemplate: "",
    specValues: {},
    pricePaise: 0,
    stock: 0,
    hasColourVariants: true,
    hasSizePricing: false,
    sizesNotApplicable: false,
    packOf: 1,
    colourVariants: [
      {
        displayName: "Default",
        hexCode: "#111111",
        skuSuffix: "DEF",
        basePrice: 0,
        mrp: 0,
        isActive: true,
        displayOrder: 0,
        images: [],
        sizeStocks: [{ size: "OS", stock: 0, priceOverride: null, isActive: true }],
      },
    ],
    isActive: false,
  });
  await syncStorefrontFromAdminProduct(String(doc._id));
  return doc.toObject();
}

function stripMongoIdsForDuplicate(raw: Record<string, unknown>): Record<string, unknown> {
  const cvs = raw.colourVariants;
  const nextCv =
    Array.isArray(cvs) ?
      cvs.map((cv) => {
        if (!cv || typeof cv !== "object") return cv;
        const { _id: _omit, ...rest } = cv as Record<string, unknown>;
        const imgs = rest.images;
        rest.images =
          Array.isArray(imgs) ?
            imgs.map((im) => {
              if (!im || typeof im !== "object") return im;
              const { _id: _i, ...ir } = im as Record<string, unknown>;
              return ir;
            })
          : imgs;
        return rest;
      })
    : cvs;
  return { ...raw, colourVariants: nextCv };
}

export async function duplicateAdminProduct(id: string): Promise<mongoose.Types.ObjectId | null> {
  const src = await Product.findById(id).lean();
  if (!src || !src.skuBase) return null;
  const newSkuBase = `${src.skuBase}-COPY-${Date.now().toString(36).toUpperCase()}`;
  const slug = await uniqueProductSlug(`${src.name} Copy`);
  const plain = JSON.parse(JSON.stringify(src)) as Record<string, unknown>;
  delete plain._id;
  delete plain.createdAt;
  delete plain.updatedAt;
  delete plain.__v;
  const body = stripMongoIdsForDuplicate(plain);
  const doc = await Product.create({
    ...body,
    skuBase: newSkuBase,
    sku: newSkuBase,
    slug,
    name: `${src.name} (Copy)`,
    status: "DRAFT",
    publishedAt: undefined,
    isActive: false,
  });
  await syncStorefrontFromAdminProduct(String(doc._id));
  return doc._id;
}

/** Validated wizard / PATCH update (nested colour variants + images). */
export async function applyAdminProductPatch(
  id: string,
  patch: AdminProductPatchInput,
): Promise<unknown> {
  const p = await Product.findById(id);
  if (!p) return null;

  if (patch.name !== undefined) {
    p.name = patch.name;
    p.slug = await uniqueProductSlug(patch.name, id);
  }
  if (patch.brand !== undefined) p.brand = patch.brand;
  if (patch.skuBase !== undefined) {
    p.skuBase = patch.skuBase.trim().toUpperCase();
    p.sku = p.skuBase;
  }
  if (patch.categoryId !== undefined) {
    p.categoryId = new mongoose.Types.ObjectId(patch.categoryId);
  }
  if (patch.subcategoryId !== undefined) {
    p.subcategoryId = new mongoose.Types.ObjectId(patch.subcategoryId);
    const sub = await Subcategory.findById(patch.subcategoryId).select("categoryId").lean();
    if (sub?.categoryId) p.categoryId = sub.categoryId as mongoose.Types.ObjectId;
  }
  if (patch.hasColourVariants !== undefined) p.hasColourVariants = patch.hasColourVariants;
  if (patch.hasSizePricing !== undefined) p.hasSizePricing = patch.hasSizePricing;
  if (patch.sizesNotApplicable !== undefined) p.sizesNotApplicable = patch.sizesNotApplicable;
  if (patch.packOf !== undefined) p.packOf = patch.packOf;
  if (patch.descriptionTemplate !== undefined) p.descriptionTemplate = patch.descriptionTemplate;
  if (patch.specValues !== undefined) p.specValues = patch.specValues;
  if (patch.manufacturerName !== undefined) p.manufacturerName = patch.manufacturerName ?? undefined;
  if (patch.manufacturerAddress !== undefined) {
    p.manufacturerAddress = patch.manufacturerAddress ?? undefined;
  }
  if (patch.packerSameAsMfr !== undefined) p.packerSameAsMfr = patch.packerSameAsMfr;
  if (patch.packerAddress !== undefined) p.packerAddress = patch.packerAddress ?? undefined;
  if (patch.countryOfOrigin !== undefined) p.countryOfOrigin = patch.countryOfOrigin;
  if (patch.genericName !== undefined) p.genericName = patch.genericName ?? undefined;
  if (patch.status !== undefined) p.status = patch.status;
  if (patch.publishedAt !== undefined) p.publishedAt = patch.publishedAt ?? undefined;
  if (patch.scheduledPublishAt !== undefined) {
    p.scheduledPublishAt = patch.scheduledPublishAt ?? undefined;
  }
  if (patch.featured !== undefined) p.featured = patch.featured;
  if (patch.tags !== undefined) p.tags = patch.tags;

  if (patch.colourVariants !== undefined) {
    p.colourVariants = patch.colourVariants.map((cv) => ({
      _id: cv._id ? new mongoose.Types.ObjectId(cv._id) : new mongoose.Types.ObjectId(),
      displayName: cv.displayName,
      hexCode: cv.hexCode,
      skuSuffix: cv.skuSuffix.trim().toUpperCase(),
      basePrice: cv.basePrice,
      mrp: cv.mrp,
      isActive: cv.isActive ?? true,
      displayOrder: cv.displayOrder ?? 0,
      images: (cv.images ?? []).map((im) => ({
        _id: im._id ? new mongoose.Types.ObjectId(im._id) : new mongoose.Types.ObjectId(),
        url: im.url,
        isPrimary: im.isPrimary ?? false,
        displayOrder: im.displayOrder ?? 0,
        altText: im.altText,
      })),
      sizeStocks:
        cv.sizeStocks && cv.sizeStocks.length > 0 ?
          cv.sizeStocks.map((ss) => ({
            size: ss.size,
            stock: ss.stock,
            priceOverride: ss.priceOverride ?? null,
            isActive: ss.isActive ?? true,
          }))
        : [{ size: "OS", stock: 0, priceOverride: null, isActive: true }],
    })) as unknown as typeof p.colourVariants;
  }

  await p.save();
  if (typeof p.skuBase === "string" && p.skuBase) {
    await syncStorefrontFromAdminProduct(id);
  }
  return p.toObject();
}

export async function deleteAdminProduct(id: string) {
  await Product.findByIdAndDelete(id);
}

export async function isSkuBaseAvailable(skuBase: string, excludeProductId?: string): Promise<boolean> {
  const base = skuBase.trim().toUpperCase();
  const q: Record<string, unknown> = {
    $or: [{ skuBase: base }, { sku: base }],
  };
  if (excludeProductId && mongoose.isValidObjectId(excludeProductId)) {
    q._id = { $ne: new mongoose.Types.ObjectId(excludeProductId) };
  }
  const exists = await Product.findOne(q).select("_id").lean();
  return !exists;
}

export async function addColourVariant(
  productId: string,
  variant: {
    displayName: string;
    hexCode: string;
    skuSuffix: string;
    basePrice: number;
    mrp: number;
    isActive?: boolean;
    displayOrder?: number;
    images?: { url: string; isPrimary?: boolean; displayOrder?: number; altText?: string }[];
    sizeStocks?: { size: string; stock: number; priceOverride?: number | null; isActive?: boolean }[];
  },
): Promise<unknown> {
  const p = await Product.findById(productId);
  if (!p) return null;
  const suffix = variant.skuSuffix.trim().toUpperCase();
  const list = p.colourVariants ?? [];
  for (const v of list) {
    if (String(v.skuSuffix).toUpperCase() === suffix) {
      throw new Error("Duplicate SKU suffix");
    }
  }
  const order =
    variant.displayOrder ??
    (list.length ? Math.max(...list.map((x) => x.displayOrder ?? 0)) + 1 : 0);
  list.push({
    displayName: variant.displayName.trim(),
    hexCode: variant.hexCode.trim(),
    skuSuffix: suffix,
    basePrice: variant.basePrice,
    mrp: variant.mrp,
    isActive: variant.isActive ?? true,
    displayOrder: order,
    images: variant.images ?? [],
    sizeStocks:
      variant.sizeStocks && variant.sizeStocks.length > 0 ?
        variant.sizeStocks
      : [{ size: "OS", stock: 0, priceOverride: null, isActive: true }],
  } as unknown as (typeof list)[number]);
  p.colourVariants = list as unknown as typeof p.colourVariants;
  await p.save();
  await syncStorefrontFromAdminProduct(productId);
  return p.toObject();
}

export async function updateColourVariant(
  productId: string,
  variantId: string,
  patch: Partial<{
    displayName: string;
    hexCode: string;
    skuSuffix: string;
    basePrice: number;
    mrp: number;
    isActive: boolean;
    displayOrder: number;
    images: { url: string; isPrimary?: boolean; displayOrder?: number; altText?: string }[];
    sizeStocks: { size: string; stock: number; priceOverride?: number | null; isActive?: boolean }[];
  }>,
): Promise<unknown> {
  const p = await Product.findById(productId);
  if (!p) return null;
  const vid = new mongoose.Types.ObjectId(variantId);
  const list = p.colourVariants ?? [];
  const idx = list.findIndex((v) => v._id?.equals(vid));
  if (idx < 0) return null;
  const cur = list[idx]!;
  if (patch.displayName !== undefined) cur.displayName = patch.displayName.trim();
  if (patch.hexCode !== undefined) cur.hexCode = patch.hexCode.trim();
  if (patch.skuSuffix !== undefined) cur.skuSuffix = patch.skuSuffix.trim().toUpperCase();
  if (patch.basePrice !== undefined) cur.basePrice = patch.basePrice;
  if (patch.mrp !== undefined) cur.mrp = patch.mrp;
  if (patch.isActive !== undefined) cur.isActive = patch.isActive;
  if (patch.displayOrder !== undefined) cur.displayOrder = patch.displayOrder;
  if (patch.images !== undefined) {
    cur.images = patch.images as unknown as typeof cur.images;
  }
  if (patch.sizeStocks !== undefined) {
    cur.sizeStocks = patch.sizeStocks as unknown as typeof cur.sizeStocks;
  }
  p.colourVariants = list as unknown as typeof p.colourVariants;
  await p.save();
  await syncStorefrontFromAdminProduct(productId);
  return p.toObject();
}

export async function deleteColourVariant(productId: string, variantId: string): Promise<boolean> {
  const p = await Product.findById(productId);
  if (!p) return false;
  const vid = new mongoose.Types.ObjectId(variantId);
  const list = (p.colourVariants ?? []).filter((v) => !v._id?.equals(vid));
  if (list.length === (p.colourVariants ?? []).length) return false;
  if (list.length === 0) return false;
  p.colourVariants = list as unknown as typeof p.colourVariants;
  await p.save();
  await syncStorefrontFromAdminProduct(productId);
  return true;
}

export async function reorderColourVariants(productId: string, orderedIds: string[]): Promise<void> {
  const p = await Product.findById(productId);
  if (!p) return;
  const list = [...(p.colourVariants ?? [])];
  const byId = new Map(list.map((v) => [String(v._id), v]));
  const next: typeof list = [];
  let ord = 0;
  for (const id of orderedIds) {
    const v = byId.get(id);
    if (v) {
      v.displayOrder = ord++;
      next.push(v);
    }
  }
  for (const v of list) {
    if (!next.includes(v)) {
      v.displayOrder = ord++;
      next.push(v);
    }
  }
  p.colourVariants = next as unknown as typeof p.colourVariants;
  await p.save();
  await syncStorefrontFromAdminProduct(productId);
}

export async function addVariantImage(
  productId: string,
  variantId: string,
  img: { url: string; isPrimary?: boolean; displayOrder?: number; altText?: string },
): Promise<unknown> {
  const p = await Product.findById(productId);
  if (!p) return null;
  const vid = new mongoose.Types.ObjectId(variantId);
  const v = (p.colourVariants ?? []).find((x) => x._id?.equals(vid));
  if (!v) return null;
  const imgs = [...(v.images ?? [])];
  const order =
    img.displayOrder ??
    (imgs.length ? Math.max(...imgs.map((i) => i.displayOrder ?? 0)) + 1 : 0);
  imgs.push({
    url: img.url,
    isPrimary: img.isPrimary ?? false,
    displayOrder: order,
    altText: img.altText,
  } as unknown as (typeof imgs)[number]);
  if (img.isPrimary) {
    for (const i of imgs) {
      if (i !== imgs[imgs.length - 1]) i.isPrimary = false;
    }
  }
  v.images = imgs as unknown as typeof v.images;
  await p.save();
  await syncStorefrontFromAdminProduct(productId);
  return p.toObject();
}

export async function deleteVariantImage(
  productId: string,
  variantId: string,
  imageId: string,
): Promise<unknown> {
  const p = await Product.findById(productId);
  if (!p) return null;
  const vid = new mongoose.Types.ObjectId(variantId);
  const v = (p.colourVariants ?? []).find((x) => x._id?.equals(vid));
  if (!v) return null;
  const iid = new mongoose.Types.ObjectId(imageId);
  v.images = (v.images ?? []).filter((i) => !i._id?.equals(iid)) as unknown as typeof v.images;
  await p.save();
  await syncStorefrontFromAdminProduct(productId);
  return p.toObject();
}

export async function reorderVariantImages(
  productId: string,
  variantId: string,
  orderedImageIds: string[],
): Promise<unknown> {
  const p = await Product.findById(productId);
  if (!p) return null;
  const vid = new mongoose.Types.ObjectId(variantId);
  const v = (p.colourVariants ?? []).find((x) => x._id?.equals(vid));
  if (!v) return null;
  const imgs = [...(v.images ?? [])];
  const byId = new Map(imgs.map((i) => [String(i._id), i]));
  const next: typeof imgs = [];
  let ord = 0;
  for (const id of orderedImageIds) {
    const im = byId.get(id);
    if (im) {
      im.displayOrder = ord++;
      im.isPrimary = false;
      next.push(im);
    }
  }
  for (const im of imgs) {
    if (!next.includes(im)) {
      im.displayOrder = ord++;
      next.push(im);
    }
  }
  if (next[0]) next[0].isPrimary = true;
  v.images = next as unknown as typeof v.images;
  await p.save();
  await syncStorefrontFromAdminProduct(productId);
  return p.toObject();
}

export async function putVariantStock(
  productId: string,
  variantId: string,
  sizeStocks: { size: string; stock: number; priceOverride?: number | null; isActive?: boolean }[],
): Promise<unknown> {
  return updateColourVariant(productId, variantId, { sizeStocks });
}

export async function findProductIdByColourVariantId(variantId: string): Promise<string | null> {
  if (!mongoose.isValidObjectId(variantId)) return null;
  const vid = new mongoose.Types.ObjectId(variantId);
  const p = await Product.findOne({ "colourVariants._id": vid }).select("_id").lean();
  return p ? String(p._id) : null;
}

import { Category } from "@/lib/models/Category";
import { Subcategory } from "@/lib/models/Subcategory";
import { Product } from "@/lib/models/Product";
import { withNormalizedCatalogImages } from "@/lib/catalog-images";
import mongoose from "mongoose";

export async function listCategories() {
  const rows = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  return rows.map((d) => withNormalizedCatalogImages(d));
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

/** Unique media URLs for subcategory cards: sub gallery, then products, then category fallbacks */
export async function listPreviewImagesForSubcategory(
  subcategoryId: string,
  extras: {
    subcategoryImages?: string[];
    categoryImages?: string[];
  } = {},
): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (u: string | null | undefined) => {
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  for (const u of extras.subcategoryImages ?? []) push(u);
  const products = await Product.find({
    subcategoryId,
    isActive: true,
  })
    .select("images")
    .sort({ name: 1 })
    .limit(12)
    .lean();
  for (const p of products) {
    for (const img of p.images ?? []) push(img);
  }
  for (const u of extras.categoryImages ?? []) push(u);
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

  if (filters.q?.trim()) {
    const rx = new RegExp(filters.q.trim(), "i");
    query.$or = [{ name: rx }, { description: rx }, { tags: rx }];
  }

  return Product.find(query).sort({ name: 1 }).lean();
}

export async function getProductBySlug(slug: string) {
  return Product.findOne({ slug, isActive: true }).lean();
}

export async function getProductBreadcrumb(productSlug: string) {
  const p = await Product.findOne({ slug: productSlug, isActive: true }).lean();
  if (!p) return null;
  const subRaw = await Subcategory.findById(p.subcategoryId).lean();
  if (!subRaw) return { product: p, subcategory: null, category: null };
  const sub = withNormalizedCatalogImages(subRaw);
  const catRaw = await Category.findById(sub.categoryId).lean();
  const category = catRaw ? withNormalizedCatalogImages(catRaw) : null;
  return { product: p, subcategory: sub, category };
}

export async function adminListProducts() {
  return Product.find().sort({ updatedAt: -1 }).lean();
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

export async function adminCreateProduct(input: {
  subcategoryId: string;
  name: string;
  slug: string;
  description: string;
  pricePaise: number;
  sku: string;
  stock: number;
  images: string[];
  tags?: string[];
  isActive?: boolean;
}) {
  return Product.create(input);
}

export async function adminUpdateProduct(
  id: string,
  patch: Partial<{
    subcategoryId: string;
    name: string;
    slug: string;
    description: string;
    pricePaise: number;
    sku: string;
    stock: number;
    images: string[];
    tags: string[];
    isActive: boolean;
  }>
) {
  return Product.findByIdAndUpdate(id, patch, { new: true }).lean();
}

export async function adminDeleteProduct(id: string) {
  await Product.findByIdAndDelete(id);
}

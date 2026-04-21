import mongoose from "mongoose";
import { Product, type ProductDoc } from "@/lib/models/Product";
import { SchemaField } from "@/lib/models/SchemaField";
import { Subcategory } from "@/lib/models/Subcategory";
import { templateToHtmlDescription } from "@/lib/admin/template-resolve";
import type { FieldType } from "@/lib/models/schema-field-constants";

function formatSpecValue(fieldType: FieldType, value: unknown): string {
  if (value === undefined || value === null) return "";
  if (fieldType === "boolean") return value === true || value === "true" || value === "yes" ? "Yes" : "No";
  return String(value).trim();
}

function rupeesToPaise(r: number): number {
  return Math.max(0, Math.round(r * 100));
}

type LeanColourVariant = NonNullable<ProductDoc["colourVariants"]>[number];

function sortedImages(v: LeanColourVariant): string[] {
  const imgs = [...(v.images ?? [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );
  return imgs.map((i) => i.url).filter(Boolean);
}

function primaryFirstImages(v: LeanColourVariant): string[] {
  const imgs = [...(v.images ?? [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );
  const primaryIdx = imgs.findIndex((i) => i.isPrimary);
  if (primaryIdx > 0) {
    const [p] = imgs.splice(primaryIdx, 1);
    imgs.unshift(p);
  }
  return imgs.map((i) => i.url).filter(Boolean);
}

/**
 * Denormalizes legacy storefront fields from admin v2 data (`skuBase`, `colourVariants`, etc.).
 * No-op when `skuBase` is missing (legacy catalog rows).
 */
export async function syncStorefrontFromAdminProduct(productId: string): Promise<void> {
  const id = new mongoose.Types.ObjectId(productId);
  const product = await Product.findById(id).lean();
  if (!product || typeof product.skuBase !== "string" || !product.skuBase.trim()) {
    return;
  }

  const skuBase = product.skuBase.trim();
  const brand = typeof product.brand === "string" ? product.brand : "";
  const specValues =
    product.specValues && typeof product.specValues === "object" && !Array.isArray(product.specValues)
      ? (product.specValues as Record<string, unknown>)
      : {};

  const subId = product.subcategoryId;
  const schemaRows = subId
    ? await SchemaField.find({ subcategoryId: subId })
        .sort({ displayOrder: 1, label: 1 })
        .lean()
    : [];

  const schemaLite = schemaRows.map((r) => ({ key: r.key, label: r.label }));

  const specificationRows: { key: string; value: string }[] = [];
  const highlightLines: string[] = [];

  for (const row of schemaRows) {
    const raw = specValues[row.key];
    const str = formatSpecValue(row.fieldType, raw);
    if (!str) continue;
    if (row.isHighlight) {
      highlightLines.push(`${row.label}: ${str}`);
    } else {
      specificationRows.push({ key: row.label, value: str });
    }
  }

  const variants = [...(product.colourVariants ?? [])].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );
  const activeVariants = variants.filter((v) => v.isActive !== false);

  const legacyColorVariants = activeVariants.map((v) => {
    const row: {
      key: string;
      label: string;
      images: string[];
      weightKg?: number;
      lengthCm?: number;
      breadthCm?: number;
      heightCm?: number;
    } = {
      key: String(v.skuSuffix).trim().toUpperCase(),
      label: v.displayName,
      images: sortedImages(v),
    };
    const pick = (x: unknown) =>
      typeof x === "number" && Number.isFinite(x) && x > 0 ? x : undefined;
    const w = pick(v.weightKg);
    const l = pick(v.lengthCm);
    const b = pick(v.breadthCm);
    const h = pick(v.heightCm);
    if (w !== undefined) row.weightKg = w;
    if (l !== undefined) row.lengthCm = l;
    if (b !== undefined) row.breadthCm = b;
    if (h !== undefined) row.heightCm = h;
    return row;
  });

  const firstVariant = activeVariants[0];
  const description =
    firstVariant && product.descriptionTemplate
      ? templateToHtmlDescription(
          product.descriptionTemplate,
          specValues as Record<string, string | number | boolean | null | undefined>,
          {
            displayName: firstVariant.displayName,
            basePrice: firstVariant.basePrice,
            mrp: firstVariant.mrp,
            skuSuffix: String(firstVariant.skuSuffix).trim().toUpperCase(),
          },
          brand,
          skuBase,
          schemaLite,
        )
      : typeof product.description === "string"
        ? product.description
        : "";

  const options: {
    key: string;
    label: string;
    pricePaise: number;
    stock: number;
    sku: string;
  }[] = [];

  let totalStock = 0;
  const priceCandidates: number[] = [];
  const mrpCandidates: number[] = [];

  const sizesNA = product.sizesNotApplicable === true;

  for (const v of activeVariants) {
    const suf = String(v.skuSuffix).trim().toUpperCase();
    const stocks = [...(v.sizeStocks ?? [])];
    const rows =
      stocks.length > 0
        ? stocks
        : [{ size: "ONE", stock: 0, priceOverride: null, isActive: true }];

    for (const row of rows) {
      if (row.isActive === false) continue;
      const sizeKey = sizesNA ? "OS" : String(row.size).trim().toUpperCase();
      const labelSize = sizesNA ? "One size" : String(row.size).trim();
      const priceRupees =
        row.priceOverride != null && Number.isFinite(row.priceOverride)
          ? Number(row.priceOverride)
          : v.basePrice;
      const st = Math.max(0, Math.floor(Number(row.stock) || 0));
      const optKey = `${suf}__${sizeKey}`;
      options.push({
        key: optKey,
        label: `${v.displayName} · ${labelSize}`,
        pricePaise: rupeesToPaise(priceRupees),
        stock: st,
        sku: sizesNA ? `${skuBase}-${suf}` : `${skuBase}-${suf}-${sizeKey}`,
      });
      totalStock += st;
      priceCandidates.push(priceRupees);
      mrpCandidates.push(v.mrp);
    }
  }

  const pricePaise =
    priceCandidates.length > 0 ? rupeesToPaise(Math.min(...priceCandidates)) : 0;
  const compareAtPaise =
    mrpCandidates.length > 0 ? rupeesToPaise(Math.max(...mrpCandidates)) : undefined;

  const flatImages: string[] = [];
  for (const v of activeVariants) {
    for (const u of primaryFirstImages(v)) {
      if (!flatImages.includes(u)) flatImages.push(u);
    }
  }

  let categoryId = product.categoryId;
  if (!categoryId && product.subcategoryId) {
    const sub = await Subcategory.findById(product.subcategoryId).select("categoryId").lean();
    if (sub?.categoryId) categoryId = sub.categoryId as mongoose.Types.ObjectId;
  }

  const status = product.status ?? "DRAFT";
  const isActive = status === "PUBLISHED";

  await Product.updateOne(
    { _id: id },
    {
      $set: {
        categoryId: categoryId ?? product.categoryId,
        description,
        specificationRows,
        highlightLines,
        colorVariants: legacyColorVariants,
        images: flatImages.length ? flatImages : product.images,
        options,
        pricePaise,
        ...(compareAtPaise !== undefined ? { compareAtPaise } : {}),
        stock: totalStock,
        sku: skuBase,
        isActive,
      },
    },
  );
}

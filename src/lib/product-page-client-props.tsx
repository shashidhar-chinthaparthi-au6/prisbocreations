import Link from "next/link";
import type { ReactNode } from "react";
import { isHtmlContentEmpty, sanitizeProductDescription } from "@/lib/sanitize-html";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import {
  minOptionPricePaise,
  productHasOptions,
  type ProductOption,
} from "@/lib/product-options";
import { parseProductCustomizationFields } from "@/lib/customization-order-validate";
import type { ProductPageClient } from "@/components/product/ProductPageClient";
import type { ComponentProps } from "react";

type LeanCategory = { slug?: string; name?: string } | null;
type LeanSubcategory = { slug?: string; name?: string } | null;

/** Product lean doc as returned from Mongo (admin or storefront). */
type LeanProduct = Record<string, unknown>;

export function buildProductPageClientPropsFromDoc(
  p: LeanProduct,
  cat: LeanCategory,
  sub: LeanSubcategory,
): ComponentProps<typeof ProductPageClient> {
  const descriptionHtml = sanitizeProductDescription(
    typeof p["description"] === "string" ? p["description"] : "",
  );

  const raw = p as typeof p & {
    specificationRows?: unknown;
    featureLines?: unknown;
    highlightLines?: unknown;
    specificationsHtml?: string;
    featuresHtml?: string;
    highlightsHtml?: string;
  };

  const specificationRows: { key: string; value: string }[] = [];
  if (Array.isArray(raw.specificationRows)) {
    for (const row of raw.specificationRows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const rec = row as unknown as Record<string, unknown>;
      const key = typeof rec.key === "string" ? rec.key.trim() : "";
      const value = typeof rec.value === "string" ? rec.value.trim() : "";
      if (key && value) specificationRows.push({ key, value });
    }
  }

  const linesFromDoc = (field: unknown): string[] => {
    if (!Array.isArray(field)) return [];
    const out: string[] = [];
    for (const x of field) {
      if (typeof x !== "string") continue;
      const t = x.trim();
      if (t) out.push(t);
    }
    return out;
  };

  const featureLines = linesFromDoc(raw.featureLines);
  const highlightLines = linesFromDoc(raw.highlightLines);

  const legacySpecificationsHtml = sanitizeProductDescription(
    typeof raw.specificationsHtml === "string" ? raw.specificationsHtml : "",
  );
  const legacyFeaturesHtml = sanitizeProductDescription(
    typeof raw.featuresHtml === "string" ? raw.featuresHtml : "",
  );
  const legacyHighlightsHtml = sanitizeProductDescription(
    typeof raw.highlightsHtml === "string" ? raw.highlightsHtml : "",
  );
  const cartOptions = (() => {
    const opts = p["options"];
    if (!Array.isArray(opts) || opts.length === 0) return undefined;
    type CartOpt = {
      key: string;
      label: string;
      pricePaise: number;
      stock: number;
      descriptionHtml?: string;
      specificationRows?: { key: string; value: string }[];
      featureLines?: string[];
      highlightLines?: string[];
    };
    const packSpecRows = (rawOpt: Record<string, unknown>): { key: string; value: string }[] => {
      const sr = rawOpt.specificationRows;
      if (!Array.isArray(sr)) return [];
      const rows: { key: string; value: string }[] = [];
      for (const row of sr) {
        if (!row || typeof row !== "object" || Array.isArray(row)) continue;
        const rec = row as unknown as Record<string, unknown>;
        const key = typeof rec.key === "string" ? rec.key.trim() : "";
        const value = typeof rec.value === "string" ? rec.value.trim() : "";
        if (key && value) rows.push({ key, value });
      }
      return rows;
    };
    const packLines = (field: unknown): string[] => linesFromDoc(field);
    const out: CartOpt[] = [];
    for (const o of opts) {
      if (!o || typeof o !== "object" || Array.isArray(o)) continue;
      const r = o as unknown as Record<string, unknown>;
      if (
        typeof r.key !== "string" ||
        typeof r.label !== "string" ||
        typeof r.pricePaise !== "number" ||
        !Number.isFinite(r.pricePaise) ||
        typeof r.stock !== "number" ||
        !Number.isFinite(r.stock)
      ) {
        continue;
      }
      const rawDesc = typeof r.description === "string" ? r.description : "";
      const packDesc = sanitizeProductDescription(rawDesc);
      const spec = packSpecRows(r);
      const fl = packLines(r.featureLines);
      const hl = packLines(r.highlightLines);
      out.push({
        key: r.key,
        label: r.label,
        pricePaise: r.pricePaise,
        stock: r.stock,
        ...(!isHtmlContentEmpty(packDesc) ? { descriptionHtml: packDesc } : {}),
        ...(spec.length ? { specificationRows: spec } : {}),
        ...(fl.length ? { featureLines: fl } : {}),
        ...(hl.length ? { highlightLines: hl } : {}),
      });
    }
    return out.length ? out : undefined;
  })();

  const colorVariants = colorVariantsFromDoc(p);
  const defaultImages = Array.isArray(p["images"])
    ? p["images"].filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  const primaryImage =
    listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];

  const productName = typeof p["name"] === "string" ? p["name"] : "";
  const tags = Array.isArray(p["tags"])
    ? p["tags"].filter((t): t is string => typeof t === "string")
    : [];

  const pc = p as typeof p & {
    allowCustomerCustomization?: boolean;
    customizationInstructions?: string;
    customizationTextLabel?: string;
    customizationTextPlaceholder?: string;
    customizationTextMaxLength?: number;
    customizationImageRequired?: boolean;
    customizationTextRequired?: boolean;
    customizationFields?: unknown;
  };

  const customizationFields = parseProductCustomizationFields(pc.customizationFields);

  const catSlug = cat && typeof cat.slug === "string" ? cat.slug : "";
  const subSlug = sub && typeof sub.slug === "string" ? sub.slug : "";
  const catName = cat && typeof cat.name === "string" ? cat.name : "";
  const subName = sub && typeof sub.name === "string" ? sub.name : "";

  const breadcrumb: ReactNode =
    cat && sub && catSlug && subSlug ?
      <p className="text-sm text-ink-muted">
        <Link href="/categories" className="hover:text-accent">
          Categories
        </Link>{" "}
        /{" "}
        <Link href={`/category/${catSlug}`} className="hover:text-accent">
          {catName}
        </Link>{" "}
        /{" "}
        <Link href={`/category/${catSlug}/${subSlug}`} className="hover:text-accent">
          {subName}
        </Link>
      </p>
    : null;

  const backLink: ReactNode =
    cat && sub && catSlug && subSlug ?
      <Link
        href={`/category/${catSlug}/${subSlug}`}
        className="text-sm text-accent hover:underline"
      >
        ← Back to {subName}
      </Link>
    : (
      <Link href="/categories" className="text-sm text-accent hover:underline">
        ← Back to shop
      </Link>
      );

  const phys = p as typeof p & {
    weightKg?: number;
    lengthCm?: number;
    breadthCm?: number;
    heightCm?: number;
  };
  const pickPhys = (v: unknown, d: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };

  return {
    defaultImages,
    colorVariants,
    galleryProductName: productName,
    sku:
      typeof p["sku"] === "string" && p["sku"]
        ? p["sku"]
        : String(p["skuBase"] ?? ""),
    title: productName,
    breadcrumb,
    backLink,
    descriptionHtml,
    specificationRows,
    featureLines,
    highlightLines,
    legacySpecificationsHtml:
      specificationRows.length === 0 ? legacySpecificationsHtml : "",
    legacyFeaturesHtml: featureLines.length === 0 ? legacyFeaturesHtml : "",
    legacyHighlightsHtml: highlightLines.length === 0 ? legacyHighlightsHtml : "",
    tags,
    product: {
      id: String(p["_id"]),
      slug: typeof p["slug"] === "string" ? p["slug"] : "",
      name: productName,
      pricePaise:
        typeof p["pricePaise"] === "number" && Number.isFinite(p["pricePaise"])
          ? p["pricePaise"]
          : Number(p["pricePaise"]) || 0,
      stock:
        typeof p["stock"] === "number" && Number.isFinite(p["stock"])
          ? p["stock"]
          : Number(p["stock"]) || 0,
      image: primaryImage,
      weightKg: pickPhys(phys.weightKg, 0.3),
      lengthCm: pickPhys(phys.lengthCm, 20),
      breadthCm: pickPhys(phys.breadthCm, 15),
      heightCm: pickPhys(phys.heightCm, 5),
      options: cartOptions?.length ? cartOptions : undefined,
      allowCustomerCustomization: Boolean(pc.allowCustomerCustomization),
      customizationInstructions:
        typeof pc.customizationInstructions === "string" ? pc.customizationInstructions : "",
      customizationTextLabel:
        typeof pc.customizationTextLabel === "string" ? pc.customizationTextLabel : undefined,
      customizationTextPlaceholder:
        typeof pc.customizationTextPlaceholder === "string"
          ? pc.customizationTextPlaceholder
          : undefined,
      customizationTextMaxLength:
        typeof pc.customizationTextMaxLength === "number" ? pc.customizationTextMaxLength : undefined,
      customizationImageRequired: pc.customizationImageRequired,
      customizationTextRequired: Boolean(pc.customizationTextRequired),
      ...(customizationFields.length ? { customizationFields } : {}),
    },
  };
}

/** For JSON-LD / SEO on the live product page only. */
export function productJsonLdBasics(p: LeanProduct) {
  const colorVariants = colorVariantsFromDoc(p);
  const defaultImages = Array.isArray(p["images"])
    ? p["images"].filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  const primaryImage =
    listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];
  const pricePaise =
    typeof p["pricePaise"] === "number" ? p["pricePaise"] : Number(p["pricePaise"]) || 0;
  const priced = p as typeof p & { pricePaise: number; options?: ProductOption[] | null };
  const priceModel = { ...priced, pricePaise };
  const listPricePaise = productHasOptions(priceModel) ? minOptionPricePaise(priceModel) : pricePaise;
  const effStock = productHasOptions(priceModel)
    ? (priceModel.options ?? []).reduce(
        (s, o) => s + Math.max(0, Number(o.stock) || 0),
        0,
      )
    : Math.max(0, Number(p["stock"]) || 0);
  return { primaryImage, listPricePaise, effStock };
}

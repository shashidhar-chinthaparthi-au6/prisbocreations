import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { getProductBreadcrumb } from "@/lib/services/catalogService";
import { isHtmlContentEmpty, sanitizeProductDescription } from "@/lib/sanitize-html";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import { ProductPageClient } from "@/components/product/ProductPageClient";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";

export const revalidate = 30;

async function productSlugFromParams(
  params: Promise<{ slug: string }>,
): Promise<string> {
  const raw = await params;
  const slug = raw && typeof raw.slug === "string" ? raw.slug.trim() : "";
  return slug;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = await productSlugFromParams(params);
  if (!slug) return { title: "Product" };
  await connectDb();
  const nav = await getProductBreadcrumb(slug);
  const name = nav?.product?.name ?? "Product";
  const desc =
    typeof nav?.product?.description === "string"
      ? nav.product.description.replace(/<[^>]+>/g, "").slice(0, 160)
      : "Personalised gift from Prisbo Creations.";
  const img = Array.isArray(nav?.product?.images) ? nav?.product?.images?.[0] : undefined;
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const url = `${base}/products/${slug}`;
  return {
    title: name,
    description: desc,
    openGraph: {
      title: name,
      description: desc,
      url,
      ...(typeof img === "string" && img ? { images: [{ url: img }] } : {}),
    },
    alternates: { canonical: `/products/${slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = await productSlugFromParams(params);
  if (!slug) notFound();
  await connectDb();
  const nav = await getProductBreadcrumb(slug);
  if (!nav?.product) notFound();

  const { product: p, category: cat, subcategory: sub } = nav;
  const descriptionHtml = sanitizeProductDescription(
    typeof p.description === "string" ? p.description : "",
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

  let featureLines = linesFromDoc(raw.featureLines);
  let highlightLines = linesFromDoc(raw.highlightLines);

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
    const opts = p.options;
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
  const defaultImages = Array.isArray(p.images) ? p.images : [];
  const primaryImage =
    listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];

  const pc = p as typeof p & {
    allowCustomerCustomization?: boolean;
    customizationInstructions?: string;
    customizationTextLabel?: string;
    customizationTextPlaceholder?: string;
    customizationTextMaxLength?: number;
    customizationImageRequired?: boolean;
    customizationTextRequired?: boolean;
  };

  const breadcrumb =
    cat && sub ? (
      <p className="text-sm text-ink-muted">
        <Link href="/categories" className="hover:text-accent">
          Categories
        </Link>{" "}
        /{" "}
        <Link href={`/category/${cat.slug}`} className="hover:text-accent">
          {cat.name}
        </Link>{" "}
        /{" "}
        <Link href={`/category/${cat.slug}/${sub.slug}`} className="hover:text-accent">
          {sub.name}
        </Link>
      </p>
    ) : null;

  const backLink =
    cat && sub ? (
      <Link
        href={`/category/${cat.slug}/${sub.slug}`}
        className="text-sm text-accent hover:underline"
      >
        ← Back to {sub.name}
      </Link>
    ) : (
      <Link href="/categories" className="text-sm text-accent hover:underline">
        ← Back to shop
      </Link>
    );

  const listPricePaise = productHasOptions(p) ? minOptionPricePaise(p) : p.pricePaise;
  const effStock = productHasOptions(p)
    ? (p.options ?? []).reduce((s, o) => s + Math.max(0, Number(o.stock) || 0), 0)
    : Math.max(0, Number(p.stock) || 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    image: primaryImage ? [primaryImage] : undefined,
    offers: {
      "@type": "Offer",
      price: (listPricePaise / 100).toFixed(2),
      priceCurrency: "INR",
      availability:
        effStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageClient
        defaultImages={defaultImages}
        colorVariants={colorVariants}
        galleryProductName={p.name}
        sku={p.sku}
        title={p.name}
        breadcrumb={breadcrumb}
        backLink={backLink}
        descriptionHtml={descriptionHtml}
        specificationRows={specificationRows}
        featureLines={featureLines}
        highlightLines={highlightLines}
        legacySpecificationsHtml={
          specificationRows.length === 0 ? legacySpecificationsHtml : ""
        }
        legacyFeaturesHtml={featureLines.length === 0 ? legacyFeaturesHtml : ""}
        legacyHighlightsHtml={highlightLines.length === 0 ? legacyHighlightsHtml : ""}
        tags={p.tags ?? []}
        product={{
          id: String(p._id),
          slug: p.slug,
          name: p.name,
          pricePaise: p.pricePaise,
          stock: p.stock,
          image: primaryImage,
          options: cartOptions?.length ? cartOptions : undefined,
          allowCustomerCustomization: Boolean(pc.allowCustomerCustomization),
          customizationInstructions:
            typeof pc.customizationInstructions === "string"
              ? pc.customizationInstructions
              : "",
          customizationTextLabel:
            typeof pc.customizationTextLabel === "string"
              ? pc.customizationTextLabel
              : undefined,
          customizationTextPlaceholder:
            typeof pc.customizationTextPlaceholder === "string"
              ? pc.customizationTextPlaceholder
              : undefined,
          customizationTextMaxLength:
            typeof pc.customizationTextMaxLength === "number"
              ? pc.customizationTextMaxLength
              : undefined,
          customizationImageRequired: pc.customizationImageRequired,
          customizationTextRequired: Boolean(pc.customizationTextRequired),
        }}
      />
    </>
  );
}

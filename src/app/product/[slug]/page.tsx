import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { getProductBreadcrumb } from "@/lib/services/catalogService";
import { isHtmlContentEmpty, sanitizeProductDescription } from "@/lib/sanitize-html";
import { colorVariantsFromDoc } from "@/lib/product-color-variants";
import { ProductPageClient } from "@/components/product/ProductPageClient";

export const dynamic = "force-dynamic";

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
  return { title: nav?.product?.name ?? "Product" };
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
  const cartOptions = (() => {
    const opts = p.options;
    if (!Array.isArray(opts) || opts.length === 0) return undefined;
    type CartOpt = {
      key: string;
      label: string;
      pricePaise: number;
      stock: number;
      descriptionHtml?: string;
    };
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
      const raw = typeof r.description === "string" ? r.description : "";
      const packDesc = sanitizeProductDescription(raw);
      out.push({
        key: r.key,
        label: r.label,
        pricePaise: r.pricePaise,
        stock: r.stock,
        ...(!isHtmlContentEmpty(packDesc) ? { descriptionHtml: packDesc } : {}),
      });
    }
    return out.length ? out : undefined;
  })();

  const colorVariants = colorVariantsFromDoc(p);
  const defaultImages = Array.isArray(p.images) ? p.images : [];

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

  return (
    <ProductPageClient
      defaultImages={defaultImages}
      colorVariants={colorVariants}
      galleryProductName={p.name}
      sku={p.sku}
      title={p.name}
      breadcrumb={breadcrumb}
      backLink={backLink}
      descriptionHtml={descriptionHtml}
      tags={p.tags ?? []}
      product={{
        id: String(p._id),
        slug: p.slug,
        name: p.name,
        pricePaise: p.pricePaise,
        stock: p.stock,
        image: defaultImages[0],
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
  );
}

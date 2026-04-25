import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { effectiveCatalogImages } from "@/lib/catalog-images";
import {
  listingWantsInStockOnly,
  listStorefrontCategoryRows,
  listStorefrontFilterFacets,
  listStorefrontProducts,
  listStorefrontSubcategoryRowsForCategory,
  type StorefrontSort,
} from "@/lib/services/storefrontCatalog";
import { getCategoryBySlug } from "@/lib/services/catalogService";
import { StorefrontListing } from "@/components/listing/StorefrontListing";
import { STOREFRONT_FULL_BLEED, STOREFRONT_GUTTER } from "@/lib/storefront-layout";

export const revalidate = 60;

function parseSort(s: string | undefined): StorefrontSort | undefined {
  if (
    s === "relevance" ||
    s === "newest" ||
    s === "price_asc" ||
    s === "price_desc" ||
    s === "popular" ||
    s === "name_asc"
  ) {
    return s;
  }
  return undefined;
}

export async function generateStaticParams() {
  await connectDb();
  const rows = await Category.find().select("slug").lean();
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDb();
  const cat = await getCategoryBySlug(slug);
  if (!cat) return { title: "Category" };
  const desc =
    typeof cat.description === "string" && cat.description.trim()
      ? cat.description
      : `Shop ${cat.name} — personalised and custom made in our studio.`;
  const imgs = effectiveCatalogImages(cat);
  return {
    title: `${cat.name} — Prisbo Creations`,
    description: desc,
    openGraph: {
      title: `${cat.name} — Prisbo Creations`,
      ...(imgs[0] ? { images: [{ url: imgs[0] }] } : {}),
    },
  };
}

async function CategoryListingSection({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = parseSort(typeof sp.sort === "string" ? sp.sort : undefined);
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const subRaw =
    typeof sp.sub === "string"
      ? sp.sub
      : typeof sp.subcategory === "string"
        ? sp.subcategory
        : undefined;
  const priceMin =
    typeof sp.price_min === "string" && sp.price_min !== "" ? Number(sp.price_min) : undefined;
  const priceMax =
    typeof sp.price_max === "string" && sp.price_max !== "" ? Number(sp.price_max) : undefined;
  const inStockOnly = listingWantsInStockOnly(sp.in_stock) ? true : false;
  const occasion = typeof sp.occasion === "string" ? sp.occasion : undefined;
  const material = typeof sp.material === "string" ? sp.material : undefined;
  const minAverageRating = sp.rating === "4" ? 4 : undefined;

  await connectDb();
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const [counts, subcategories, result, facets] = await Promise.all([
    listStorefrontCategoryRows(),
    listStorefrontSubcategoryRowsForCategory(slug),
    listStorefrontProducts({
      categorySlugs: [slug],
      subcategorySlug: subRaw,
      q,
      sort: sort ?? "relevance",
      page,
      pageSize: 24,
      inStockOnly,
      priceMinPaise:
        priceMin != null && Number.isFinite(priceMin) ? Math.max(0, Math.round(priceMin * 100)) : undefined,
      priceMaxPaise:
        priceMax != null && Number.isFinite(priceMax) ? Math.max(0, Math.round(priceMax * 100)) : undefined,
      occasion,
      material,
      minAverageRating,
    }),
    listStorefrontFilterFacets({
      categorySlugs: [slug],
      subcategorySlug: subRaw,
    }),
  ]);

  const subMeta = subRaw ? subcategories.find((s) => s.slug === subRaw) : undefined;

  const categories = counts;

  return (
    <div className={STOREFRONT_FULL_BLEED}>
      <div className="pb-16">
        <div className={`${STOREFRONT_GUTTER} pt-2 sm:pt-4`}>
          <StorefrontListing
            initial={result}
            categories={categories}
            categoryLabelRows={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            subcategories={subcategories}
            facets={facets}
            mode="category"
            title={cat.name}
            subtitle={subMeta ? subMeta.name : undefined}
            forcedCategorySlug={slug}
          />
        </div>
      </div>
    </div>
  );
}

export default function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse px-4 py-20 text-center text-sm text-[var(--brand-muted)]">
          Loading…
        </div>
      }
    >
      <CategoryListingSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}

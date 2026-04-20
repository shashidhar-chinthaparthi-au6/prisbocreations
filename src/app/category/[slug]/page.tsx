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
import { CategoryHero } from "@/components/category/CategoryHero";
import { SubcategoryPills } from "@/components/category/SubcategoryPills";

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

  const totalInCat = counts.find((c) => c.slug === slug)?.count ?? result.total;
  const heroImg = effectiveCatalogImages(cat)[0] ?? null;
  const desc = typeof cat.description === "string" ? cat.description : "";
  const subMeta = subRaw ? subcategories.find((s) => s.slug === subRaw) : undefined;

  const categories = counts;

  return (
    <div className="pb-16">
      <CategoryHero
        name={cat.name}
        description={desc}
        imageUrl={heroImg}
        subcategoryCount={subcategories.length}
        productCount={totalInCat}
      />
      <div className="mx-auto max-w-[1400px] px-4 pt-4 sm:px-6">
        {subcategories.length > 0 ? (
          <Suspense fallback={null}>
            <SubcategoryPills categorySlug={slug} subcategories={subcategories} totalCount={totalInCat} />
          </Suspense>
        ) : null}
      </div>
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6">
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

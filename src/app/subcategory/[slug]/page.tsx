import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Subcategory } from "@/lib/models/Subcategory";
import {
  listingWantsInStockOnly,
  listStorefrontCategoryRows,
  listStorefrontFilterFacets,
  listStorefrontProducts,
  listStorefrontSubcategoryRowsForCategory,
  type StorefrontSort,
} from "@/lib/services/storefrontCatalog";
import { StorefrontListing } from "@/components/listing/StorefrontListing";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDb();
  const subs = await Subcategory.find({ slug: slug.trim().toLowerCase() }).lean();
  const sub = subs[0];
  if (!sub) return { title: "Subcategory" };
  return { title: `${sub.name} — Prisbo Creations` };
}

async function SubcategoryListingSection({
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
  const categoryHint =
    typeof sp.category === "string" ? sp.category.trim().toLowerCase() : undefined;
  const priceMin =
    typeof sp.price_min === "string" && sp.price_min !== "" ? Number(sp.price_min) : undefined;
  const priceMax =
    typeof sp.price_max === "string" && sp.price_max !== "" ? Number(sp.price_max) : undefined;
  const inStockOnly = listingWantsInStockOnly(sp.in_stock) ? true : false;
  const occasion = typeof sp.occasion === "string" ? sp.occasion : undefined;
  const material = typeof sp.material === "string" ? sp.material : undefined;
  const minAverageRating = sp.rating === "4" ? 4 : undefined;

  await connectDb();
  const slugNorm = slug.trim().toLowerCase();
  const candidates = await Subcategory.find({ slug: slugNorm }).lean();
  if (!candidates.length) notFound();

  let sub = candidates[0];
  if (candidates.length > 1) {
    if (!categoryHint) {
      notFound();
    }
    const cat = await Category.findOne({ slug: categoryHint }).lean();
    if (!cat) notFound();
    const match = candidates.find((c) => String(c.categoryId) === String(cat._id));
    if (!match) notFound();
    sub = match;
  }

  const catDoc = await Category.findById(sub.categoryId).lean();
  if (!catDoc) notFound();
  const catSlug = catDoc.slug;

  const [categories, subcategories, result, facets] = await Promise.all([
    listStorefrontCategoryRows(),
    listStorefrontSubcategoryRowsForCategory(catSlug),
    listStorefrontProducts({
      categorySlugs: [catSlug],
      subcategorySlug: slugNorm,
      subcategoryCategorySlug: catSlug,
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
      categorySlugs: [catSlug],
      subcategorySlug: slugNorm,
    }),
  ]);

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6">
      <StorefrontListing
        initial={result}
        categories={categories}
        categoryLabelRows={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        subcategories={subcategories}
        facets={facets}
        mode="category"
        title={sub.name}
        subtitle={`${catDoc.name} · ${sub.name}`}
        forcedCategorySlug={catSlug}
        forcedSubcategorySlug={slugNorm}
      />
    </div>
  );
}

export default function SubcategoryPage({
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
      <SubcategoryListingSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}

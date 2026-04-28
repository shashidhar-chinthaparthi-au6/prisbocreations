import { Suspense } from "react";
import type { Metadata } from "next";
import { connectDb } from "@/lib/db";
import {
  listingWantsInStockOnly,
  listStorefrontCategoryRows,
  listStorefrontFilterFacets,
  listStorefrontProducts,
  listStorefrontSubcategoryRowsForCategory,
  type StorefrontSort,
} from "@/lib/services/storefrontCatalog";
import { StorefrontListing } from "@/components/listing/StorefrontListing";
import {
  parseCategoriesFromNextSearchParams,
  parseSubcategoryPairsFromNextSearchParams,
} from "@/lib/storefront/parse-listing-sub-params";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "All Products — Prisbo Creations",
  description:
    "Browse personalised gifts and keepsakes — Spotify keychains, photo mugs, custom coasters and more. Made in our studio in Hyderabad.",
  openGraph: {
    title: "All Products — Prisbo Creations",
    images: [{ url: "https://prisbocreations.com/og/products.jpg" }],
  },
};

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

async function ProductsListingLoader({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sort = parseSort(typeof sp.sort === "string" ? sp.sort : undefined);
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const category = parseCategoriesFromNextSearchParams(sp);
  const subPairs = parseSubcategoryPairsFromNextSearchParams(sp);
  const priceMin =
    typeof sp.price_min === "string" && sp.price_min !== "" ? Number(sp.price_min) : undefined;
  const priceMax =
    typeof sp.price_max === "string" && sp.price_max !== "" ? Number(sp.price_max) : undefined;
  const inStockOnly = listingWantsInStockOnly(sp.in_stock) ? true : false;
  const occasion = typeof sp.occasion === "string" ? sp.occasion : undefined;
  const material = typeof sp.material === "string" ? sp.material : undefined;
  const minAverageRating = sp.rating === "4" ? 4 : undefined;

  await connectDb();
  const [categories, result, facets] = await Promise.all([
    listStorefrontCategoryRows(),
    listStorefrontProducts({
      categorySlugs: category,
      subcategoryPairs: subPairs,
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
      categorySlugs: category?.length === 1 ? category : undefined,
      subcategoryPairs: subPairs,
    }),
  ]);

  let subcategories: Awaited<ReturnType<typeof listStorefrontSubcategoryRowsForCategory>> = [];
  if (category?.length === 1) {
    subcategories = await listStorefrontSubcategoryRowsForCategory(category[0]);
  }

  return (
    <div className="px-4 pb-16 pt-6 sm:px-6">
      <StorefrontListing
        initial={result}
        categories={categories}
        categoryLabelRows={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        subcategories={subcategories}
        facets={facets}
        mode="all"
        title="All products"
      />
    </div>
  );
}

export default function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1400px] animate-pulse px-4 py-20 text-center text-sm text-[var(--brand-muted)]">
          Loading products…
        </div>
      }
    >
      <ProductsListingLoader searchParams={searchParams} />
    </Suspense>
  );
}

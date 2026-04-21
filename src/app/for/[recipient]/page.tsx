import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipientCollectionHero } from "@/components/storefront/RecipientCollectionHero";
import { StorefrontListing } from "@/components/listing/StorefrontListing";
import { connectDb } from "@/lib/db";
import { RECIPIENT_META, RECIPIENT_SLUGS, parseRecipientSlug } from "@/lib/recipients";
import {
  listingWantsInStockOnly,
  listStorefrontCategoryRows,
  listStorefrontFilterFacets,
  listStorefrontProducts,
  listStorefrontSubcategoryRowsForCategory,
  type StorefrontSort,
} from "@/lib/services/storefrontCatalog";

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

function spToCategoryList(val: string | string[] | undefined): string[] | undefined {
  if (val === undefined) return undefined;
  if (typeof val === "string") return val ? [val] : undefined;
  const arr = val.filter((x): x is string => typeof x === "string" && Boolean(x));
  return arr.length ? arr : undefined;
}

export function generateStaticParams() {
  return RECIPIENT_SLUGS.map((recipient) => ({ recipient }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ recipient: string }>;
}): Promise<Metadata> {
  const { recipient: raw } = await params;
  const slug = parseRecipientSlug(raw);
  if (!slug) return { title: "Recipient" };
  const m = RECIPIENT_META[slug];
  return {
    title: `${m.title} — Prisbo Creations`,
    description: m.description,
    openGraph: {
      title: `${m.title} — Prisbo Creations`,
      images: [{ url: m.image }],
    },
  };
}

async function RecipientListingSection({
  params,
  searchParams,
}: {
  params: Promise<{ recipient: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { recipient: raw } = await params;
  const slug = parseRecipientSlug(raw);
  if (!slug) notFound();

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

  const category = spToCategoryList(sp.category);

  await connectDb();
  const meta = RECIPIENT_META[slug];

  const [counts, result, facets] = await Promise.all([
    listStorefrontCategoryRows(),
    listStorefrontProducts({
      categorySlugs: category,
      subcategorySlug: subRaw,
      recipient: slug,
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
      subcategorySlug: subRaw,
      recipient: slug,
    }),
  ]);

  let subcategories: Awaited<ReturnType<typeof listStorefrontSubcategoryRowsForCategory>> = [];
  if (category?.length === 1) {
    subcategories = await listStorefrontSubcategoryRowsForCategory(category[0]);
  }

  return (
    <div className="pb-16">
      <RecipientCollectionHero
        title={meta.title}
        description={meta.description}
        imageUrl={meta.image}
        overlayColor={`${meta.color}CC`}
        productCount={result.total}
      />
      <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6">
        <StorefrontListing
          initial={result}
          categories={counts}
          categoryLabelRows={counts.map((c) => ({ slug: c.slug, name: c.name }))}
          subcategories={subcategories}
          facets={facets}
          mode="all"
          title={meta.title}
          forcedRecipient={slug}
          recipientMetaTitle={meta.title}
        />
      </div>
    </div>
  );
}

export default function ForRecipientPage({
  params,
  searchParams,
}: {
  params: Promise<{ recipient: string }>;
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
      <RecipientListingSection params={params} searchParams={searchParams} />
    </Suspense>
  );
}

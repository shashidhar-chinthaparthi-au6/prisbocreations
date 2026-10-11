import Link from "next/link";
import { connectDb } from "@/lib/db";
import { listStorefrontProducts } from "@/lib/services/storefrontCatalog";
import { listNavCategoryTree } from "@/lib/services/catalogService";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductsSortBar } from "@/components/storefront/ProductsSortBar";
import { StoreEmptyState } from "@/components/ui/StoreEmptyState";

export const revalidate = 60;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  return {
    title: query ? `Search: ${query}` : "Search",
    description: "Search personalised gifts on Prisbo Creations.",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  let nav: Awaited<ReturnType<typeof listNavCategoryTree>> = [];
  let items: Awaited<ReturnType<typeof listStorefrontProducts>>["items"] = [];
  let total = 0;

  const sort =
    sp.sort === "newest" ||
    sp.sort === "price_asc" ||
    sp.sort === "price_desc" ||
    sp.sort === "popular" ||
    sp.sort === "name_asc"
      ? sp.sort
      : "relevance";

  try {
    await connectDb();
    nav = await listNavCategoryTree();
    if (query) {
      const result = await listStorefrontProducts({ q: query, sort, page: 1, pageSize: 48 });
      items = result.items;
      total = result.total;
    }
  } catch (err) {
    console.error("Search page will render without catalog data:", err);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/" className="hover:text-[var(--brand-amber-dark)]">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--brand-ink)]">Search</span>
      </nav>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--brand-ink)]">
            {query ? `Results for “${query}”` : "Search"}
          </h1>
          {query ? (
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              {total} result{total === 1 ? "" : "s"}
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Use the search icon in the header, or enter a query below.
            </p>
          )}
        </div>
        {query ? <ProductsSortBar /> : null}
      </div>

      {!query ? (
        <StoreEmptyState
          className="bg-[var(--brand-card)]"
          illustration="search"
          title="Search the catalog"
          description="Use the search icon in the header for live suggestions as you type, or browse categories below."
          primary={{ label: "Browse all products →", href: "/products" }}
        />
      ) : items.length === 0 ? (
        <StoreEmptyState
          className="bg-[var(--brand-card)]"
          illustration="search"
          title={`No results for “${query}”`}
          description="Try a shorter keyword, check spelling, or explore a category."
          primary={{ label: "Browse all products →", href: "/products" }}
        >
          <p className="text-center text-xs font-medium uppercase tracking-wide text-[var(--brand-muted)]">
            Popular categories
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {nav.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/category/${c.slug}`}
                  className="rounded-full border border-[var(--brand-border)] bg-[var(--brand-card)] px-3 py-1.5 text-sm text-[var(--brand-ink)] hover:border-[var(--brand-amber)]"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </StoreEmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

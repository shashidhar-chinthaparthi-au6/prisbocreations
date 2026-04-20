import Link from "next/link";
import { connectDb } from "@/lib/db";
import { listCategories } from "@/lib/services/catalogService";
import { listStorefrontProducts, type StorefrontSort } from "@/lib/services/storefrontCatalog";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductsSortBar } from "@/components/storefront/ProductsSortBar";

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

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sort = parseSort(typeof sp.sort === "string" ? sp.sort : undefined);
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const category =
    typeof sp.category === "string"
      ? [sp.category]
      : Array.isArray(sp.category)
        ? sp.category.filter((x): x is string => typeof x === "string")
        : undefined;
  const priceMin =
    typeof sp.price_min === "string" && sp.price_min !== "" ? Number(sp.price_min) : undefined;
  const priceMax =
    typeof sp.price_max === "string" && sp.price_max !== "" ? Number(sp.price_max) : undefined;
  const inStockOnly = sp.in_stock === "1" || sp.in_stock === "true";

  await connectDb();
  const [cats, result] = await Promise.all([
    listCategories(),
    listStorefrontProducts({
      categorySlugs: category,
      q,
      sort: sort ?? "relevance",
      page,
      pageSize: 12,
      inStockOnly,
      priceMinPaise:
        priceMin != null && Number.isFinite(priceMin) ? Math.max(0, Math.round(priceMin * 100)) : undefined,
      priceMaxPaise:
        priceMax != null && Number.isFinite(priceMax) ? Math.max(0, Math.round(priceMax * 100)) : undefined,
    }),
  ]);

  const queryContinue = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) continue;
    if (Array.isArray(val)) val.forEach((v) => queryContinue.append(key, v));
    else queryContinue.set(key, val);
  }
  queryContinue.set("page", String(result.page + 1));

  return (
    <div className="mx-auto max-w-[1400px]">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/" className="hover:text-[var(--brand-amber-dark)]">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--brand-ink)]">All products</span>
      </nav>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--brand-ink)] sm:text-4xl">All products</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Showing {result.items.length} of {result.total} products
          </p>
        </div>
        <ProductsSortBar />
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="mb-8 hidden lg:block">
          <p className="text-sm font-semibold text-[var(--brand-ink)]">Category</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--brand-muted)]">
            <li>
              <Link href="/products" className="hover:text-[var(--brand-amber-dark)]">
                All
              </Link>
            </li>
            {cats.map((c) => (
              <li key={String(c._id)}>
                <Link
                  href={`/products?category=${encodeURIComponent(c.slug)}`}
                  className="hover:text-[var(--brand-amber-dark)]"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm font-semibold text-[var(--brand-ink)]">Price (₹)</p>
            <form className="mt-3 space-y-2 text-sm" method="get">
            <input type="hidden" name="sort" value={sort ?? "relevance"} />
            {q ? <input type="hidden" name="q" value={q} /> : null}
            <div className="flex gap-2">
              <input
                name="price_min"
                type="number"
                placeholder="Min"
                defaultValue={priceMin ?? ""}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-2 py-2"
              />
              <input
                name="price_max"
                type="number"
                placeholder="Max"
                defaultValue={priceMax ?? ""}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-2 py-2"
              />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="in_stock" value="1" defaultChecked={inStockOnly} />
              In stock only
            </label>
            <button type="submit" className="btn-secondary w-full text-sm">
              Apply
            </button>
          </form>
        </aside>

        <div>
          {result.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--brand-border-dark)] bg-[var(--brand-card)] p-12 text-center">
              <p className="font-display text-xl text-[var(--brand-ink)]">Nothing here yet.</p>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">Try removing some filters.</p>
              <Link href="/products" className="btn-primary mt-6 inline-flex">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {result.page * result.pageSize < result.total ? (
            <div className="mt-10 flex justify-center">
              <Link href={`/products?${queryContinue.toString()}`} className="btn-secondary">
                Load more
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: "All products",
  description: "Browse personalised gifts and keepsakes from Prisbo Creations.",
};

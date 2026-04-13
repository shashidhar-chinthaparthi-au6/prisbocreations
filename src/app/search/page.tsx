import Link from "next/link";
import { connectDb } from "@/lib/db";
import { listProducts } from "@/lib/services/catalogService";
import { formatInrFromPaise } from "@/lib/format";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import { StoreMedia } from "@/components/store/StoreMedia";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  await connectDb();
  const products = query ? await listProducts({ q: query }) : [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-accent">
          <Link href="/categories">Categories</Link> / Search
        </p>
        <h1 className="mt-2 font-display text-3xl text-ink">Search results</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Use the <strong className="font-medium text-ink">search bar at the top</strong> to type
          and see suggestions — this page only lists matches for your query.
        </p>
      </div>

      {!query ? (
        <div className="rounded-2xl border border-dashed border-sand-deep bg-white/80 p-8 text-center text-ink-muted">
          <p>No search query yet.</p>
          <p className="mt-2 text-sm">
            Enter keywords in the <span className="font-medium text-ink">top search bar</span>,
            then open a suggestion or press Enter to see all matching products here.
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sand-deep bg-white/80 p-10 text-center">
          <p className="text-ink-muted">No products match “{query}”.</p>
          <p className="mt-3 text-sm text-ink-muted">
            Try another keyword in the top bar or{" "}
            <Link href="/categories" className="font-medium text-accent hover:underline">
              browse categories
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {products.length} result{products.length === 1 ? "" : "s"} for “{query}”
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const thumb = p.images?.[0];
              const multi = productHasOptions(p);
              const price = multi ? minOptionPricePaise(p) : p.pricePaise;
              return (
                <li key={String(p._id)}>
                  <Link
                    href={`/product/${p.slug}`}
                    className="group flex flex-col overflow-hidden rounded-xl border border-sand-deep bg-white shadow-sm transition hover:border-accent hover:shadow-md"
                  >
                    <div className="relative aspect-square w-full bg-sand-deep">
                      {thumb ? (
                        <StoreMedia
                          src={thumb}
                          alt={p.name}
                          fill
                          eager
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-ink-muted">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-medium text-ink group-hover:text-accent">
                        {p.name}
                      </p>
                      <p className="mt-1 font-display text-base font-semibold text-ink">
                        {multi ? (
                          <>
                            <span className="text-xs font-normal text-ink-muted">From </span>
                            {formatInrFromPaise(price)}
                          </>
                        ) : (
                          formatInrFromPaise(price)
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

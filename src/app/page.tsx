import Link from "next/link";
import { connectDb } from "@/lib/db";
import {
  listCategories,
  listExploreProductsForHome,
  listFeaturedProducts,
} from "@/lib/services/catalogService";
import { formatInrFromPaise } from "@/lib/format";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import { StoreMedia } from "@/components/store/StoreMedia";
import { RecentlyViewedHome } from "@/components/store/RecentlyViewedHome";
import { HeroBrowseBackdrop } from "@/components/store/HeroBrowseBackdrop";

function dedupeImageUrls(urls: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const s = typeof u === "string" ? u.trim() : "";
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export default async function HomePage() {
  await connectDb();
  const [categories, featured] = await Promise.all([listCategories(), listFeaturedProducts(12)]);
  const explore = await listExploreProductsForHome(
    18,
    featured.map((p) => String(p._id)),
  );

  const heroBackdropUrls = dedupeImageUrls([
    ...categories.map((c) => c.images?.[0]),
    ...featured.map((p) => p.images?.[0]),
  ]);

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl px-8 py-16 text-white shadow-[0_25px_60px_-15px_rgba(159,18,57,0.35),0_12px_32px_-8px_rgba(15,23,42,0.45)] ring-1 ring-white/20 md:px-14 md:py-20">
        {heroBackdropUrls.length > 0 ? <HeroBrowseBackdrop urls={heroBackdropUrls} /> : null}
        {/* Deep jewel base + warm colour wash (lets photos stay lively on the right) */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-3xl bg-gradient-to-br from-rose-950/88 via-ink/78 to-amber-950/72"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-3xl bg-gradient-to-tr from-accent/30 via-transparent to-rose-light/35"
          aria-hidden
        />
        {/* Readability for copy — fades out so the marquee stays colourful */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-3xl bg-gradient-to-r from-black/70 from-0% via-black/28 via-[48%] to-transparent to-100%"
          aria-hidden
        />
        <div
          className="relative z-10 max-w-2xl space-y-6 [text-shadow:0_2px_20px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.75)]"
        >
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-amber-100/95">
            Prisbo Creations
          </p>
          <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
            Personalized pieces that feel unmistakably premium.
          </h1>
          <p className="text-lg leading-relaxed text-sand/95">
            From acrylic keepsakes to packaging that elevates your brand — every order is produced
            with care and crisp detail.
          </p>
          <div className="flex flex-wrap gap-3 [text-shadow:none]">
            <Link
              href="/categories"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-accent to-accent-light px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(180,83,9,0.45)] ring-2 ring-white/25 transition hover:brightness-110"
            >
              Browse categories
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-amber-100/70 bg-white/12 px-6 py-3 text-sm font-semibold text-white shadow-[0_2px_16px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:border-white hover:bg-white/20"
            >
              Create account
            </Link>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-16 z-[2] h-80 w-80 rounded-full bg-gradient-to-br from-accent/50 via-amber-300/35 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 z-[2] h-72 w-72 rounded-full bg-gradient-to-tr from-rose-light/45 via-rose/30 to-transparent blur-3xl" />
      </section>

      <div
        className={
          featured.length > 0
            ? "flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-5"
            : "flex flex-col"
        }
      >
        {featured.length > 0 ? (
          <section className="min-w-0 flex-1 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl text-ink md:text-3xl">Featured</h2>
              <Link href="/search" className="text-sm font-medium text-accent hover:underline">
                Search all
              </Link>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:pb-0 lg:grid-cols-6">
              {featured.map((p) => {
                const thumb = p.images?.[0];
                const multi = productHasOptions(p);
                const price = multi ? minOptionPricePaise(p) : p.pricePaise;
                return (
                  <Link
                    key={String(p._id)}
                    href={`/product/${p.slug}`}
                    className="group w-[42vw] shrink-0 overflow-hidden rounded-xl border border-sand-deep bg-white shadow-sm transition hover:border-accent sm:w-40 md:w-auto"
                  >
                    <div className="relative aspect-square w-full bg-sand-deep">
                      {thumb ? (
                        <StoreMedia
                          src={thumb}
                          alt={p.name}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          sizes="(max-width:768px) 42vw, 160px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-ink-muted">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 text-xs font-medium text-ink group-hover:text-accent md:text-sm">
                        {p.name}
                      </p>
                      <p className="mt-1 font-display text-sm font-semibold text-ink">
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
                );
              })}
            </div>
          </section>
        ) : null}

        <div
          className={
            featured.length > 0
              ? "shrink-0 lg:w-[12.5rem] xl:w-[13.25rem] border-sand-deep/70 lg:border-l lg:pl-4 xl:pl-5"
              : undefined
          }
        >
          <RecentlyViewedHome sidebar={featured.length > 0} />
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-ink md:text-3xl">Products</h2>
            <p className="mt-1 text-sm text-ink-muted">What is in the catalog right now.</p>
          </div>
          <Link href="/categories" className="text-sm font-medium text-accent hover:underline">
            View all
          </Link>
        </div>
        {explore.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-deep bg-white/60 p-10 text-center text-ink-muted">
            <p className="font-medium text-ink">No products to show yet.</p>
            <p className="mt-2 text-sm">
              Add products in{" "}
              <Link href="/admin/products" className="font-medium text-accent hover:underline">
                Admin → Products
              </Link>{" "}
              or open{" "}
              <Link href="/categories" className="font-medium text-accent hover:underline">
                categories
              </Link>{" "}
              when they’re available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {explore.map((p) => {
              const colorVariants = colorVariantsFromDoc(p);
              const defaultImages = Array.isArray(p.images) ? p.images : [];
              const thumb =
                listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];
              const multi = productHasOptions(p);
              const price = multi ? minOptionPricePaise(p) : p.pricePaise;
              return (
                <Link
                  key={String(p._id)}
                  href={`/product/${p.slug}`}
                  className="group overflow-hidden rounded-2xl border border-sand-deep bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand-deep sm:aspect-square">
                    {thumb ? (
                      <StoreMedia
                        src={thumb}
                        alt={p.name}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-sm text-ink-muted"
                        aria-hidden
                      >
                        No image
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-4 sm:p-5">
                    <h3 className="font-display text-lg text-ink group-hover:text-accent">{p.name}</h3>
                    <p className="font-display text-base font-semibold text-ink">
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
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

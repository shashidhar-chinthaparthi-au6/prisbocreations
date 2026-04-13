import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import {
  listCategories,
  listExploreProductsForHome,
  listFeaturedProducts,
} from "@/lib/services/catalogService";
import { colorVariantsFromDoc, listingPrimaryThumb } from "@/lib/product-color-variants";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import { HomeExploreProducts } from "@/components/store/HomeExploreProducts";
import { HomeProductCard } from "@/components/store/HomeProductCard";
import { productToExploreCardDTO } from "@/lib/home-explore-dto";
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
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;

  await connectDb();
  const [categories, featured] = await Promise.all([listCategories(), listFeaturedProducts(12)]);
  const { rows: exploreRows, mode: exploreFeedMode } = await listExploreProductsForHome(
    18,
    featured.map((p) => String(p._id)),
  );
  const exploreInitial = exploreRows.map((p) => productToExploreCardDTO(p));

  const heroBackdropUrls = dedupeImageUrls([
    ...categories.map((c) => c.images?.[0]),
    ...featured.map((p) => p.images?.[0]),
  ]);

  return (
    <div className="space-y-10 md:space-y-12">
      <section className="relative overflow-hidden rounded-2xl px-5 py-8 text-white shadow-[0_25px_60px_-15px_rgba(159,18,57,0.35),0_12px_32px_-8px_rgba(15,23,42,0.45)] ring-1 ring-white/20 sm:px-7 sm:py-9 md:rounded-3xl md:px-10 md:py-10">
        {heroBackdropUrls.length > 0 ? <HeroBrowseBackdrop urls={heroBackdropUrls} /> : null}
        {/* Deep jewel base + warm colour wash (lets photos stay lively on the right) */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-gradient-to-br from-rose-950/88 via-ink/78 to-amber-950/72 md:rounded-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-gradient-to-tr from-accent/30 via-transparent to-rose-light/35 md:rounded-3xl"
          aria-hidden
        />
        {/* Readability for copy — fades out so the marquee stays colourful */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-gradient-to-r from-black/70 from-0% via-black/28 via-[48%] to-transparent to-100% md:rounded-3xl"
          aria-hidden
        />
        <div
          className="relative z-10 max-w-xl space-y-3 sm:max-w-2xl sm:space-y-4 [text-shadow:0_2px_20px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.75)]"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-100/95 sm:text-sm sm:tracking-[0.22em]">
            Prisbo Creations
          </p>
          <h1 className="font-display text-2xl leading-snug text-white sm:text-3xl sm:leading-tight md:text-4xl">
            Personalized pieces that feel unmistakably premium.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-sand/95 sm:text-base">
            From acrylic keepsakes to packaging that elevates your brand — every order is produced
            with care and crisp detail.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 [text-shadow:none] sm:gap-3">
            <Link
              href="/categories"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-gradient-to-r from-accent to-accent-light px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(180,83,9,0.45)] ring-2 ring-white/25 transition hover:brightness-110 sm:min-h-11 sm:px-6 sm:py-3"
            >
              Browse categories
            </Link>
            {!session ? (
              <Link
                href="/register"
                className="inline-flex min-h-10 items-center justify-center rounded-full border-2 border-amber-100/70 bg-white/12 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_16px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:border-white hover:bg-white/20 sm:min-h-11 sm:px-6 sm:py-3"
              >
                Create account
              </Link>
            ) : null}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-10 -top-12 z-[2] h-56 w-56 rounded-full bg-gradient-to-br from-accent/50 via-amber-300/35 to-transparent blur-3xl sm:h-64 sm:w-64" />
        <div className="pointer-events-none absolute -bottom-14 -left-6 z-[2] h-52 w-52 rounded-full bg-gradient-to-tr from-rose-light/45 via-rose/30 to-transparent blur-3xl sm:h-60 sm:w-60" />
      </section>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1 space-y-10">
          {featured.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-display text-xl text-ink md:text-2xl">Featured</h2>
                <Link href="/search" className="text-sm font-medium text-accent hover:underline">
                  Search all
                </Link>
              </div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-5 md:gap-2 md:overflow-visible md:pb-0 lg:grid-cols-6">
                {featured.map((p) => {
                  const colorVariants = colorVariantsFromDoc(p);
                  const defaultImages = Array.isArray(p.images) ? p.images : [];
                  const thumb =
                    listingPrimaryThumb(defaultImages, colorVariants) ?? defaultImages[0];
                  const multi = productHasOptions(p);
                  const price = multi ? minOptionPricePaise(p) : p.pricePaise;
                  return (
                    <HomeProductCard
                      key={String(p._id)}
                      variant="featured"
                      slug={p.slug}
                      name={p.name}
                      productId={String(p._id)}
                      listPricePaise={price}
                      stock={p.stock}
                      imageUrl={thumb}
                      multi={multi}
                      hasColorVariants={colorVariants.length > 0}
                    />
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-ink md:text-2xl">Products</h2>
                <p className="mt-1 text-xs text-ink-muted sm:text-sm">
                  What is in the catalog right now.
                </p>
              </div>
              <Link href="/categories" className="text-sm font-medium text-accent hover:underline">
                View all
              </Link>
            </div>
            {exploreInitial.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sand-deep bg-white/60 p-8 text-center text-ink-muted sm:p-10">
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
                  when they are available.
                </p>
              </div>
            ) : (
              <HomeExploreProducts initial={exploreInitial} exploreFeedMode={exploreFeedMode} />
            )}
          </section>
        </div>

        <RecentlyViewedHome sidebar />
      </div>
    </div>
  );
}

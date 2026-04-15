import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import {
  listCategories,
  listExploreProductsForHome,
  listFeaturedProducts,
} from "@/lib/services/catalogService";
import { minOptionPricePaise, productHasOptions } from "@/lib/product-options";
import { HomeExploreProducts } from "@/components/store/HomeExploreProducts";
import { HomeProductCard } from "@/components/store/HomeProductCard";
import { productToExploreCardDTO, type HomeExploreCardDTO } from "@/lib/home-explore-dto";
import { RecentlyViewedHome } from "@/components/store/RecentlyViewedHome";
import { HeroProcessCarousel } from "@/components/store/HeroProcessCarousel";
import { HomeTrustBar } from "@/components/store/HomeTrustBar";
import { HomeShopByRecipient } from "@/components/store/HomeShopByRecipient";
import { HomeBrandBenefits } from "@/components/store/HomeBrandBenefits";

/** Public sample MP4 (hotlink-friendly); replace via `NEXT_PUBLIC_HOME_HERO_VIDEO_URL` in production. */
const DEFAULT_HOME_HERO_VIDEO_PLACEHOLDER = "https://www.w3schools.com/html/mov_bbb.mp4";

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
  /** MP4/WebM/MOV — full-bleed muted loop behind hero stills; env overrides web placeholder. */
  const heroVideoUrl =
    process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_URL?.trim() || DEFAULT_HOME_HERO_VIDEO_PLACEHOLDER;

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="relative overflow-hidden rounded-lg border border-slate-200/90 bg-slate-900 px-5 py-8 text-white shadow-[0_2px_8px_rgba(15,23,42,0.08)] sm:px-7 sm:py-9 md:rounded-xl md:px-10 md:py-10">
        {heroBackdropUrls.length > 0 || heroVideoUrl ? (
          <HeroProcessCarousel urls={heroBackdropUrls} videoUrl={heroVideoUrl} />
        ) : null}
        {/* Left-heavy washes: keep copy readable; leave the right clearer for hero video / imagery */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-gradient-to-r from-rose-950/90 from-0% via-ink/72 via-[36%] via-amber-950/18 via-[58%] to-transparent to-[96%] md:rounded-xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-gradient-to-r from-accent/32 from-0% via-rose-light/14 via-[52%] to-transparent to-[94%] md:rounded-xl"
          aria-hidden
        />
        {/* Readability for copy — strong on the left only */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-gradient-to-r from-black/72 from-0% via-black/22 via-[44%] to-transparent to-[100%] md:rounded-xl"
          aria-hidden
        />
        <div
          className="relative z-10 max-w-xl space-y-3 sm:max-w-2xl sm:space-y-4 [text-shadow:0_2px_20px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.75)]"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-100/95 sm:text-sm sm:tracking-[0.22em]">
            Prisbo Creations
          </p>
          <h1 className="font-display text-2xl leading-snug text-white sm:text-3xl sm:leading-tight md:text-4xl">
            We craft personalised gifts and keepsakes — in our studio, not from a faceless warehouse.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-sand/95 sm:text-base">
            Laser-cut acrylic, careful print finishing, and packaging you&apos;ll be proud to hand over.
            Every piece is made for your story.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 [text-shadow:none] sm:gap-3">
            <Link
              href="/categories"
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-gradient-to-r from-accent to-accent-light px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(180,83,9,0.45)] ring-2 ring-white/25 transition hover:brightness-110 sm:min-h-11 sm:px-6 sm:py-3"
            >
              Shop the catalog
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

      <HomeTrustBar />

      <HomeShopByRecipient />

      <HomeBrandBenefits />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1 space-y-8 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:p-6 md:space-y-10 md:p-8">
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
                  const dto = productToExploreCardDTO(p) as HomeExploreCardDTO;
                  const multi = productHasOptions(p);
                  const price = multi ? minOptionPricePaise(p) : p.pricePaise;
                  return (
                    <HomeProductCard
                      key={String(p._id)}
                      variant="featured"
                      slug={dto.slug}
                      name={dto.name}
                      productId={dto.id}
                      listPricePaise={price}
                      compareAtPaise={dto.compareAtPaise}
                      stock={dto.stock}
                      imageUrl={dto.imageUrl}
                      hoverImageUrl={dto.hoverImageUrl}
                      multi={multi}
                      hasColorVariants={dto.hasColorVariants}
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

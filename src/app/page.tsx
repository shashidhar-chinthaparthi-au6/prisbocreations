import Link from "next/link";
import { Suspense } from "react";
import { HomeCategoryCard } from "@/components/store/HomeCategoryCard";
import { HomeDeletedToast } from "@/components/storefront/HomeDeletedToast";
import { connectDb } from "@/lib/db";
import { categoryCardPlaceholderImage } from "@/lib/home-category-placeholder";
import { listCategories } from "@/lib/services/catalogService";
import { listStorefrontProducts } from "@/lib/services/storefrontCatalog";
import { HomeNewsletter } from "@/components/storefront/HomeNewsletter";
import { HomeRecentlyViewed } from "@/components/storefront/HomeRecentlyViewed";
import { HomeMostLovedSection } from "@/components/home/HomeMostLovedSection";
import { RecipientCards } from "@/components/storefront/RecipientCards";
import { FeaturedReviews } from "@/components/home/FeaturedReviews";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import { getStorefrontHomeHeroSlides } from "@/lib/services/homeHeroService";
import { TrustIconGift, TrustIconHeart, TrustIconPackage, TrustIconShieldCheck, TrustIconTruck } from "@/components/storefront/HomeTrustIcons";
import { STOREFRONT_FULL_BLEED, STOREFRONT_GUTTER } from "@/lib/storefront-layout";

export const revalidate = 120;

export default async function HomePage() {
  await connectDb();
  const heroSlides = await getStorefrontHomeHeroSlides();
  const [categories, featuredResult] = await Promise.all([
    listCategories(),
    listStorefrontProducts({
      featured: true,
      page: 1,
      pageSize: 8,
      sort: "newest",
      inStockOnly: true,
    }),
  ]);
  const featured = featuredResult.items.length
    ? featuredResult.items
    : (await listStorefrontProducts({ page: 1, pageSize: 8, sort: "newest", inStockOnly: true })).items;

  const catCards = categories.slice(0, 5);

  return (
    <div className={STOREFRONT_FULL_BLEED}>
      <Suspense fallback={null}>
        <HomeDeletedToast />
      </Suspense>

      {/* Hero grid: lg row1 = carousel | recipients (equal 520px); row2 = full-width trust strip */}
      <section
        className={`${STOREFRONT_GUTTER} grid grid-cols-1 gap-5 pt-0 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-5 lg:items-start`}
        aria-label="Featured highlights and shopping shortcuts"
      >
        <div className="order-1 min-h-0 overflow-hidden rounded-2xl lg:col-span-3 lg:row-start-1 lg:h-[520px] lg:min-h-[520px]">
          <HomeHeroCarousel slides={heroSlides} />
        </div>

        <div className="order-3 min-h-[320px] min-w-0 lg:order-2 lg:col-span-1 lg:row-start-1 lg:flex lg:h-[520px] lg:min-h-[520px] lg:flex-col lg:self-stretch">
          <section
            className="relative flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--brand-border-dark)]/[0.22] bg-[var(--brand-surface)] shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] sm:min-h-0 lg:flex-1"
            aria-labelledby="home-recipient-heading"
          >
            <div className="relative shrink-0 border-b border-[var(--brand-border)]/90 bg-gradient-to-b from-[color-mix(in_srgb,var(--brand-amber-light)_22%,transparent)] to-transparent px-4 pb-[1.125rem] pt-5 sm:px-5 sm:pb-6 sm:pt-[1.375rem]">
              <span className="inline-flex items-center rounded-full border border-[var(--brand-border)]/80 bg-[var(--brand-canvas)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-amber-dark)] shadow-[0_1px_0_rgba(0,0,0,0.04)]">
                Gift guide
              </span>
              <h2
                className="mt-3 font-display text-xl font-semibold leading-[1.12] tracking-[-0.02em] text-[var(--brand-ink)] sm:text-[22px]"
                id="home-recipient-heading"
              >
                Shop by recipient
              </h2>
              <p className="mt-2 max-w-[min(34ch,100%)] text-[13px] leading-snug text-[var(--brand-muted)] sm:text-sm">
                Jump in by who you&apos;re shopping for.
              </p>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pb-4 pt-[0.9375rem] sm:px-4 sm:pb-5 sm:pt-4 lg:overflow-hidden lg:px-[0.875rem] lg:pb-[0.875rem] lg:pt-[0.6875rem] lg:[scrollbar-gutter:stable]">
              <RecipientCards variant="rail" />
            </div>
          </section>
        </div>

        <aside className="order-2 flex flex-col rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 sm:p-5 lg:order-3 lg:col-span-4 lg:row-start-2">
            <div className="-mx-4 flex flex-nowrap gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:justify-between lg:gap-4 lg:overflow-visible lg:pb-0">
              {[
                {
                  t: "Free shipping over ₹1,499",
                  s: "Pan-India on qualifying cart totals.",
                  Icon: TrustIconTruck,
                },
                {
                  t: "Secure payments",
                  s: "UPI, cards, and COD where available.",
                  Icon: TrustIconShieldCheck,
                },
                {
                  t: "Personalised in India",
                  s: "Made and packed with care in our studio.",
                  Icon: TrustIconHeart,
                },
                {
                  t: "Gift-ready packaging",
                  s: "Neat boxing — unwrap at home or send straight to them.",
                  Icon: TrustIconGift,
                },
                {
                  t: "Dispatch & tracking",
                  s: "We email you when your order ships. Track parcels anytime.",
                  Icon: TrustIconPackage,
                },
              ].map((x) => (
                <div
                  key={x.t}
                  className="flex min-w-[140px] max-w-[220px] shrink-0 gap-2.5 sm:min-w-[160px] lg:min-w-0 lg:max-w-none lg:flex-[1_1_0] lg:basis-0"
                >
                  <x.Icon className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-snug text-[var(--brand-ink)] sm:text-sm">{x.t}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--brand-muted)] sm:text-[12px]">
                      {x.s}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 shrink-0 border-t border-black/10 pt-4 text-center text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--brand-muted)] sm:text-[12px]">
              Crafted in India · Gift-ready packing
            </p>
        </aside>
      </section>

      {/* Occasion shortcuts */}
      <div className={`${STOREFRONT_GUTTER} mt-8`}>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "🎂 Birthday", href: "/products?q=birthday" },
            { label: "💍 Anniversary", href: "/products?q=anniversary" },
            { label: "💒 Wedding", href: "/products?q=wedding" },
            { label: "🪢 Rakhi", href: "/products?q=rakhi" },
            { label: "🏢 Corporate", href: "/bulk" },
            { label: "🎓 Graduation", href: "/products?q=graduation" },
            { label: "👶 New baby", href: "/products?q=baby" },
          ].map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2 text-sm font-medium text-[var(--brand-ink)] shadow-[var(--shadow-card)] transition-colors hover:border-[var(--brand-amber)] hover:text-[var(--brand-amber-dark)]"
            >
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      <div className={`${STOREFRONT_GUTTER} mt-12 space-y-14 sm:mt-14 sm:space-y-16`}>
        {/* Featured */}
        {featured.length > 0 ? (
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-[var(--brand-ink)] sm:text-3xl">Most loved</h2>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">What is in the catalog right now.</p>
              </div>
              <Link href="/products" className="text-sm font-semibold text-[var(--brand-amber)] hover:underline">
                View all →
              </Link>
            </div>
            <HomeMostLovedSection initial={featured} />
          </section>
        ) : null}

        {/* Bulk teaser */}
        <section className="overflow-hidden rounded-2xl bg-ink px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">Corporate &amp; bulk orders</p>
              <h2 className="mt-2 font-display text-2xl text-white sm:text-3xl">
                Gifting for your whole team?
              </h2>
              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-white/70">
                We handle bulk personalised orders for offices, weddings, schools, and events — starting
                from 25 pieces. Same studio quality, volume pricing. Tell us what you need.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/bulk"
                className="inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent/90"
              >
                Get a quote →
              </Link>
            </div>
          </div>
        </section>

        {/* Categories: title and subtitle first, cards row below */}
        <section aria-labelledby="home-shop-category-heading">
          <h2
            id="home-shop-category-heading"
            className="font-display text-2xl text-[var(--brand-ink)] sm:text-3xl"
          >
            Shop by category
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--brand-muted)] sm:text-base">
            Explore our full range of personalised creations.
          </p>
          <div className="home-carousel-row -mx-4 mt-6 flex min-w-0 gap-3 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-nowrap lg:overflow-visible lg:px-0">
            {catCards.map((c) => {
              const imageSrc =
                (c.images?.[0] || c.imageUrl || "").trim() ||
                categoryCardPlaceholderImage(c.slug, c.name);
              return (
                <div
                  key={String(c._id)}
                  className="home-carousel-slide w-[160px] shrink-0 sm:w-[min(180px,40vw)] lg:min-w-0 lg:max-w-none lg:flex-1 lg:basis-0"
                >
                  <HomeCategoryCard
                    href={`/category/${c.slug}`}
                    name={c.name}
                    slug={c.slug}
                    imageSrc={imageSrc}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <FeaturedReviews />

        {/* Why */}
        <section>
          <h2 className="font-display text-2xl text-[var(--brand-ink)] sm:text-3xl">Why Prisbo</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Small-batch production with the finish your photos deserve.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                t: "Premium acrylic",
                s: "Crisp edges and depth that reads as luxury, not plastic.",
                icon: "◆",
              },
              {
                t: "Waterproof prints",
                s: "Made to survive spills, splashes, and daily handling.",
                icon: "💧",
              },
              {
                t: "Eco-conscious packaging",
                s: "Thoughtful wraps and boxes — gift-ready by default.",
                icon: "🌿",
              },
            ].map((x) => (
              <div
                key={x.t}
                className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-6 shadow-[var(--shadow-card)]"
              >
                <span className="text-2xl text-[var(--brand-amber)]" aria-hidden>
                  {x.icon}
                </span>
                <p className="mt-3 font-semibold text-[var(--brand-ink)]">{x.t}</p>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">{x.s}</p>
              </div>
            ))}
          </div>
        </section>

        <HomeRecentlyViewed />

        <HomeNewsletter />
      </div>
    </div>
  );
}

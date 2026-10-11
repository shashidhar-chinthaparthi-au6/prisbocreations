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
import { FeaturedReviews } from "@/components/home/FeaturedReviews";
import { BeforeAfterSlider } from "@/components/storefront/BeforeAfterSlider";
import { STOREFRONT_FULL_BLEED } from "@/lib/storefront-layout";
import type { StorefrontProductCard } from "@/lib/services/storefrontCatalog";

export const revalidate = 120;

export default async function HomePage() {
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let featured: StorefrontProductCard[] = [];
  try {
    await connectDb();
    const [categoryRows, featuredResult] = await Promise.all([
      listCategories(),
      listStorefrontProducts({
        featured: true,
        page: 1,
        pageSize: 8,
        sort: "newest",
        inStockOnly: true,
      }),
    ]);
    categories = categoryRows;
    featured = featuredResult.items.length
      ? featuredResult.items
      : (await listStorefrontProducts({ page: 1, pageSize: 8, sort: "newest", inStockOnly: true })).items;
  } catch {
    categories = [];
    featured = [];
  }

  const catCards = categories.slice(0, 5);

  const occasions = [
    { label: "🎂 Birthday", href: "/products?q=birthday" },
    { label: "💍 Anniversary", href: "/products?q=anniversary" },
    { label: "💒 Wedding", href: "/products?q=wedding" },
    { label: "🪢 Rakhi", href: "/products?q=rakhi" },
    { label: "🏢 Corporate", href: "/bulk" },
    { label: "🎓 Graduation", href: "/products?q=graduation" },
    { label: "👶 New baby", href: "/products?q=baby" },
  ];

  const whyItems = [
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
  ];

  return (
    <div className={`${STOREFRONT_FULL_BLEED} pb-16`}>
      <Suspense fallback={null}>
        <HomeDeletedToast />
      </Suspense>

      {/* ── Before / after ── */}
      <section className="store-section mt-10" aria-labelledby="home-before-after-heading">
        <div className="overflow-hidden rounded-[28px] border border-[var(--brand-ink)]/8 bg-[#fbf7f1]">
          <div className="grid items-stretch lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,0.7fr)]">
            <BeforeAfterSlider
              beforeSrc="/compare/plain.jpg"
              afterSrc="/compare/personal.jpg"
              className=""
            />
            <div className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:px-12">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--brand-gold)]">
                Watch it change
              </p>
              <h2
                id="home-before-after-heading"
                className="mt-4 font-display text-[40px] font-medium leading-[0.95] tracking-[-0.03em] text-[var(--brand-ink)] sm:text-[52px]"
              >
                It starts plain.
                <span className="mt-1 block italic font-normal text-[var(--brand-gold)]">Then it&apos;s theirs.</span>
              </h2>
              <p className="mt-5 max-w-[28ch] text-[15px] leading-relaxed text-[var(--brand-muted)]">
                The cup fades, the cushion wipes across, and the frame rises.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Occasion pills ── */}
      <section className="store-section mt-8">
        <div className="flex flex-wrap gap-2">
          {occasions.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--brand-ink)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--brand-amber)] hover:bg-[var(--brand-amber-light)] hover:text-[var(--brand-amber-dark)]"
            >
              {o.label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Most Loved ── */}
      {featured.length > 0 ? (
        <section className="store-section mt-14">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="section-title">Most loved</h2>
              <p className="section-subtitle">Bestsellers from our studio</p>
            </div>
            <Link
              href="/products"
              className="text-sm font-semibold text-[var(--brand-amber-dark)] hover:underline underline-offset-2"
            >
              View all →
            </Link>
          </div>
          <HomeMostLovedSection initial={featured} />
        </section>
      ) : null}

      {/* ── Bulk / Corporate dark banner ── */}
      <section className="store-section mt-14">
        <div className="relative overflow-hidden rounded-[24px] bg-[#0f0804] px-8 py-12 lg:px-14 lg:py-14">
          {/* Amber glow blob top-right */}
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--brand-amber)] opacity-10 blur-3xl"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-block rounded-full border border-[var(--brand-amber)]/30 bg-[var(--brand-amber)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--brand-amber)]">
                Corporate &amp; bulk orders
              </span>
              <h2 className="mt-3 text-[28px] font-bold leading-tight text-white lg:text-[36px]">
                Gifting for your whole team?
              </h2>
              <p className="mt-3 max-w-[44ch] text-[15px] leading-relaxed text-white/60">
                Bulk personalised orders for offices, weddings, and events — from 25 pieces. Studio quality at volume pricing.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/bulk"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-amber-dark)] px-7 py-3.5 text-[14px] font-semibold text-white shadow-lg hover:bg-[#73400f] transition-colors"
              >
                Get a quote →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Shop by category ── */}
      <section className="store-section mt-14" aria-labelledby="home-shop-category-heading">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="section-title" id="home-shop-category-heading">
              Shop by category
            </h2>
            <p className="section-subtitle">Explore our full range of personalised creations</p>
          </div>
          <Link
            href="/categories"
            className="text-sm font-semibold text-[var(--brand-amber-dark)] hover:underline underline-offset-2"
          >
            Browse all →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {catCards.map((c) => {
            const imageSrc =
              (c.images?.[0] || c.imageUrl || "").trim() ||
              categoryCardPlaceholderImage(c.slug, c.name);
            return (
              <HomeCategoryCard
                key={String(c._id)}
                href={`/category/${c.slug}`}
                name={c.name}
                slug={c.slug}
                imageSrc={imageSrc}
              />
            );
          })}
        </div>
      </section>

      {/* ── Why Prisbo ── */}
      <section className="store-section mt-14">
        <h2 className="section-title">Why Prisbo</h2>
        <p className="section-subtitle">Small-batch production, studio-quality finishes.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {whyItems.map((x) => (
            <div
              key={x.t}
              className="rounded-[20px] border border-[var(--brand-border)] bg-white p-7 shadow-[var(--shadow-sm)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-amber-light)] text-2xl">
                {x.icon}
              </div>
              <p className="mt-4 text-[16px] font-semibold text-[var(--brand-ink)]">{x.t}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--brand-muted)]">{x.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Reviews ── */}
      <section className="store-section mt-14">
        <FeaturedReviews />
      </section>

      {/* ── Recently Viewed ── */}
      <section className="store-section mt-14">
        <HomeRecentlyViewed />
      </section>

      {/* ── Newsletter ── */}
      <section className="store-section mt-14">
        <HomeNewsletter />
      </section>
    </div>
  );
}

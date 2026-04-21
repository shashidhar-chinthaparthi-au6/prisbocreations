import Image from "next/image";
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
import { ProductCard } from "@/components/storefront/ProductCard";
import { RecipientCards } from "@/components/storefront/RecipientCards";
import { TrustIconHeart, TrustIconShieldCheck, TrustIconTruck } from "@/components/storefront/HomeTrustIcons";

export const revalidate = 120;

const HERO_IMG =
  "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1600&q=85";

export default async function HomePage() {
  await connectDb();
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
    <div className="mx-auto max-w-[1400px] space-y-14 sm:space-y-16">
      <Suspense fallback={null}>
        <HomeDeletedToast />
      </Suspense>
      {/* Hero */}
      <section className="relative isolate min-h-[360px] overflow-hidden rounded-2xl md:min-h-[420px] lg:min-h-[520px]">
        <Image src={HERO_IMG} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-[rgba(20,15,10,0.45)]" aria-hidden />
        <div className="relative z-10 flex min-h-[360px] max-w-[540px] flex-col justify-center px-5 py-10 md:min-h-[420px] md:max-w-[420px] md:px-8 lg:min-h-[520px] lg:max-w-[540px] lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--brand-amber-light)] sm:text-sm">
            Prisbo Creations
          </p>
          <h1 className="mt-3 font-display text-[28px] font-bold leading-tight text-white md:text-[40px] md:leading-snug lg:text-[48px]">
            We craft personalised gifts and keepsakes — in our studio, not from a faceless warehouse.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-base">
            Laser-cut acrylic, careful print finishing, and packaging you&apos;ll be proud to hand over.
          </p>
          <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/products" className="btn-primary min-h-12 w-full justify-center px-8 sm:w-auto">
              Shop the catalog
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-[1.5px] border-white bg-transparent px-8 text-sm font-medium tracking-wide text-white transition duration-150 hover:bg-white/10 sm:w-auto"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="grid gap-4 rounded-2xl bg-[#f5f0ea] px-4 py-6 sm:grid-cols-3 sm:gap-6 sm:px-8 sm:py-8">
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
        ].map((x) => (
          <div key={x.t} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-start sm:gap-3 sm:text-left">
            <x.Icon className="shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--brand-ink)] sm:text-base">{x.t}</p>
              <p className="mt-1 text-[12px] text-[var(--brand-muted)] sm:text-sm">{x.s}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section>
        <h2 className="font-display text-2xl text-[var(--brand-ink)] sm:text-3xl">Shop by category</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)] sm:text-base">
          Explore our full range of personalised creations.
        </p>
        <div className="mt-6 flex max-md:scroll-row gap-3 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible lg:grid-cols-5">
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
          <div className="mt-6 flex max-md:scroll-row gap-3 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-4">
            {featured.map((p) => (
              <div
                key={p.id}
                className="w-[calc(50vw-24px)] min-w-[160px] max-w-[280px] shrink-0 sm:w-auto sm:min-w-0 sm:max-w-none"
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Recipients */}
      <section>
        <h2 className="font-display text-2xl text-[var(--brand-ink)] sm:text-3xl">Shop by recipient</h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">Jump in by who you&apos;re shopping for.</p>
        <RecipientCards />
      </section>

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
  );
}

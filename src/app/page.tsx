import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { HomeDeletedToast } from "@/components/storefront/HomeDeletedToast";
import { connectDb } from "@/lib/db";
import { listCategories } from "@/lib/services/catalogService";
import { listStorefrontProducts } from "@/lib/services/storefrontCatalog";
import { HomeNewsletter } from "@/components/storefront/HomeNewsletter";
import { HomeRecentlyViewed } from "@/components/storefront/HomeRecentlyViewed";
import { ProductCard } from "@/components/storefront/ProductCard";
import { TrustIconHeart, TrustIconShieldCheck, TrustIconTruck } from "@/components/storefront/HomeTrustIcons";
import { categoryCardPlaceholderImage } from "@/lib/home-category-placeholder";

export const revalidate = 120;

const HERO_IMG =
  "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=1600&q=85";

export default async function HomePage() {
  await connectDb();
  const [categories, featuredResult] = await Promise.all([
    listCategories(),
    listStorefrontProducts({ featured: true, page: 1, pageSize: 8, sort: "newest" }),
  ]);
  const featured = featuredResult.items.length
    ? featuredResult.items
    : (await listStorefrontProducts({ page: 1, pageSize: 8, sort: "newest" })).items;

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
            const placeholder = categoryCardPlaceholderImage(c.slug, c.name);
            return (
              <Link
                key={String(c._id)}
                href={`/category/${c.slug}`}
                className="group relative h-[160px] w-[160px] shrink-0 overflow-hidden rounded-2xl md:h-[160px] md:w-auto"
              >
                <div className="relative aspect-square h-full md:aspect-auto md:min-h-[160px]">
                  <Image
                    src={placeholder}
                    alt={c.name}
                    fill
                    className="object-cover transition duration-150 group-hover:scale-[1.03]"
                    sizes="(max-width: 767px) 160px, (max-width: 1023px) 30vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-[rgba(0,0,0,0.35)]" />
                  <p className="absolute inset-x-0 bottom-0 flex items-end justify-center p-3 text-center text-sm font-bold text-white">
                    {c.name}
                  </p>
                </div>
              </Link>
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
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {(
            [
              ["him", "#1a2234", "For him"],
              ["her", "#6b1a2e", "For her"],
              ["kids", "#8b4a0e", "For kids"],
              ["couples", "#3d1a6b", "For couples"],
              ["corporate", "#2d3748", "Corporate"],
            ] as const
          ).map(([slug, bg, label]) => (
            <Link
              key={slug}
              href={`/for/${slug}`}
              className="group relative flex min-h-[160px] flex-col justify-end overflow-hidden rounded-2xl p-5 text-white transition duration-150 hover:scale-[1.02] md:min-h-[200px] md:p-8 lg:min-h-[300px]"
              style={{ backgroundColor: bg }}
            >
              <p className="font-display text-lg font-semibold md:text-xl lg:text-[28px]">{label}</p>
              <p className="mt-2 text-sm text-white/85">Browse</p>
            </Link>
          ))}
        </div>
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

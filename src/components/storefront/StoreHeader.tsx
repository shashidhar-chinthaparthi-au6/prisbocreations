"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HeaderCart } from "@/components/HeaderCart";
import { HeaderAccountIcon } from "@/components/layout/HeaderAccountIcon";
import { StoreSearchOverlayFull } from "@/components/storefront/StoreSearchOverlay";
import { useWishlistStore } from "@/lib/store/wishlist-store";

type NavCategory = { slug: string; name: string; subcategories: { slug: string; name: string }[] };

function Wordmark() {
  return (
    <Link href="/" className="flex shrink-0 items-baseline gap-0.5 font-display text-lg font-normal tracking-tight sm:text-xl">
      <span className="text-[var(--brand-ink)]">Prisbo</span>
      <span className="text-[var(--brand-amber)]">Creations</span>
    </Link>
  );
}

const tabBase =
  "inline-flex items-center rounded-[100px] px-3 py-1.5 text-[13px] transition-colors";
const tabIdle = `${tabBase} font-normal text-[#6B6560] hover:bg-[#F5E6D0] hover:text-[#9A5E1E]`;
const tabActive = `${tabBase} bg-[#F5E6D0] font-medium text-[#C47A2B]`;

function HeaderDivider() {
  return <span className="hidden h-5 w-px shrink-0 bg-[#E8E0D6] md:block" aria-hidden />;
}

export function StoreHeader() {
  const pathname = usePathname() ?? "";
  const hideCart = pathname.startsWith("/checkout");
  const [nav, setNav] = useState<NavCategory[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const wishCount = useWishlistStore((s) => s.ids.length);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/categories", { credentials: "include" });
        const j = (await r.json()) as { ok?: boolean; data?: NavCategory[] };
        if (!cancelled && j.data) setNav(j.data);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const activeCategory = nav.find((c) => c.slug === hoverCat);
  const allActive = pathname === "/products";

  const categoryActive = (slug: string) =>
    pathname === `/category/${slug}` || pathname.startsWith(`/category/${slug}/`);

  return (
    <>
      <header className="relative border-b border-[#E8E0D6] bg-[var(--brand-card)]" onMouseLeave={() => setHoverCat(null)}>
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)] md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-[var(--brand-ink)]" />
              <span className="block h-0.5 w-5 bg-[var(--brand-ink)]" />
              <span className="block h-0.5 w-5 bg-[var(--brand-ink)]" />
            </span>
          </button>

          <div className="flex min-w-0 flex-1 justify-center md:flex-none md:justify-start">
            <Wordmark />
          </div>

          <nav className="relative hidden min-h-0 min-w-0 flex-none items-center gap-1 overflow-x-auto md:flex" aria-label="Shop by category">
            <Link href="/products" className={allActive ? tabActive : tabIdle}>
              All
            </Link>
            {nav.map((c) => (
              <div key={c.slug} className="shrink-0" onMouseEnter={() => setHoverCat(c.slug)}>
                <Link href={`/category/${c.slug}`} className={categoryActive(c.slug) ? tabActive : tabIdle}>
                  {c.name}
                </Link>
              </div>
            ))}
          </nav>

          <div className="hidden min-w-0 flex-1 md:block" aria-hidden />

          <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-11 min-w-[44px] items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)]"
              aria-label="Search"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[var(--brand-ink)]">
                <path
                  d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm0-2a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
                  fill="currentColor"
                />
                <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            <HeaderDivider />

            <Link
              href="/track"
              className="hidden h-11 items-center rounded-full px-3 text-[13px] font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-amber-light)] hover:text-[var(--brand-ink)] md:inline-flex"
            >
              Track order
            </Link>

            <HeaderDivider />

            <HeaderAccountIcon />

            <Link
              href="/account/wishlist"
              className="relative flex h-11 min-w-[44px] items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)]"
              aria-label="Wishlist"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="text-[var(--brand-ink)]">
                <path
                  d="M12 21s-6.716-4.196-9-8.5C.8 8.236 2.28 4 6.5 4c2.28 0 3.866 1.582 5.5 3.5C13.634 5.582 15.22 4 17.5 4 21.72 4 23.2 8.236 21 12.5 18.716 16.804 12 21 12 21Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
              </svg>
              {wishCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C47A2B] text-[9px] font-semibold leading-none text-white">
                  {wishCount > 99 ? "99+" : wishCount}
                </span>
              ) : null}
            </Link>

            {hideCart ? null : <HeaderCart />}
          </div>
        </div>

        {hoverCat && activeCategory ? (
          <div
            className="absolute left-0 right-0 top-full z-[90] border-b border-[#E8E0D6] bg-[var(--brand-card)] shadow-[var(--shadow-modal)] animate-in fade-in duration-150"
            onMouseEnter={() => setHoverCat(hoverCat)}
            onMouseLeave={() => setHoverCat(null)}
          >
            <div className="mx-auto grid max-w-[1400px] gap-8 px-6 py-8 lg:grid-cols-[220px_1fr_280px] lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">In {activeCategory.name}</p>
                <ul className="mt-3 space-y-1">
                  {activeCategory.subcategories.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/category/${activeCategory.slug}/${s.slug}`}
                        className="flex items-center justify-between rounded-lg py-2 text-sm font-medium text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                      >
                        {s.name}
                        <span aria-hidden>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Featured picks</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <Link
                      key={i}
                      href={`/category/${activeCategory.slug}`}
                      className="group overflow-hidden rounded-[10px] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-[var(--shadow-card)]"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src="https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&q=80"
                          alt=""
                          fill
                          className="object-cover transition duration-150 group-hover:scale-105"
                          sizes="120px"
                        />
                      </div>
                      <p className="p-2 text-center text-xs font-medium text-[var(--brand-ink)]">Shop {activeCategory.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden lg:flex lg:flex-col lg:justify-between">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[10px]">
                  <Image
                    src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600&q=80"
                    alt="Gift wrapping"
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                </div>
                <Link href={`/category/${activeCategory.slug}`} className="btn-primary mt-4 w-full text-center">
                  Shop all {activeCategory.name}
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[var(--brand-card)] md:hidden" role="dialog" aria-label="Menu">
          <div className="flex items-center justify-between border-b border-[#E8E0D6] px-4 py-3">
            <Wordmark />
            <button
              type="button"
              className="flex h-11 min-w-[44px] items-center justify-center rounded-full text-2xl text-[var(--brand-ink)]"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <Link
              href="/search"
              className="flex h-12 items-center rounded-lg border border-[var(--brand-border)] px-4 text-sm text-[var(--brand-muted)]"
              onClick={() => setMobileOpen(false)}
            >
              Search products, categories…
            </Link>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Shop</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href="/products" className="block rounded-lg py-3 text-base font-medium" onClick={() => setMobileOpen(false)}>
                  All
                </Link>
              </li>
              {nav.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="block rounded-lg py-3 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {c.name}
                  </Link>
                  <ul className="ml-3 border-l border-[var(--brand-border)] pl-3">
                    {c.subcategories.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={`/category/${c.slug}/${s.slug}`}
                          className="block py-2 text-sm text-[var(--brand-muted)]"
                          onClick={() => setMobileOpen(false)}
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Recipient</p>
            <ul className="mt-2 space-y-1">
              {(["him", "her", "kids", "couples", "corporate"] as const).map((r) => (
                <li key={r}>
                  <Link href={`/for/${r}`} className="block rounded-lg py-3 capitalize" onClick={() => setMobileOpen(false)}>
                    For {r}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 space-y-2 border-t border-[var(--brand-border)] pt-6 text-sm">
              <Link href="/track" className="block py-2" onClick={() => setMobileOpen(false)}>
                Track order
              </Link>
              <Link href="/pages/faq" className="block py-2" onClick={() => setMobileOpen(false)}>
                FAQ
              </Link>
              <Link href="/pages/contact" className="block py-2" onClick={() => setMobileOpen(false)}>
                Contact
              </Link>
              <Link href="/pages/about" className="block py-2" onClick={() => setMobileOpen(false)}>
                About
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {searchOpen ? <StoreSearchOverlayFull onClose={() => setSearchOpen(false)} /> : null}

      <span className="sr-only" aria-live="polite" id="cart-live" />
    </>
  );
}

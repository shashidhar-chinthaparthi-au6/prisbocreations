"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { HeaderCart } from "@/components/HeaderCart";
import { HeaderAccountIcon } from "@/components/layout/HeaderAccountIcon";
import { StoreSearchOverlayFull } from "@/components/storefront/StoreSearchOverlay";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

type NavCategory = { slug: string; name: string; subcategories: { slug: string; name: string }[] };

function Wordmark() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-baseline gap-0.5 font-display text-lg font-normal tracking-tight sm:text-xl"
    >
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
  return <span className="hidden h-5 w-px shrink-0 bg-[#E8E0D6] lg:block" aria-hidden />;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      className={`shrink-0 text-[var(--brand-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StoreHeader() {
  const pathname = usePathname() ?? "";
  const hideCart = pathname.startsWith("/checkout");
  const [nav, setNav] = useState<NavCategory[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const [openAccordionSlug, setOpenAccordionSlug] = useState<string | null>(null);
  const wishCount = useWishlistStore((s) => s.ids.length);
  const navSwipe = useSwipeToClose(() => setMobileOpen(false), "left", 80);

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

  useEffect(() => {
    if (!mobileOpen) {
      setOpenAccordionSlug(null);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const activeCategory = nav.find((c) => c.slug === hoverCat);
  const allActive = pathname === "/products";

  const categoryActive = (slug: string) =>
    pathname === `/category/${slug}` || pathname.startsWith(`/category/${slug}/`);

  function toggleAccordion(slug: string) {
    setOpenAccordionSlug((s) => (s === slug ? null : slug));
  }

  return (
    <>
      <header
        className="sticky-header relative z-[100] border-b border-[#E8E0D6] bg-[var(--brand-card)]"
        onMouseLeave={() => setHoverCat(null)}
      >
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-1 px-3 sm:px-4 md:h-[60px] md:gap-2 md:px-6 lg:h-16 lg:px-8">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)] lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <span className="flex flex-col gap-1">
              <span className="block h-0.5 w-5 bg-[var(--brand-ink)]" />
              <span className="block h-0.5 w-5 bg-[var(--brand-ink)]" />
              <span className="block h-0.5 w-5 bg-[var(--brand-ink)]" />
            </span>
          </button>

          <div className="flex min-w-0 flex-1 justify-center md:justify-start lg:flex-none">
            <Wordmark />
          </div>

          <nav
            className="relative hidden min-h-0 min-w-0 flex-none items-center gap-1 overflow-x-auto lg:flex"
            aria-label="Shop by category"
          >
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

          <div className="hidden min-w-0 flex-1 lg:block" aria-hidden />

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
              className="hidden h-11 items-center rounded-full px-3 text-[13px] font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-amber-light)] hover:text-[var(--brand-ink)] lg:inline-flex"
            >
              Track order
            </Link>

            <HeaderDivider />

            <div className="hidden lg:block">
              <HeaderAccountIcon />
            </div>

            <HeaderDivider />

            <Link
              href="/account/wishlist"
              className="relative hidden h-11 min-w-[44px] items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)] md:flex"
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
              <span
                className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#C47A2B] px-0.5 text-[9px] font-semibold leading-none text-white ${wishCount > 0 ? "opacity-100" : "opacity-0"}`}
                aria-label={wishCount > 0 ? `${wishCount} items in wishlist` : "Wishlist"}
              >
                {wishCount > 99 ? "99+" : wishCount}
              </span>
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
        <div
          className="fixed inset-0 z-[200] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute left-0 top-0 flex h-full w-[min(320px,85vw)] max-w-[85vw] flex-col bg-[var(--brand-card)] shadow-2xl ring-1 ring-[#E8E0D6] transition-transform duration-300 ease-out"
            {...navSwipe}
          >
            <div className="flex items-center justify-between border-b border-[#E8E0D6] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <span className="text-sm font-semibold text-[var(--brand-ink)]">Menu</span>
              <button
                type="button"
                className="flex h-11 min-w-[44px] items-center justify-center rounded-full text-2xl text-[var(--brand-ink)]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <div className="border-b border-[var(--brand-border)] px-3 py-3">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
                className="flex h-12 w-full items-center rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 text-left text-sm text-[var(--brand-muted)]"
              >
                Search products, categories…
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <p className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">All products</p>
              <ul className="mt-1 space-y-0">
                <li className="border-b border-[var(--brand-border)] py-2">
                  <Link
                    href="/products"
                    className="block py-2 text-base font-medium text-[var(--brand-ink)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    All
                  </Link>
                </li>
                {nav.map((c) => {
                  const open = openAccordionSlug === c.slug;
                  return (
                    <li key={c.slug} className="border-b border-[var(--brand-border)]">
                      <button
                        type="button"
                        onClick={() => toggleAccordion(c.slug)}
                        className="flex w-full items-center justify-between gap-2 py-3 text-left text-base font-medium text-[var(--brand-ink)]"
                        aria-expanded={open}
                      >
                        {c.name}
                        <Chevron open={open} />
                      </button>
                      <div
                        className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
                          open ? "max-h-[500px]" : "max-h-0"
                        }`}
                      >
                        <ul className="border-l border-[var(--brand-border)] pb-3 pl-3">
                          <li>
                            <Link
                              href={`/category/${c.slug}`}
                              className="block py-2 text-sm font-medium text-[var(--brand-ink)]"
                              onClick={() => setMobileOpen(false)}
                            >
                              Shop all {c.name}
                            </Link>
                          </li>
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
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="mt-6 px-1 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                Shop by recipient
              </p>
              <ul className="mt-2 space-y-1">
                {(["him", "her", "kids", "couples"] as const).map((r) => (
                  <li key={r}>
                    <Link
                      href={`/for/${r}`}
                      className="block rounded-lg py-3 capitalize text-[var(--brand-ink)]"
                      onClick={() => setMobileOpen(false)}
                    >
                      For {r}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-1 border-t border-[var(--brand-border)] pt-4 text-sm">
                <Link href="/track" className="block py-2 text-[var(--brand-ink)]" onClick={() => setMobileOpen(false)}>
                  Track order
                </Link>
                <Link href="/login" className="block py-2 text-[var(--brand-ink)]" onClick={() => setMobileOpen(false)}>
                  Account / Sign in
                </Link>
                <Link
                  href="/account/wishlist"
                  className="flex items-center justify-between py-2 text-[var(--brand-ink)]"
                  onClick={() => setMobileOpen(false)}
                >
                  <span>Wishlist</span>
                  {wishCount > 0 ? (
                    <span className="rounded-full bg-[var(--brand-amber-light)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-amber-dark)]">
                      {wishCount}
                    </span>
                  ) : null}
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--brand-border)] pt-4 text-sm text-[var(--brand-muted)]">
                <Link href="/pages/faq" className="hover:text-[var(--brand-ink)]" onClick={() => setMobileOpen(false)}>
                  FAQ
                </Link>
                <span aria-hidden>·</span>
                <Link href="/pages/contact" className="hover:text-[var(--brand-ink)]" onClick={() => setMobileOpen(false)}>
                  Contact
                </Link>
                <span aria-hidden>·</span>
                <Link href="/pages/about" className="hover:text-[var(--brand-ink)]" onClick={() => setMobileOpen(false)}>
                  About
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {searchOpen ? <StoreSearchOverlayFull onClose={() => setSearchOpen(false)} /> : null}

      <span className="sr-only" aria-live="polite" id="cart-live" />
    </>
  );
}

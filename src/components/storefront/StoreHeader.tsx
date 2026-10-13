"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HeaderCart } from "@/components/HeaderCart";
import { HeaderAccountIcon } from "@/components/layout/HeaderAccountIcon";
import { StoreSearchOverlayFull } from "@/components/storefront/StoreSearchOverlay";
import { AiAssistantGlyph } from "@/components/storefront/AiAssistantGlyph";
import { useAssistantChatStore } from "@/lib/store/assistant-chat-store";
import { useWishlistStore } from "@/lib/store/wishlist-store";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

type NavCategory = { slug: string; name: string; subcategories: { slug: string; name: string }[] };

/* ─── Logo ─────────────────────────────────────────────────────────────── */
function Wordmark() {
  return (
    <Link href="/" className="font-display text-[26px] font-medium leading-none tracking-[-0.03em]">
      <span className="text-[#2c2824]">prisbo</span>
      <span className="italic text-[#ae6f3a]">creations.</span>
    </Link>
  );
}

/* ─── Nav pill styles ───────────────────────────────────────────────────── */
const pillBase =
  "inline-flex items-center px-3 py-1.5 text-[14px] font-medium tracking-[-0.01em] transition-colors duration-150 whitespace-nowrap";
const pillIdle = `${pillBase} text-[var(--brand-ink)]/75 hover:text-[var(--brand-ink)]`;
const pillActive = `${pillBase} text-[var(--brand-ink)]`;

/* ─── Header divider ────────────────────────────────────────────────────── */
function HeaderDivider() {
  return <span className="hidden h-5 w-px shrink-0 bg-[var(--brand-border)] lg:block" aria-hidden />;
}

/* ─── Chevron for accordion ─────────────────────────────────────────────── */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      className={`shrink-0 text-[var(--brand-muted)] transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ─── Search icon ───────────────────────────────────────────────────────── */
function SearchIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-[var(--brand-ink)]"
    >
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Wishlist icon ─────────────────────────────────────────────────────── */
function HeartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-[var(--brand-ink)]"
    >
      <path
        d="M12 21s-6.716-4.196-9-8.5C.8 8.236 2.28 4 6.5 4c2.28 0 3.866 1.582 5.5 3.5C13.634 5.582 15.22 4 17.5 4 21.72 4 23.2 8.236 21 12.5 18.716 16.804 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Icon button wrapper ───────────────────────────────────────────────── */
function IconBtn({
  onClick,
  ariaLabel,
  children,
}: {
  onClick?: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)] transition-colors duration-150"
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export function StoreHeader({ assistantEnabled = true }: { assistantEnabled?: boolean }) {
  const pathname = usePathname() ?? "";
  const hideCart = pathname.startsWith("/checkout");
  const [nav, setNav] = useState<NavCategory[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [openAccordionSlug, setOpenAccordionSlug] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const megaLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wishCount = useWishlistStore((s) => s.ids.length);
  const setSidebarOpen = useAssistantChatStore((s) => s.setSidebarOpen);
  const navSwipe = useSwipeToClose(() => setMobileOpen(false), "left", 80);

  /* Scroll shadow */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* Fetch nav */
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

  /* Close mobile on route change */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    let dead = false;
    fetch("/api/v1/storefront/notice")
      .then((r) => r.json())
      .then((j: { ok?: boolean; data?: { banner?: string } }) => {
        if (!dead && j?.ok && j.data?.banner) setAnnouncement(j.data.banner);
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, []);

  /* Lock body scroll when mobile drawer open */
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
  const allActive = pathname === "/products" || pathname.startsWith("/category/");

  function openPrisboAssistant() {
    if (!assistantEnabled) return;
    if (pathname === "/assistant") {
      document.getElementById("prisbo-assistant-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    setSidebarOpen(true);
  }

  function toggleAccordion(slug: string) {
    setOpenAccordionSlug((s) => (s === slug ? null : slug));
  }

  /* Mega-menu: delay hide so mouse can travel from nav pill to panel */
  function onNavLeave() {
    megaLeaveTimer.current = setTimeout(() => setHoverCat(null), 120);
  }
  function onNavEnter(slug: string) {
    if (megaLeaveTimer.current) clearTimeout(megaLeaveTimer.current);
    setHoverCat(slug);
  }
  function onMegaEnter() {
    if (megaLeaveTimer.current) clearTimeout(megaLeaveTimer.current);
  }
  function onMegaLeave() {
    megaLeaveTimer.current = setTimeout(() => setHoverCat(null), 80);
  }

  return (
    <>
      {announcement ? (
        <div className="bg-[#2A2520] px-4 py-2 text-center text-[13px] text-[#FBF7F1]">{announcement}</div>
      ) : null}
      {/* ── Main header bar ─────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-[100] w-full border-b border-[#e5e2db] bg-[var(--brand-canvas)] transition-shadow duration-200 ${
          scrolled ? "shadow-[0_2px_8px_rgba(28,22,18,0.06)]" : ""
        }`}
      >
        <div className="relative mx-auto flex h-[60px] w-full max-w-none items-center gap-2 px-3 sm:px-4 md:px-6 lg:h-[68px] lg:gap-4 lg:pl-10 lg:pr-6 xl:pl-12 xl:pr-8">

          {/* Hamburger — mobile only */}
          <button
            type="button"
            className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)] transition-colors duration-150 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <span className="flex flex-col gap-[5px]">
              <span className="block h-[1.5px] w-[18px] rounded-full bg-[var(--brand-ink)]" />
              <span className="block h-[1.5px] w-[18px] rounded-full bg-[var(--brand-ink)]" />
              <span className="block h-[1.5px] w-[13px] rounded-full bg-[var(--brand-ink)]" />
            </span>
          </button>

          {/* Logo */}
          <div className="flex min-w-0 flex-1 justify-center lg:max-w-fit lg:flex-none lg:justify-start">
            <div className="min-w-0 max-w-[min(70vw,15rem)] truncate text-center lg:max-w-none lg:text-left">
              <Wordmark />
            </div>
          </div>

          {/* Desktop nav pills */}
          <nav
            className="relative isolate z-10 hidden min-h-0 min-w-0 flex-1 flex-nowrap items-center justify-center gap-0.5 overflow-x-auto overflow-y-visible overscroll-x-contain lg:flex"
            aria-label="Shop by category"
            onMouseLeave={onNavLeave}
          >
            <div
              className="relative shrink-0"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <Link href="/products" className={allActive ? pillActive : pillIdle}>
                Shop
              </Link>
              {shopOpen && nav.length > 0 ? (
                <div className="absolute left-0 top-full z-[120] mt-3 min-w-[240px] rounded-2xl border border-[var(--brand-ink)]/10 bg-[var(--brand-canvas)] p-2 shadow-[0_12px_40px_rgba(28,22,18,0.08)]">
                  {nav.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/category/${c.slug}`}
                      className="block rounded-xl px-3 py-2 text-[14px] text-[var(--brand-ink)] hover:bg-[var(--brand-ink)]/5"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <Link
              href="/pages/about"
              className={pathname.startsWith("/pages/about") ? pillActive : pillIdle}
            >
              Our story
            </Link>
            <Link href="/bulk" className={pathname.startsWith("/bulk") ? pillActive : pillIdle}>
              Custom orders
            </Link>
          </nav>

          {/* Right icon strip */}
          <div className="relative isolate z-10 ml-auto flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
            {/* Search */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-full px-2 text-[14px] text-[var(--brand-ink)]/80 transition-colors hover:text-[var(--brand-ink)] lg:inline-flex"
              aria-label="Search pieces"
            >
              <SearchIcon />
              <span>Search pieces</span>
            </button>
            <span className="lg:hidden">
              <IconBtn onClick={() => setSearchOpen(true)} ariaLabel="Search">
                <SearchIcon />
              </IconBtn>
            </span>

            {/* AI Assistant */}
            {assistantEnabled && (
              <button
                type="button"
                onClick={openPrisboAssistant}
                className="flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 hover:bg-[var(--brand-amber-light)] transition-colors duration-150 lg:pl-2.5 lg:pr-3"
                aria-label="Open shopping assistant"
              >
                <AiAssistantGlyph className="h-7 w-7 shrink-0" />
                <span className="hidden text-[13px] font-semibold text-[var(--brand-ink)] lg:inline">
                  Assistant
                </span>
              </button>
            )}

            {assistantEnabled && <HeaderDivider />}

            {/* Track order — desktop only */}
            <Link
              href="/track"
              className="hidden h-10 items-center rounded-full px-3 text-[13px] font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-amber-light)] hover:text-[var(--brand-ink)] transition-colors duration-150 lg:inline-flex"
            >
              Track order
            </Link>

            <HeaderDivider />

            {/* Account — desktop only */}
            <div className="hidden lg:block">
              <HeaderAccountIcon />
            </div>

            <HeaderDivider />

            {/* Wishlist */}
            <Link
              href="/account/wishlist"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full hover:bg-[var(--brand-amber-light)] transition-colors duration-150 md:flex"
              aria-label={wishCount > 0 ? `Wishlist, ${wishCount} items` : "Wishlist"}
            >
              <HeartIcon />
              <span
                className={`absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#C47A2B] px-0.5 text-[9px] font-semibold leading-none text-white transition-opacity duration-150 ${
                  wishCount > 0 ? "opacity-100" : "opacity-0"
                }`}
              >
                {wishCount > 99 ? "99+" : wishCount}
              </span>
            </Link>

            {/* Cart */}
            {hideCart ? null : <HeaderCart />}
          </div>
        </div>

        {/* ── Mega-menu ──────────────────────────────────────────────────── */}
        <div
          className={`absolute left-0 right-0 top-full z-[90] w-full overflow-hidden border-b border-[var(--brand-border)] bg-white shadow-[0_8px_24px_rgba(24,12,4,0.10)] transition-all duration-200 ease-out ${
            hoverCat && activeCategory
              ? "pointer-events-auto max-h-[400px] opacity-100 translate-y-0"
              : "pointer-events-none max-h-0 opacity-0 -translate-y-1"
          }`}
          onMouseEnter={onMegaEnter}
          onMouseLeave={onMegaLeave}
          aria-hidden={!(hoverCat && activeCategory)}
        >
          {activeCategory && (
            <div className="mx-auto grid w-full max-w-[1400px] grid-cols-[220px_1fr_260px] gap-10 px-10 py-8 xl:px-12">
              {/* Subcategories list */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                  In {activeCategory.name}
                </p>
                <ul className="space-y-0.5">
                  {activeCategory.subcategories.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/category/${activeCategory.slug}/${s.slug}`}
                        className="group flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-medium text-[var(--brand-ink)] transition-colors duration-100 hover:bg-[var(--brand-amber-light)] hover:text-[var(--brand-amber-dark)]"
                      >
                        {s.name}
                        <span
                          className="text-[var(--brand-amber)] opacity-0 transition-opacity duration-100 group-hover:opacity-100"
                          aria-hidden
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Featured picks placeholder */}
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                  Popular picks
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <Link
                      key={i}
                      href={`/category/${activeCategory.slug}`}
                      className="group overflow-hidden rounded-[10px] border border-[var(--brand-border)] bg-[var(--brand-surface)] transition-shadow duration-150 hover:shadow-md"
                    >
                      <div className="aspect-square bg-[var(--brand-amber-light)]/60 transition duration-200 group-hover:brightness-95" />
                      <p className="p-2 text-center text-[11px] font-medium text-[var(--brand-ink)]">
                        {activeCategory.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Editorial card */}
              <div className="flex flex-col justify-between">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                    Featured
                  </p>
                  <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-[var(--brand-amber-light)]" />
                </div>
                <div className="mt-4">
                  <p className="text-base font-semibold text-[var(--brand-ink)]">
                    {activeCategory.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--brand-muted)]">
                    Handcrafted & personalised
                  </p>
                  <Link
                    href={`/category/${activeCategory.slug}`}
                    className="mt-3 inline-flex h-9 items-center rounded-full bg-[var(--brand-amber)] px-5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[var(--brand-amber-dark)]"
                  >
                    Shop all {activeCategory.name}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[200] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 flex h-full w-[300px] max-w-[85vw] flex-col bg-white shadow-2xl"
            {...navSwipe}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <Wordmark />
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--brand-muted)] hover:bg-[var(--brand-amber-light)] hover:text-[var(--brand-ink)] transition-colors duration-150"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path
                    d="M2 2l12 12M14 2L2 14"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* AI Assistant promo */}
            {assistantEnabled && (
              <div className="border-b border-[var(--brand-border)] px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    setSidebarOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--brand-amber)_30%,var(--brand-border))] bg-[color-mix(in_srgb,var(--brand-amber-light)_50%,white)] px-3 py-3 text-left transition-colors duration-150 hover:bg-[var(--brand-amber-light)]"
                >
                  <AiAssistantGlyph className="h-9 w-9 shrink-0" aria-hidden />
                  <span>
                    <span className="block text-[13px] font-semibold text-[var(--brand-ink)]">
                      Prisbo Assistant
                    </span>
                    <span className="text-[11px] text-[var(--brand-muted)]">
                      Gift ideas & catalogue help
                    </span>
                  </span>
                </button>
                <Link
                  href="/assistant"
                  className="mt-2 block w-full py-1.5 text-center text-[12px] font-medium text-[var(--brand-amber-dark)] underline underline-offset-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Open full-page assistant
                </Link>
              </div>
            )}

            {/* Search bar */}
            <div className="border-b border-[var(--brand-border)] px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
                className="flex h-11 w-full items-center gap-2.5 rounded-full border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 text-left text-[13px] text-[var(--brand-muted)] transition-colors duration-150 hover:border-[var(--brand-border-dark)]"
              >
                <SearchIcon />
                Search products, categories…
              </button>
            </div>

            {/* Nav list */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                  Shop
                </p>
                <ul className="space-y-0">
                  <li className="border-b border-[var(--brand-border)]">
                    <Link
                      href="/products"
                      className="block py-3 text-[14px] font-medium text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                      onClick={() => setMobileOpen(false)}
                    >
                      All products
                    </Link>
                  </li>
                  {nav.map((c) => {
                    const isOpen = openAccordionSlug === c.slug;
                    return (
                      <li key={c.slug} className="border-b border-[var(--brand-border)]">
                        <button
                          type="button"
                          onClick={() => toggleAccordion(c.slug)}
                          className="flex w-full items-center justify-between gap-2 py-3 text-left text-[14px] font-medium text-[var(--brand-ink)]"
                          aria-expanded={isOpen}
                        >
                          {c.name}
                          <Chevron open={isOpen} />
                        </button>
                        <div
                          className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
                            isOpen ? "max-h-[500px]" : "max-h-0"
                          }`}
                        >
                          <ul className="border-l-2 border-[var(--brand-amber-light)] pb-3 pl-4">
                            <li>
                              <Link
                                href={`/category/${c.slug}`}
                                className="block py-2 text-[13px] font-medium text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                                onClick={() => setMobileOpen(false)}
                              >
                                Shop all {c.name}
                              </Link>
                            </li>
                            {c.subcategories.map((s) => (
                              <li key={s.slug}>
                                <Link
                                  href={`/category/${c.slug}/${s.slug}`}
                                  className="block py-2 text-[13px] text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
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

                {/* Shop by recipient */}
                <p className="mb-2 mt-6 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                  Shop by recipient
                </p>
                <ul className="space-y-0.5">
                  {(["him", "her", "kids", "couples"] as const).map((r) => (
                    <li key={r}>
                      <Link
                        href={`/for/${r}`}
                        className="block rounded-lg py-2.5 text-[14px] capitalize text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                        onClick={() => setMobileOpen(false)}
                      >
                        For {r}
                      </Link>
                    </li>
                  ))}
                </ul>

                {/* Account / utility links */}
                <div className="mt-5 space-y-1 border-t border-[var(--brand-border)] pt-4">
                  <Link
                    href="/track"
                    className="block rounded-lg py-2.5 text-[14px] text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Track order
                  </Link>
                  <Link
                    href="/login"
                    className="block rounded-lg py-2.5 text-[14px] text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Account / Sign in
                  </Link>
                  <Link
                    href="/account/wishlist"
                    className="flex items-center justify-between rounded-lg py-2.5 text-[14px] text-[var(--brand-ink)] hover:text-[var(--brand-amber-dark)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>Wishlist</span>
                    {wishCount > 0 && (
                      <span className="rounded-full bg-[var(--brand-amber-light)] px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-amber-dark)]">
                        {wishCount}
                      </span>
                    )}
                  </Link>
                </div>

                {/* Footer links */}
                <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--brand-border)] pt-4">
                  {[
                    { href: "/pages/faq", label: "FAQ" },
                    { href: "/pages/contact", label: "Contact" },
                    { href: "/pages/about", label: "About" },
                  ].map(({ href, label }, i, arr) => (
                    <span key={href} className="flex items-center gap-3">
                      <Link
                        href={href}
                        className="text-[12px] text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
                        onClick={() => setMobileOpen(false)}
                      >
                        {label}
                      </Link>
                      {i < arr.length - 1 && (
                        <span className="text-[var(--brand-border-dark)]" aria-hidden>
                          ·
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && <StoreSearchOverlayFull onClose={() => setSearchOpen(false)} />}

      <span className="sr-only" aria-live="polite" id="cart-live" />
    </>
  );
}

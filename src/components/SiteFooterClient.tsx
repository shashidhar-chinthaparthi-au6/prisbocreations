"use client";

import Link from "next/link";

type Props = {
  isAdmin: boolean;
  loggedIn: boolean;
};

function FooterNav({ isAdmin, loggedIn }: Props) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs sm:gap-x-8">
      <div className="flex min-w-[5.5rem] flex-col gap-1">
        <span className="font-semibold text-ink">{isAdmin ? "Store" : "Shop"}</span>
        <Link href="/categories" className="text-ink-muted hover:text-accent">
          {isAdmin ? "View storefront" : "Categories"}
        </Link>
        <Link href="/search" className="text-ink-muted hover:text-accent">
          Search
        </Link>
        {isAdmin ? (
          <Link href="/admin/products" className="text-ink-muted hover:text-accent">
            Manage products
          </Link>
        ) : (
          <Link href="/cart" className="text-ink-muted hover:text-accent">
            Cart
          </Link>
        )}
      </div>
      {!isAdmin ? (
        <div className="flex min-w-[5.5rem] flex-col gap-1">
          <span className="font-semibold text-ink">Help</span>
          <Link href="/shipping" className="text-ink-muted hover:text-accent">
            Shipping
          </Link>
          <Link href="/returns" className="text-ink-muted hover:text-accent">
            Returns
          </Link>
          <Link href="/contact" className="text-ink-muted hover:text-accent">
            Contact
          </Link>
          <Link href="/privacy" className="text-ink-muted hover:text-accent">
            Privacy &amp; cookies
          </Link>
        </div>
      ) : null}
      <div className="flex min-w-[5.5rem] flex-col gap-1">
        <span className="font-semibold text-ink">Account</span>
        {loggedIn ? (
          <>
            <Link href="/account" className="text-ink-muted hover:text-accent">
              My account
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="text-ink-muted hover:text-accent">
                Admin dashboard
              </Link>
            ) : null}
          </>
        ) : (
          <>
            <Link href="/login" className="text-ink-muted hover:text-accent">
              Login
            </Link>
            <Link href="/register" className="text-ink-muted hover:text-accent">
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export function SiteFooterClient({ isAdmin, loggedIn }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer
      data-site-footer
      className="relative z-10 shrink-0 border-t border-sand-deep bg-white/60 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {/* Mobile: collapsed by default (native details) */}
      <details className="group border-sand-deep/40 md:hidden [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))]">
          <span className="font-display text-sm font-semibold text-ink">Prisbo Creations</span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
            Links
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-4 w-4 transition duration-200 group-open:rotate-180"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </span>
        </summary>
        <div className="border-t border-sand-deep/40 px-[max(1rem,env(safe-area-inset-left))] pb-3 pt-3 pr-[max(1rem,env(safe-area-inset-right))]">
          <FooterNav isAdmin={isAdmin} loggedIn={loggedIn} />
        </div>
      </details>

      {/* md+: always expanded (current layout) */}
      <div className="hidden w-full flex-col gap-3 px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-3.5 md:flex md:flex-row md:items-start md:justify-between md:gap-4 lg:px-8">
        <p className="shrink-0 font-display text-sm font-semibold text-ink">Prisbo Creations</p>
        <FooterNav isAdmin={isAdmin} loggedIn={loggedIn} />
      </div>

      <div className="border-t border-sand-deep/80 py-1.5 text-center text-[10px] leading-tight text-ink-muted sm:text-xs">
        © {year} Prisbo Creations
      </div>
    </footer>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { HeaderCart } from "@/components/HeaderCart";
import { HeaderSearch, HeaderSearchFallback } from "@/components/store/HeaderSearch";

export async function SiteHeader() {
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;
  const isAdmin = session?.role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b border-sand-deep/60 bg-sand/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="flex w-full items-center gap-2 px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))] sm:gap-3 sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] lg:px-8">
        <div className="flex shrink-0 items-baseline gap-2">
          <Link
            href={isAdmin ? "/admin" : "/"}
            className="font-display text-lg font-bold tracking-tight text-ink md:text-2xl lg:text-3xl"
          >
            Prisbo <span className="text-accent">Creations</span>
          </Link>
          {isAdmin ? (
            <span className="rounded-md bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          ) : null}
        </div>

        {!isAdmin ? (
          <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-3 md:px-6">
            <Suspense fallback={<HeaderSearchFallback />}>
              <HeaderSearch />
            </Suspense>
          </div>
        ) : (
          <div className="min-w-0 flex-1" aria-hidden />
        )}

        <nav
          className={
            isAdmin
              ? "flex min-h-[2.75rem] min-w-0 max-w-[65vw] flex-1 items-center justify-end gap-x-2 overflow-x-auto text-sm font-medium text-ink-muted [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none sm:gap-x-3 md:gap-x-4 [&::-webkit-scrollbar]:hidden"
              : "flex shrink-0 items-center gap-x-1 text-sm font-medium text-ink-muted sm:gap-x-2 md:gap-x-3"
          }
          aria-label="Main"
        >
          {isAdmin ? (
            <>
              <Link href="/admin" className="shrink-0 font-semibold text-ink hover:text-accent">
                Overview
              </Link>
              <Link href="/admin/products" className="shrink-0 hover:text-accent">
                Products
              </Link>
              <Link href="/admin/categories" className="shrink-0 hover:text-accent">
                Categories
              </Link>
              <Link href="/admin/subcategories" className="shrink-0 hover:text-accent">
                Subcategories
              </Link>
              <Link href="/admin/orders" className="shrink-0 hover:text-accent">
                Orders
              </Link>
              <Link href="/admin/users" className="shrink-0 hover:text-accent">
                Users
              </Link>
              <Link href="/categories" className="shrink-0 hover:text-accent">
                Storefront
              </Link>
              <Link href="/account" className="shrink-0 hover:text-accent">
                Account
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/categories"
                className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 hover:text-accent sm:px-1.5"
              >
                Shop
              </Link>
              <Link
                href="/track"
                className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 hover:text-accent sm:px-1.5"
              >
                <span className="hidden sm:inline">Track order</span>
                <span className="sm:hidden">Track</span>
              </Link>
              {session ? (
                <>
                  <Link
                    href="/orders"
                    className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 hover:text-accent sm:px-1.5"
                  >
                    Orders
                  </Link>
                  <Link
                    href="/account"
                    className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 hover:text-accent sm:px-1.5"
                  >
                    Account
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-1 hover:text-accent sm:px-1.5"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-ink px-3 py-2 text-white hover:bg-ink/90 sm:px-4"
                  >
                    Join
                  </Link>
                </>
              )}
              <HeaderCart />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

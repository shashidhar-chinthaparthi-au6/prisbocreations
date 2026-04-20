import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { HeaderCart } from "@/components/HeaderCart";
import { HeaderProfile } from "@/components/account/HeaderProfile";
import { HeaderSearch, HeaderSearchFallback } from "@/components/store/HeaderSearch";
import { StoreCategoryStrip } from "@/components/store/StoreCategoryStrip";

export async function SiteHeader() {
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;
  const isAdmin = session?.role === "admin";

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <div className="flex w-full items-center gap-2 px-[max(0.75rem,env(safe-area-inset-left))] py-2.5 pr-[max(0.75rem,env(safe-area-inset-right))] sm:gap-3 sm:py-3 sm:pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1rem,env(safe-area-inset-right))] lg:px-8">
        <div className="flex shrink-0 items-baseline gap-2">
          <Link
            href={isAdmin ? "/admin" : "/"}
            className="font-display text-base font-bold tracking-tight text-slate-900 sm:text-lg md:text-2xl"
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
              : "flex shrink-0 items-center gap-x-0.5 text-xs font-medium text-slate-600 sm:gap-x-1 sm:text-sm"
          }
          aria-label="Main"
        >
          {isAdmin ? (
            <>
              <Link href="/admin" className="shrink-0 font-semibold text-ink hover:text-accent">
                Catalog
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
              <HeaderProfile />
            </>
          ) : (
            <>
              <Link
                href="/categories"
                className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-slate-50 hover:text-slate-900 sm:min-h-11 sm:px-2.5"
              >
                Categories
              </Link>
              <Link
                href="/track"
                className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-slate-50 hover:text-slate-900 sm:min-h-11 sm:px-2.5"
              >
                <span className="hidden sm:inline">Track order</span>
                <span className="sm:hidden">Track</span>
              </Link>
              {session ? (
                <>
                  <Link
                    href="/orders"
                    className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1.5 hover:bg-slate-50 hover:text-slate-900 sm:min-h-11 sm:px-2.5"
                  >
                    Orders
                  </Link>
                  <HeaderProfile />
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-md px-2 py-1.5 font-semibold text-slate-800 hover:bg-slate-50 sm:min-h-11 sm:px-2.5"
                >
                  Login
                </Link>
              )}
              <HeaderCart />
            </>
          )}
        </nav>
      </div>
      {!isAdmin ? (
        <Suspense
          fallback={
            <div
              className="h-10 border-t border-slate-100 bg-slate-50/90"
              aria-hidden
            />
          }
        >
          <StoreCategoryStrip />
        </Suspense>
      ) : null}
    </header>
  );
}

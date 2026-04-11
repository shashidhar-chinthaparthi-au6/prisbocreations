import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { HeaderCart } from "@/components/HeaderCart";

export async function SiteHeader() {
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-sand-deep/60 bg-sand/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-baseline gap-2">
          <Link href={session?.role === "admin" ? "/admin" : "/"} className="font-display text-xl tracking-tight text-ink">
            Prisbo <span className="text-accent">Creations</span>
          </Link>
          {session?.role === "admin" ? (
            <span className="rounded-md bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              Admin
            </span>
          ) : null}
        </div>

        <nav
          className="flex min-h-[2.25rem] min-w-0 flex-1 items-center justify-center gap-x-3 overflow-x-auto text-sm font-medium text-ink-muted [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-x-4 md:gap-x-5 [&::-webkit-scrollbar]:hidden"
          aria-label="Main"
        >
          {session?.role === "admin" ? (
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
              <Link href="/categories" className="shrink-0 hover:text-accent">
                Shop
              </Link>
              <Link href="/track" className="shrink-0 hover:text-accent">
                Track order
              </Link>
              {session ? (
                <>
                  <Link href="/orders" className="shrink-0 hover:text-accent">
                    Orders
                  </Link>
                  <Link href="/account" className="shrink-0 hover:text-accent">
                    Account
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="shrink-0 hover:text-accent">
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="shrink-0 rounded-full bg-ink px-3 py-1 text-white hover:bg-ink/90"
                  >
                    Join
                  </Link>
                </>
              )}
            </>
          )}
        </nav>

        <div className="shrink-0">{session?.role === "admin" ? null : <HeaderCart />}</div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export async function SiteFooter() {
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;
  const isAdmin = session?.role === "admin";

  return (
    <footer
      data-site-footer
      className="relative z-10 shrink-0 border-t border-sand-deep bg-white/60 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex w-full flex-col gap-3 px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))] sm:px-6 sm:py-3.5 lg:px-8 md:flex-row md:items-start md:justify-between md:gap-4">
        <p className="shrink-0 font-display text-sm font-semibold text-ink">Prisbo Creations</p>
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
            {session ? (
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
      </div>
      <div className="border-t border-sand-deep/80 py-1.5 text-center text-[10px] leading-tight text-ink-muted sm:text-xs">
        © {new Date().getFullYear()} Prisbo Creations
      </div>
    </footer>
  );
}

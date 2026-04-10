import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export async function SiteFooter() {
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;
  const isAdmin = session?.role === "admin";

  return (
    <footer className="mt-20 border-t border-sand-deep bg-white/60">
      <div className="flex w-full flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8 md:flex-row md:justify-between">
        <div>
          <p className="font-display text-lg text-ink">Prisbo Creations</p>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Premium personalized gifts — paper, acrylic, stationery, home accents, and apparel.
          </p>
        </div>
        <div className="flex gap-10 text-sm">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-ink">{isAdmin ? "Store" : "Shop"}</span>
            <Link href="/categories" className="text-ink-muted hover:text-accent">
              {isAdmin ? "View storefront" : "Categories"}
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
          <div className="flex flex-col gap-2">
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
      <div className="border-t border-sand-deep py-4 text-center text-xs text-ink-muted">
        © {new Date().getFullYear()} Prisbo Creations
      </div>
    </footer>
  );
}

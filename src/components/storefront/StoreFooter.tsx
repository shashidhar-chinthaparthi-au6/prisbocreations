import Link from "next/link";

const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164;
const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com";

export function StoreFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[var(--brand-border)] bg-[var(--brand-card)]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:px-8">
        <div className="space-y-3">
          <p className="font-display text-lg">
            <span className="text-[var(--brand-ink)]">Prisbo</span>{" "}
            <span className="text-[var(--brand-amber)]">Creations</span>
          </p>
          <p className="text-sm text-[var(--brand-muted)]">Crafted for your story.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--brand-amber)] hover:underline"
            >
              Instagram
            </a>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--brand-amber)] hover:underline"
              >
                WhatsApp
              </a>
            )}
          </div>
          {(phone || email) && (
            <div className="space-y-1 text-sm text-[var(--brand-muted)]">
              {phone && (
                <p>
                  <a href={`tel:${phone}`} className="hover:text-[var(--brand-amber-dark)]">
                    {phone}
                  </a>
                </p>
              )}
              {email && (
                <p>
                  <a href={`mailto:${email}`} className="hover:text-[var(--brand-amber-dark)]">
                    {email}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--brand-ink)]">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--brand-muted)]">
            <li>
              <Link href="/products" className="hover:text-[var(--brand-amber-dark)]">
                All products
              </Link>
            </li>
            <li>
              <Link href="/categories" className="hover:text-[var(--brand-amber-dark)]">
                Browse categories
              </Link>
            </li>
            <li>
              <Link href="/bulk" className="hover:text-[var(--brand-amber-dark)]">
                Bulk &amp; corporate orders
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--brand-ink)]">Help</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--brand-muted)]">
            <li>
              <Link href="/track" className="hover:text-[var(--brand-amber-dark)]">
                Track order
              </Link>
            </li>
            <li>
              <Link href="/pages/faq" className="hover:text-[var(--brand-amber-dark)]">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/pages/shipping" className="hover:text-[var(--brand-amber-dark)]">
                Shipping policy
              </Link>
            </li>
            <li>
              <Link href="/pages/returns" className="hover:text-[var(--brand-amber-dark)]">
                Returns &amp; refunds
              </Link>
            </li>
            <li>
              <Link href="/pages/contact" className="hover:text-[var(--brand-amber-dark)]">
                Contact us
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--brand-ink)]">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--brand-muted)]">
            <li>
              <Link href="/pages/about" className="hover:text-[var(--brand-amber-dark)]">
                About
              </Link>
            </li>
            <li>
              <Link href="/pages/privacy" className="hover:text-[var(--brand-amber-dark)]">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/pages/terms" className="hover:text-[var(--brand-amber-dark)]">
                Terms of service
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--brand-border)] py-4 text-center text-xs text-[var(--brand-muted)] sm:flex sm:items-center sm:justify-center sm:gap-3">
        <span>© {year} Prisbo Creations. All rights reserved.</span>
        <span className="hidden sm:inline" aria-hidden>
          |
        </span>
        <span>Made with care in India 🇮🇳</span>
      </div>
    </footer>
  );
}

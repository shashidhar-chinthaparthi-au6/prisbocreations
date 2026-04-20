import Link from "next/link";

export function StoreFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--brand-border)] bg-[var(--brand-card)]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:grid lg:grid-cols-4 lg:gap-8 lg:px-8">
        <div className="space-y-3">
          <p className="font-display text-lg">
            <span className="text-[var(--brand-ink)]">Prisbo</span>{" "}
            <span className="text-[var(--brand-amber)]">Creations</span>
          </p>
          <p className="text-sm text-[var(--brand-muted)]">Crafted for your story.</p>
          <div className="flex gap-3 text-sm">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--brand-amber)] hover:underline"
            >
              Instagram
            </a>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--brand-amber)] hover:underline"
            >
              WhatsApp
            </a>
          </div>
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
        <span>© 2026 Prisbo Creations. All rights reserved.</span>
        <span className="hidden sm:inline" aria-hidden>
          |
        </span>
        <span>Made with care in India 🇮🇳</span>
      </div>
    </footer>
  );
}

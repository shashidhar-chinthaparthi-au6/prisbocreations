import Link from "next/link";
import { FooterNewsletter } from "./FooterNewsletter";

const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164;
const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const instagram = process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com";

const linkCls =
  "text-sm text-white/60 hover:text-white transition-colors duration-150";

export function StoreFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="mt-auto w-full"
      style={{ background: "#0f0804" }}
    >
      {/* ── Newsletter strip ──────────────────────────────────────────── */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="max-w-[420px]">
            <p className="text-[20px] font-semibold leading-tight text-white">
              Stay in the loop
            </p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">
              New designs, early access, and gift inspiration — straight to your inbox.
            </p>
          </div>
          <FooterNewsletter />
        </div>
      </div>

      {/* ── Main 4-column grid ────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">

        {/* Col 1 — Brand */}
        <div className="space-y-4">
          {/* Wordmark in white */}
          <Link href="/" className="inline-flex items-center gap-0 font-sans text-[17px] font-bold tracking-tight">
            <span className="text-white">Prisbo</span>
            <span style={{ color: "var(--brand-amber)", margin: "0 3px", fontSize: "13px" }}>·</span>
            <span className="text-white">Creations</span>
          </Link>

          <p className="text-[13px] leading-relaxed text-white/60">Crafted for your story.</p>

          <div className="flex flex-wrap gap-3">
            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition-colors duration-150 hover:opacity-80"
              style={{ color: "var(--brand-amber)" }}
            >
              Instagram
            </a>
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium transition-colors duration-150 hover:opacity-80"
                style={{ color: "var(--brand-amber)" }}
              >
                WhatsApp
              </a>
            )}
          </div>

          {(phone || email) && (
            <div className="space-y-1">
              {phone && (
                <p>
                  <a
                    href={`tel:${phone}`}
                    className="text-[13px] text-white/50 transition-colors duration-150 hover:text-white/80"
                  >
                    {phone}
                  </a>
                </p>
              )}
              {email && (
                <p>
                  <a
                    href={`mailto:${email}`}
                    className="text-[13px] text-white/50 transition-colors duration-150 hover:text-white/80"
                  >
                    {email}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Col 2 — Shop */}
        <div>
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/90">
            Shop
          </p>
          <ul className="space-y-2.5">
            {[
              { href: "/products", label: "All products" },
              { href: "/categories", label: "Browse categories" },
              { href: "/for/him", label: "Shop by recipient" },
              { href: "/bulk", label: "Bulk & corporate" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={linkCls}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Help */}
        <div>
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/90">
            Help
          </p>
          <ul className="space-y-2.5">
            {[
              { href: "/track", label: "Track order" },
              { href: "/pages/faq", label: "FAQ" },
              { href: "/pages/shipping", label: "Shipping policy" },
              { href: "/pages/returns", label: "Returns & refunds" },
              { href: "/pages/contact", label: "Contact us" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={linkCls}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 4 — Company */}
        <div>
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/90">
            Company
          </p>
          <ul className="space-y-2.5">
            {[
              { href: "/pages/about", label: "About" },
              { href: "/pages/privacy", label: "Privacy policy" },
              { href: "/pages/terms", label: "Terms of service" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={linkCls}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      <div className="border-t border-white/10 px-6 py-5 lg:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-white/40">
            © {year} Prisbo Creations. All rights reserved.
          </p>
          <p className="text-xs text-white/40">Made with care in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
}

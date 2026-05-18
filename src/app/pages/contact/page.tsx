import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Prisbo Creations for order support and enquiries.",
};

export default function PagesContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / Contact
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Contact</h1>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-6 space-y-4 shadow-[var(--shadow-card)]">
          {process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164 && (
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-[var(--brand-ink)] hover:text-[var(--brand-amber)]"
            >
              <span className="text-xl">💬</span>
              <div>
                <p className="font-medium text-sm">WhatsApp</p>
                <p className="text-xs text-[var(--brand-muted)]">Fastest response — chat with us directly</p>
              </div>
            </a>
          )}
          {process.env.NEXT_PUBLIC_SUPPORT_PHONE && (
            <a
              href={`tel:${process.env.NEXT_PUBLIC_SUPPORT_PHONE}`}
              className="flex items-center gap-3 text-[var(--brand-ink)] hover:text-[var(--brand-amber)]"
            >
              <span className="text-xl">📞</span>
              <div>
                <p className="font-medium text-sm">{process.env.NEXT_PUBLIC_SUPPORT_PHONE}</p>
                <p className="text-xs text-[var(--brand-muted)]">Mon–Sat, 9am–7pm IST</p>
              </div>
            </a>
          )}
          {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
              className="flex items-center gap-3 text-[var(--brand-ink)] hover:text-[var(--brand-amber)]"
            >
              <span className="text-xl">✉️</span>
              <div>
                <p className="font-medium text-sm">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</p>
                <p className="text-xs text-[var(--brand-muted)]">We reply within 4 business hours</p>
              </div>
            </a>
          )}
        </div>
        <p className="text-sm text-[var(--brand-muted)]">
          For order tracking, use{" "}
          <Link href="/track" className="font-medium text-[var(--brand-amber)] hover:underline">
            Track order
          </Link>{" "}
          or sign in and open your order history.
        </p>
        <p className="text-sm text-[var(--brand-muted)]">
          For bulk or corporate orders, visit our{" "}
          <Link href="/bulk" className="font-medium text-[var(--brand-amber)] hover:underline">
            Bulk orders page
          </Link>.
        </p>
      </div>
    </div>
  );
}

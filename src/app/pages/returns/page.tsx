import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Returns & refunds" };

export default function PagesReturnsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / Returns
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Returns &amp; refunds</h1>
      <div className="space-y-5 text-sm leading-relaxed text-[var(--brand-muted)]">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 text-sm font-medium">
          Personalised items are non-returnable. Since every product is made to order with your
          unique design, we cannot accept returns or exchanges.
        </div>

        <div>
          <h2 className="font-semibold text-[var(--brand-ink)] mb-2">When we will refund or replace</h2>
          <p>We will refund or replace your order <strong>only</strong> if:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The product arrives physically damaged or defective.</li>
            <li>The print significantly differs from the proof you approved.</li>
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-[var(--brand-ink)] mb-2">How to report an issue</h2>
          <p>
            Send us a clear photo of the issue within <strong>48 hours of delivery</strong> via
            WhatsApp or email. Include your order number. We will review and respond within one
            business day.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-[var(--brand-ink)] mb-2">Proof approval</h2>
          <p>
            For every personalised order, we send you a digital proof before production begins.
            By approving the proof you confirm the design is correct. Orders that have been
            approved and printed cannot be refunded for design reasons.
          </p>
        </div>

        <p>
          Questions?{" "}
          <Link href="/pages/contact" className="font-medium text-[var(--brand-amber)] hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </article>
  );
}

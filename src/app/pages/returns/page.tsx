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
      <div className="space-y-4 text-sm text-[var(--brand-muted)]">
        <p>
          Personalised items are typically made to order. Please reach out via the contact page with your
          order number if something arrives damaged or incorrect — we&apos;ll make it right.
        </p>
        <p>
          For non-personalised goods, return windows and restocking rules can be listed here to match your
          studio policy.
        </p>
      </div>
    </article>
  );
}

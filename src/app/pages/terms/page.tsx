import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service" };

export default function PagesTermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / Terms
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Terms of service</h1>
      <div className="space-y-4 text-sm text-[var(--brand-muted)]">
        <p>
          By placing an order on Prisbo Creations you agree to pay the amounts shown at checkout and to
          provide accurate shipping details.
        </p>
        <p>Replace this draft with terms reviewed for your jurisdiction and payment partners.</p>
      </div>
    </article>
  );
}

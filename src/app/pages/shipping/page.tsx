import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Shipping policy" };

export default function PagesShippingPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / Shipping
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Shipping policy</h1>
      <div className="space-y-4 text-sm text-[var(--brand-muted)]">
        <p>
          Orders are packed in our studio and handed to our courier partners. Delivery estimates depend on
          your pincode and the service you choose at checkout.
        </p>
        <p>
          Free shipping may apply when your cart meets the threshold shown on the site. Taxes are included
          in listed prices unless stated otherwise.
        </p>
      </div>
    </article>
  );
}

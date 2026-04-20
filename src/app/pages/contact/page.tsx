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
      <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-6 text-[var(--brand-muted)] shadow-[var(--shadow-card)]">
        <p>
          For order support, use{" "}
          <Link href="/track" className="font-medium text-[var(--brand-amber)] hover:underline">
            Track order
          </Link>{" "}
          or sign in and open your order history.
        </p>
        <p className="mt-4">
          Add your studio email, phone, WhatsApp, or Instagram handle here when you are ready for customers
          to reach you directly.
        </p>
      </div>
    </div>
  );
}

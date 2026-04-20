import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Prisbo",
  description: "Personalised gifts and keepsakes, made in-studio in India.",
  openGraph: {
    title: "About Prisbo Creations",
    description: "Personalised gifts and keepsakes, made in-studio in India.",
  },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/">Home</Link> / About
      </nav>
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">About Prisbo Creations</h1>
      <p className="text-[var(--brand-muted)]">
        Prisbo is a small studio in India focused on personalised gifts and keepsakes — from paper and
        packaging to acrylic, stationery, home accents, and textiles. We produce in small batches so
        finishing and packaging stay gift-ready.
      </p>
      <p className="text-[var(--brand-muted)]">
        Our tagline says it simply: <strong className="text-[var(--brand-ink)]">Crafted for your story.</strong>
      </p>
    </article>
  );
}

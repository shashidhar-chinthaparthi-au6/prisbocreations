import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDb } from "@/lib/db";
import { listStorefrontProducts } from "@/lib/services/storefrontCatalog";
import { ProductCard } from "@/components/storefront/ProductCard";

const ALLOWED = new Set(["him", "her", "kids", "couples", "corporate"]);

export const revalidate = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ recipient: string }>;
}) {
  const { recipient } = await params;
  const r = recipient?.toLowerCase() ?? "";
  if (!ALLOWED.has(r)) return { title: "Recipient" };
  return {
    title: `Gifts for ${r}`,
    description: `Personalised picks for ${r} — Prisbo Creations.`,
  };
}

export default async function ForRecipientPage({
  params,
}: {
  params: Promise<{ recipient: string }>;
}) {
  const { recipient } = await params;
  const r = recipient?.toLowerCase() ?? "";
  if (!ALLOWED.has(r)) notFound();

  await connectDb();
  const { items, total } = await listStorefrontProducts({
    recipient: r,
    page: 1,
    pageSize: 24,
    sort: "popular",
  });

  return (
    <div className="mx-auto max-w-[1400px]">
      <nav className="text-sm text-[var(--brand-muted)]">
        <Link href="/" className="hover:text-[var(--brand-amber-dark)]">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--brand-ink)]">For {r}</span>
      </nav>
      <h1 className="mt-4 font-display text-3xl capitalize text-[var(--brand-ink)] sm:text-4xl">
        Gifts for {r}
      </h1>
      <p className="mt-2 text-sm text-[var(--brand-muted)]">{total} products tagged for this recipient.</p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      {items.length === 0 ? (
        <p className="mt-8 text-[var(--brand-muted)]">
          No tagged products yet — browse{" "}
          <Link href="/products" className="font-medium text-[var(--brand-amber)] hover:underline">
            all products
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

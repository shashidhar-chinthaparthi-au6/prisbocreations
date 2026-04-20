import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-sand-deep bg-white p-8 text-center shadow-sm">
      <h1 className="font-display text-2xl text-ink">Product not found</h1>
      <p className="text-sm text-ink-muted">
        This item may have been removed or the link is incorrect.
      </p>
      <Link href="/categories" className="inline-block text-sm font-medium text-accent hover:underline">
        Browse categories
      </Link>
    </div>
  );
}

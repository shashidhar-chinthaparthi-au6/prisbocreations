import Link from "next/link";

export const metadata = { title: "Returns" };

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-accent">
        <Link href="/categories">Shop</Link> / Returns
      </p>
      <h1 className="font-display text-3xl text-ink">Returns &amp; refunds</h1>
      <div className="prose prose-sm max-w-none text-ink-muted">
        <p>
          Personalized and made-to-order items may not be eligible for return unless they arrive
          damaged or incorrect. Please contact us within 48 hours of delivery with photos if something
          is wrong — we will make it right.
        </p>
        <p>
          <Link href="/contact" className="text-accent hover:underline">
            Contact us
          </Link>{" "}
          with your order ID for help.
        </p>
      </div>
    </div>
  );
}

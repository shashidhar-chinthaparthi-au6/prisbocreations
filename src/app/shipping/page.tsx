import Link from "next/link";

export const metadata = { title: "Shipping" };

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-accent">
        <Link href="/categories">Shop</Link> / Shipping
      </p>
      <h1 className="font-display text-3xl text-ink">Shipping</h1>
      <div className="prose prose-sm max-w-none text-ink-muted">
        <p>
          We pack every order with care. Delivery times depend on your pin code and courier partner.
          You will receive tracking details by email or SMS when your order ships.
        </p>
        <p>
          For questions about a specific order, use{" "}
          <Link href="/track" className="text-accent hover:underline">
            Track order
          </Link>{" "}
          or reach us via the{" "}
          <Link href="/contact" className="text-accent hover:underline">
            contact
          </Link>{" "}
          page.
        </p>
      </div>
    </div>
  );
}

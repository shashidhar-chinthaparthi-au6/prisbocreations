import Link from "next/link";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-accent">
        <Link href="/categories">Shop</Link> / Contact
      </p>
      <h1 className="font-display text-3xl text-ink">Contact</h1>
      <div className="rounded-2xl border border-sand-deep bg-white p-6 text-ink-muted shadow-sm">
        <p>
          For order support, use{" "}
          <Link href="/track" className="font-medium text-accent hover:underline">
            Track order
          </Link>{" "}
          or sign in and open your order history.
        </p>
        <p className="mt-4">
          Add your support email or phone here in this page when you are ready — or link to your
          preferred channel (WhatsApp, Instagram, etc.).
        </p>
      </div>
    </div>
  );
}

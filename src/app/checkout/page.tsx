import { getSession } from "@/lib/auth/session";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ guest?: string }>;
}) {
  const sp = await searchParams;
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-ink">Checkout</h1>
      <CheckoutClient
        isAuthenticated={Boolean(session)}
        defaultEmail={session?.email ?? ""}
        initialGuestCheckout={sp.guest === "1" || sp.guest === "true"}
      />
    </div>
  );
}

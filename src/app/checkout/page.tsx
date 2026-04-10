import { getSession } from "@/lib/auth/session";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const secret = process.env.JWT_SECRET;
  const session = secret ? await getSession(secret) : null;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-ink">Checkout</h1>
      {!session ? (
        <p className="text-sm text-ink-muted">
          Checking out as a guest — enter your email for order updates. Already have an account?{" "}
          <a href="/login?next=/checkout" className="font-medium text-accent hover:underline">
            Sign in
          </a>
        </p>
      ) : null}
      <CheckoutClient isAuthenticated={Boolean(session)} defaultEmail={session?.email ?? ""} />
    </div>
  );
}

import { getStoreSession } from "@/lib/auth/store-session";
import { CheckoutFlowClient } from "@/components/checkout/CheckoutFlowClient";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await getStoreSession();

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl text-[#3D3835]">Checkout</h1>
      <CheckoutFlowClient isAuthenticated={Boolean(session)} defaultEmail={session?.email ?? ""} />
    </div>
  );
}

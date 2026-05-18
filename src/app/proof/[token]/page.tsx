import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { ProofApprovalClient } from "@/components/proof/ProofApprovalClient";
import Link from "next/link";

export const metadata = { title: "Review Your Design Proof | Prisbo Creations" };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ProofPage({ params }: Props) {
  const { token } = await params;

  await connectDb();
  const order = await Order.findOne({ "items.proofToken": token }).lean();

  if (!order) {
    return (
      <main className="min-h-screen bg-sand flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">🔍</div>
          <h1 className="font-display text-2xl text-ink">Proof link not found</h1>
          <p className="text-ink-muted text-sm">
            This proof link may have expired or already been used. Please contact us if you need
            help.
          </p>
          <Link
            href="/pages/contact"
            className="inline-block text-sm font-medium text-accent hover:underline"
          >
            Contact us
          </Link>
        </div>
      </main>
    );
  }

  const item = (order.items as Array<{ proofToken?: string; proofImageUrl?: string; name?: string; proofStatus?: string }>).find(
    (it) => it.proofToken === token,
  );

  if (!item || item.proofStatus === "approved") {
    return (
      <main className="min-h-screen bg-sand flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h1 className="font-display text-2xl text-ink">
            {item?.proofStatus === "approved" ? "Proof already approved!" : "Link unavailable"}
          </h1>
          <p className="text-ink-muted text-sm">
            {item?.proofStatus === "approved"
              ? "You've already approved this design. We're working on your order."
              : "This link is no longer active. Please contact us if you need to review your proof."}
          </p>
        </div>
      </main>
    );
  }

  const shipName = (order.shipping as { fullName?: string })?.fullName ?? "";

  return (
    <main className="min-h-screen bg-sand py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-accent text-sm font-medium uppercase tracking-widest mb-2">
            Design proof
          </p>
          <h1 className="font-display text-2xl md:text-3xl text-ink">
            {shipName ? `Hi ${shipName.split(" ")[0]}, ` : ""}your proof is ready
          </h1>
          <p className="text-ink-muted mt-2 text-sm">
            Review your design below. Approve it to start production, or send us changes.
          </p>
        </div>
        <ProofApprovalClient
          token={token}
          proofImageUrl={item.proofImageUrl ?? ""}
          productName={item.name ?? "Your personalised item"}
        />
      </div>
    </main>
  );
}

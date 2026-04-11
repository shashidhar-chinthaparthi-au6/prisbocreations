import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { getOrderForGuest, getOrderForUser } from "@/lib/services/orderService";
import { formatInrFromPaise } from "@/lib/format";
import { PrintInvoiceButton } from "@/components/orders/PrintInvoiceButton";

export const metadata = { title: "Invoice" };

export default async function OrderInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const secret = process.env.JWT_SECRET;
  if (!secret) redirect("/login");

  await connectDb();
  const session = await getSession(secret);

  let order = session ? await getOrderForUser(id, session.sub) : null;
  if (!order && !session && sp.email?.trim()) {
    order = await getOrderForGuest(id, sp.email);
  }
  if (!order) {
    if (session) notFound();
    redirect(`/login?next=/orders/${id}/invoice`);
  }

  const inv = (order as { invoiceNumber?: string }).invoiceNumber;
  const subtotal = order.subtotalPaise;
  const ship = (order as { shippingPaise?: number }).shippingPaise ?? 0;
  const pm = (order as { paymentMethod?: string }).paymentMethod ?? "online";
  const created = order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "—";

  return (
    <div className="space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/orders/${id}${sp.email ? `?email=${encodeURIComponent(sp.email)}` : ""}`} className="text-sm text-accent hover:underline">
          ← Back to order
        </Link>
        <PrintInvoiceButton />
      </div>

      <article className="rounded-2xl border border-sand-deep bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-4 border-b border-sand-deep pb-6 sm:flex-row sm:items-start">
          <div>
            <p className="font-display text-2xl text-ink">
              Prisbo <span className="text-accent">Creations</span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">Tax invoice / Bill of supply</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-ink">{inv ?? "—"}</p>
            <p className="mt-1 text-ink-muted">Order ref</p>
            <p className="font-mono text-xs text-ink-muted">{String(order._id)}</p>
            <p className="mt-2 text-ink-muted">Date</p>
            <p className="text-ink">{created}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bill to</h2>
            <p className="mt-2 text-sm text-ink">
              {order.shipping.fullName}
              <br />
              {order.shipping.line1}
              {order.shipping.line2 ? (
                <>
                  <br />
                  {order.shipping.line2}
                </>
              ) : null}
              <br />
              {order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}
              <br />
              {order.shipping.country}
              <br />
              Phone: {order.shipping.phone}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Payment</h2>
            <p className="mt-2 text-sm capitalize text-ink">
              {pm === "cod" ? "Cash on delivery" : "Paid online"}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Status: <span className="capitalize text-ink">{order.status}</span>
            </p>
          </div>
        </section>

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-sand-deep text-left text-xs uppercase text-ink-muted">
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it, i) => (
              <tr key={i} className="border-b border-sand-deep/60">
                <td className="py-3 pr-4 text-ink">{it.name}</td>
                <td className="py-3 pr-4 text-ink-muted">{it.quantity}</td>
                <td className="py-3 text-right text-ink">{formatInrFromPaise(it.unitPricePaise * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between gap-8 text-ink-muted">
            <span>Subtotal</span>
            <span className="text-ink">{formatInrFromPaise(subtotal)}</span>
          </div>
          <div className="flex justify-between gap-8 text-ink-muted">
            <span>Delivery</span>
            <span className="text-ink">{formatInrFromPaise(ship)}</span>
          </div>
          <div className="flex justify-between gap-8 border-t border-sand-deep pt-2 font-display text-lg text-ink">
            <span>Total</span>
            <span>{formatInrFromPaise(order.totalPaise)}</span>
          </div>
        </div>

        {(order as { cancelReason?: string }).cancelReason ? (
          <p className="mt-8 text-xs text-ink-muted">
            Cancelled
            {(order as { orderCancelledAt?: Date }).orderCancelledAt
              ? ` on ${new Date((order as { orderCancelledAt: Date }).orderCancelledAt).toLocaleString("en-IN")}`
              : ""}
            . Reason: {(order as { cancelReason: string }).cancelReason}
          </p>
        ) : null}

        <p className="mt-8 text-center text-xs text-ink-muted print:mt-12">
          Thank you for your purchase. For help, reply to your order confirmation or use Track order on our site.
        </p>
      </article>
    </div>
  );
}

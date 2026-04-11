import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { getOrderForGuest, getOrderForUser } from "@/lib/services/orderService";
import { formatInrFromPaise } from "@/lib/format";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; cod?: string; email?: string }>;
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
    redirect(`/login?next=/orders/${id}`);
  }

  return (
    <div className="space-y-6">
      {sp.paid ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Payment received. Thank you — we&apos;ll prepare your order shortly.
        </p>
      ) : null}
      {sp.cod ||
      (order as { paymentMethod?: string }).paymentMethod === "cod" ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Cash on delivery — pay the rider in cash when your package arrives. Order status:{" "}
          <span className="capitalize">{order.status}</span>.
        </p>
      ) : null}
      {!session && sp.email ? (
        <p className="text-sm text-ink-muted">
          Guest order — save this link or{" "}
          <Link href="/register" className="text-accent hover:underline">
            create an account
          </Link>{" "}
          to track future orders.
        </p>
      ) : null}
      <div>
        <p className="text-sm text-ink-muted">
          <Link href="/orders" className="hover:text-accent">
            Orders
          </Link>{" "}
          / Order detail
        </p>
        <h1 className="mt-2 font-display text-2xl text-ink">Order {String(order._id)}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          <span className="capitalize">Status: {order.status}</span>
          {(order as { paymentMethod?: string }).paymentMethod === "cod" ? (
            <span className="ml-2 rounded-full bg-sand-deep px-2 py-0.5 text-xs font-medium text-ink">
              COD
            </span>
          ) : null}
        </p>
      </div>
      <div className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg text-ink">Items</h2>
        <ul className="mt-4 divide-y divide-sand-deep">
          {order.items.map((it, i) => {
            const item = it as typeof it & {
              customerImageUrl?: string;
              customerNotes?: string;
            };
            return (
              <li key={i} className="flex flex-col gap-2 border-b border-sand-deep/60 py-3 text-sm last:border-0 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {item.name} × {item.quantity}
                  </p>
                  {item.customerNotes?.trim() ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">
                      {item.customerNotes}
                    </p>
                  ) : null}
                  {item.customerImageUrl ? (
                    <div className="relative mt-2 inline-block h-24 w-24 overflow-hidden rounded-lg border border-sand-deep bg-sand">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.customerImageUrl}
                        alt="Customer reference"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 text-ink-muted sm:text-right">
                  {formatInrFromPaise(item.unitPricePaise * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-right font-display text-xl text-ink">
          Total {formatInrFromPaise(order.totalPaise)}
        </p>
      </div>
      <div className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg text-ink">Shipping</h2>
        <p className="mt-2 text-sm text-ink-muted">
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
          {order.shipping.phone}
        </p>
      </div>
    </div>
  );
}

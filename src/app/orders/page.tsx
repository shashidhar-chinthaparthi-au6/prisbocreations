import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { listOrdersForUser } from "@/lib/services/orderService";
import { formatInrFromPaise } from "@/lib/format";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const secret = process.env.JWT_SECRET;
  if (!secret) redirect("/login");
  const session = await getSession(secret);
  if (!session) redirect("/login?next=/orders");

  await connectDb();
  const orders = await listOrdersForUser(session.sub);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-ink">Your orders</h1>
      {!orders.length ? (
        <p className="text-ink-muted">
          No orders yet.{" "}
          <Link href="/categories" className="text-accent hover:underline">
            Start shopping
          </Link>
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={String(o._id)}>
              <Link
                href={`/orders/${o._id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-deep bg-white p-4 shadow-sm hover:border-accent"
              >
                <span className="font-mono text-xs text-ink-muted">{String(o._id)}</span>
                <span className="text-sm capitalize text-ink">
                  {o.status}
                  {(o as { paymentMethod?: string }).paymentMethod === "cod" ? (
                    <span className="ml-2 text-xs font-normal text-amber-800">COD</span>
                  ) : null}
                </span>
                <span className="font-medium text-ink">{formatInrFromPaise(o.totalPaise)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

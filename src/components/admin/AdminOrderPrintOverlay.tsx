"use client";

import { formatInrFromPaise } from "@/lib/format";
import { orderLineTotalPaise } from "@/lib/order-line-total";
import { getSellerAddress } from "@/lib/seller-address";
import type { AdminOrderFull } from "@/lib/admin-order-types";

export type AdminPrintKind = "invoice" | "label";

type Props = {
  order: AdminOrderFull;
  kind: AdminPrintKind;
};

function formatPlaced(iso?: string | Date | null) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminOrderPrintOverlay({ order, kind }: Props) {
  const seller = getSellerAddress();
  const inv = order.invoiceNumber ?? "—";
  const ship = order.shipping;
  const pm = order.paymentMethod ?? "online";
  const sr = order.shiprocket && typeof order.shiprocket === "object" ? order.shiprocket : null;
  const awb = sr && typeof sr.awb === "string" ? sr.awb : "";
  const courier = sr && typeof sr.courierName === "string" ? sr.courierName : "";

  if (kind === "invoice") {
    return (
      <article className="max-w-3xl bg-white p-8 text-ink print:max-w-none print:p-6">
        <header className="flex flex-col justify-between gap-4 border-b border-sand-deep pb-6 sm:flex-row sm:items-start">
          <div>
            <p className="font-display text-2xl text-ink">
              {seller.businessName.includes(" ") ? (
                <>
                  {seller.businessName.split(/\s+/)[0]}{" "}
                  <span className="text-accent">
                    {seller.businessName.split(/\s+/).slice(1).join(" ")}
                  </span>
                </>
              ) : (
                seller.businessName
              )}
            </p>
            <p className="mt-1 text-sm text-ink-muted">Tax invoice / Bill of supply</p>
            <div className="mt-4 text-xs leading-relaxed text-ink-muted">
              <p className="font-semibold uppercase tracking-wide text-ink">Sold by</p>
              <p className="mt-1 text-ink">
                {seller.legalName}
                <br />
                {seller.line1}
                <br />
                {seller.line2}
                <br />
                {seller.city}, {seller.state} {seller.postalCode}, {seller.country}
                <br />
                Phone: {seller.phone}
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-ink">{inv}</p>
            <p className="mt-1 text-ink-muted">Order ref</p>
            <p className="font-mono text-xs text-ink-muted">{order._id}</p>
            <p className="mt-2 text-ink-muted">Date</p>
            <p className="text-ink">{formatPlaced(order.createdAt)}</p>
            {order.customerEmail ? (
              <>
                <p className="mt-2 text-ink-muted">Buyer email</p>
                <p className="break-all text-ink">{order.customerEmail}</p>
              </>
            ) : null}
          </div>
        </header>

        {ship ? (
          <section className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Bill to</h2>
              <p className="mt-2 text-sm text-ink">
                {ship.fullName}
                <br />
                {ship.line1}
                {ship.line2 ? (
                  <>
                    <br />
                    {ship.line2}
                  </>
                ) : null}
                <br />
                {ship.city}, {ship.state} {ship.postalCode}
                <br />
                {ship.country}
                <br />
                Phone: {ship.phone}
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
              {order.razorpayOrderId ? (
                <p className="mt-2 break-all font-mono text-xs text-ink-muted">
                  Razorpay order: {order.razorpayOrderId}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <table className="mt-8 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-sand-deep text-left text-xs uppercase text-ink-muted">
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Qty</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((it, i) => (
              <tr key={i} className="border-b border-sand-deep/60">
                <td className="py-3 pr-4 text-ink">{it.name}</td>
                <td className="py-3 pr-4 font-mono text-xs text-ink-muted">{it.sku}</td>
                <td className="py-3 pr-4 text-ink-muted">{it.quantity}</td>
                <td className="py-3 text-right text-ink">
                  {formatInrFromPaise(orderLineTotalPaise(it))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
          <div className="flex justify-between gap-8 text-ink-muted">
            <span>Subtotal</span>
            <span className="text-ink">{formatInrFromPaise(order.subtotalPaise)}</span>
          </div>
          <div className="flex justify-between gap-8 text-ink-muted">
            <span>Delivery</span>
            <span className="text-ink">{formatInrFromPaise(order.shippingPaise ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-8 border-t border-sand-deep pt-2 font-display text-lg text-ink">
            <span>Total</span>
            <span>{formatInrFromPaise(order.totalPaise)}</span>
          </div>
        </div>

        {order.notes?.trim() ? (
          <p className="mt-6 text-xs text-ink-muted">
            <span className="font-semibold text-ink">Order notes:</span> {order.notes}
          </p>
        ) : null}

        {order.status === "cancelled" && order.cancelReason ? (
          <p className="mt-6 text-xs text-rose-800">
            Cancelled{order.orderCancelledAt ? ` · ${formatPlaced(order.orderCancelledAt)}` : ""}.
            Reason: {order.cancelReason}
          </p>
        ) : null}

        <p className="mt-8 text-center text-xs text-ink-muted print:mt-12">
          Thank you for your purchase.
        </p>
      </article>
    );
  }

  /* Posting / shipping label */
  return (
    <div className="max-w-2xl bg-white p-6 text-ink print:max-w-none">
      <header className="border-b-2 border-ink pb-4">
        <p className="font-display text-xl font-semibold">{seller.businessName}</p>
        <p className="mt-1 text-sm font-medium text-ink-muted">Shipping label · Post / courier</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
          <span>
            <span className="text-ink-muted">Invoice:</span> {inv}
          </span>
          <span>
            <span className="text-ink-muted">Order:</span> {order._id}
          </span>
          <span className="capitalize">
            <span className="text-ink-muted">Pay:</span> {pm === "cod" ? "COD" : "Online"}
          </span>
          <span>
            <span className="text-ink-muted">Total:</span> {formatInrFromPaise(order.totalPaise)}
          </span>
        </div>
        {awb ? (
          <p className="mt-2 font-mono text-sm">
            <span className="text-ink-muted">AWB:</span> {awb}
            {courier ? ` · ${courier}` : ""}
          </p>
        ) : null}
      </header>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border-2 border-dashed border-ink p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink">To — Deliver to</h2>
          {ship ? (
            <div className="mt-3 text-base font-medium leading-relaxed">
              <p className="text-lg font-semibold">{ship.fullName}</p>
              <p className="mt-2">
                {ship.line1}
                {ship.line2 ? (
                  <>
                    <br />
                    {ship.line2}
                  </>
                ) : null}
                <br />
                {ship.city}, {ship.state} {ship.postalCode}
                <br />
                {ship.country}
              </p>
              <p className="mt-3 text-sm">
                <span className="text-ink-muted">Phone:</span> {ship.phone}
              </p>
              {order.customerEmail ? (
                <p className="mt-1 break-all text-sm">
                  <span className="text-ink-muted">Email:</span> {order.customerEmail}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-ink-muted">No address on file</p>
          )}
        </section>

        <section className="rounded-lg border-2 border-dashed border-ink p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ink">From — Sender</h2>
          <div className="mt-3 text-base font-medium leading-relaxed">
            <p className="text-lg font-semibold">{seller.legalName}</p>
            <p className="mt-1 text-sm text-ink-muted">{seller.businessName}</p>
            <p className="mt-3">
              {seller.line1}
              <br />
              {seller.line2}
              <br />
              {seller.city}, {seller.state} {seller.postalCode}
              <br />
              {seller.country}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-ink-muted">Phone:</span> {seller.phone}
            </p>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-sand-deep bg-sand/40 p-4 text-sm">
        <h3 className="text-xs font-semibold uppercase text-ink-muted">Contents (summary)</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-ink">
          {(order.items ?? []).map((it, i) => (
            <li key={i}>
              {it.name} × {it.quantity}
              {typeof it.giftWrapPaise === "number" && it.giftWrapPaise > 0
                ? ` — Gift wrap ${formatInrFromPaise(it.giftWrapPaise * it.quantity)}`
                : ""}
              {it.giftMessage?.trim() ? ` — Gift: ${it.giftMessage.trim().slice(0, 100)}` : ""}
              {it.customerNotes?.trim() ? ` — Note: ${it.customerNotes.trim().slice(0, 120)}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-center text-[10px] text-ink-muted print:mt-8">
        Attach this sheet to the outside of the package or use as reference for the courier booking.
      </p>
    </div>
  );
}

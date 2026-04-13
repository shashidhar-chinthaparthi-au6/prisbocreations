"use client";

import Link from "next/link";
import { formatInrFromPaise } from "@/lib/format";
import type { AdminOrderFull } from "@/components/admin/admin-order-types";

type Props = {
  order: AdminOrderFull;
  onClose: () => void;
};

function formatWhen(iso?: string | Date | null) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminOrderDetailSheet({ order, onClose }: Props) {
  const inv = order.invoiceNumber;
  const ship = order.shipping;
  const pm = order.paymentMethod ?? "online";
  const sr = order.shiprocket && typeof order.shiprocket === "object" ? order.shiprocket : null;
  const scans = Array.isArray(sr?.webhookScans)
    ? (sr!.webhookScans as Array<{ date?: string; activity?: string; location?: string }>)
    : [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-order-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col rounded-t-2xl border border-sand-deep bg-white shadow-xl sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-sand-deep px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="admin-order-detail-title" className="font-display text-lg text-ink sm:text-xl">
              Order details
            </h2>
            {inv ? (
              <p className="mt-1 font-mono text-sm font-semibold text-accent">{inv}</p>
            ) : null}
            <p className="mt-0.5 font-mono text-[11px] text-ink-muted">{order._id}</p>
            <p className="mt-2 text-xs text-ink-muted">
              Placed {formatWhen(order.createdAt as string | undefined)}
              {order.updatedAt && String(order.updatedAt) !== String(order.createdAt) ? (
                <> · Updated {formatWhen(order.updatedAt as string | undefined)}</>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-sand-deep px-3 py-1.5 text-sm text-ink-muted hover:border-ink hover:text-ink"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-6">
            <section className="rounded-xl border border-sand-deep bg-sand/30 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Customer &amp; account
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-ink-muted">Email</dt>
                  <dd className="font-medium text-ink">{order.customerEmail ?? "—"}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-ink-muted">Account</dt>
                  <dd className="text-ink">
                    {order.userId ? (
                      <span className="font-mono text-xs">{String(order.userId)}</span>
                    ) : (
                      <span className="text-ink-muted">Guest checkout</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-ink-muted">Status</dt>
                  <dd className="capitalize text-ink">{order.status}</dd>
                </div>
              </dl>
            </section>

            {ship ? (
              <section className="rounded-xl border border-sand-deep bg-white p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Ship to (invoice address)
                </h3>
                <p className="mt-3 text-sm text-ink">
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
                  <span className="text-ink-muted">Phone:</span> {ship.phone}
                </p>
              </section>
            ) : null}

            <section className="rounded-xl border border-sand-deep bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Payment
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-ink-muted">Method</dt>
                  <dd className="capitalize text-ink">
                    {pm === "cod" ? "Cash on delivery" : "Online (Razorpay)"}
                  </dd>
                </div>
                {order.razorpayOrderId ? (
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-ink-muted">Razorpay order id</dt>
                    <dd className="break-all font-mono text-xs text-ink">{order.razorpayOrderId}</dd>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-ink-muted">Currency</dt>
                  <dd className="text-ink">{order.currency ?? "INR"}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-sand-deep bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Line items
              </h3>
              <ul className="mt-3 divide-y divide-sand-deep/80">
                {(order.items ?? []).map((it, i) => (
                  <li key={i} className="flex gap-3 py-3 first:pt-0">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-sand-deep bg-sand">
                      {it.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-ink-muted">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium text-ink">{it.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        SKU {it.sku}
                        {it.optionLabel ? ` · ${it.optionLabel}` : null}
                        {it.colorLabel ? ` · ${it.colorLabel}` : null}
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">
                        Qty {it.quantity} × {formatInrFromPaise(it.unitPricePaise)}
                      </p>
                      {it.customerNotes?.trim() ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-md bg-sand/50 px-2 py-1.5 text-xs text-ink-muted">
                          <span className="font-medium text-ink">Buyer notes:</span>{" "}
                          {it.customerNotes}
                        </p>
                      ) : null}
                      {it.customerImageUrl ? (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-ink-muted">Personalisation image</p>
                          <a
                            href={it.customerImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-accent hover:underline"
                          >
                            Open full size
                          </a>
                          <div className="relative mt-1 inline-block h-20 w-20 overflow-hidden rounded border border-sand-deep">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={it.customerImageUrl}
                              alt="Customer upload"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-2">
                        <Link
                          href={`/product/${it.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          View on storefront →
                        </Link>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-sm font-medium text-ink">
                      {formatInrFromPaise(it.unitPricePaise * it.quantity)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 border-t border-sand-deep pt-4 text-right text-sm">
                <p className="text-ink-muted">
                  Subtotal{" "}
                  <span className="text-ink">{formatInrFromPaise(order.subtotalPaise)}</span>
                </p>
                <p className="text-ink-muted">
                  Shipping (at checkout){" "}
                  <span className="text-ink">
                    {formatInrFromPaise(order.shippingPaise ?? 0)}
                  </span>
                </p>
                <p className="font-display text-lg text-ink">
                  Total {formatInrFromPaise(order.totalPaise)}
                </p>
              </div>
            </section>

            {order.notes?.trim() ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-950">
                  Order notes
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950">{order.notes}</p>
              </section>
            ) : null}

            {order.status === "cancelled" ? (
              <section className="rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-900">
                  Cancellation
                </h3>
                <p className="mt-2 text-sm text-rose-900">
                  {order.orderCancelledAt
                    ? formatWhen(order.orderCancelledAt as string | Date)
                    : "—"}
                </p>
                {order.cancelReason ? (
                  <p className="mt-2 text-sm text-rose-900">
                    <span className="text-rose-800">Reason:</span> {order.cancelReason}
                  </p>
                ) : null}
              </section>
            ) : null}

            {sr && (sr.awb || sr.courierName || sr.status || sr.trackingUrl || sr.lastError) ? (
              <section className="rounded-xl border border-sand-deep bg-white p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Shiprocket / tracking
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  {sr.courierName ? (
                    <div>
                      <dt className="text-ink-muted">Courier</dt>
                      <dd className="text-ink">{String(sr.courierName)}</dd>
                    </div>
                  ) : null}
                  {sr.awb ? (
                    <div>
                      <dt className="text-ink-muted">AWB</dt>
                      <dd className="font-mono text-xs text-ink">{String(sr.awb)}</dd>
                    </div>
                  ) : null}
                  {sr.status ? (
                    <div>
                      <dt className="text-ink-muted">Shipment status</dt>
                      <dd className="capitalize text-ink">{String(sr.status)}</dd>
                    </div>
                  ) : null}
                  {sr.webhookStatus ? (
                    <div>
                      <dt className="text-ink-muted">Webhook status</dt>
                      <dd className="text-ink">{String(sr.webhookStatus)}</dd>
                    </div>
                  ) : null}
                  {typeof sr.totalShippingRupees === "number" ? (
                    <div>
                      <dt className="text-ink-muted">Shiprocket freight (rupees)</dt>
                      <dd className="text-ink">{sr.totalShippingRupees}</dd>
                    </div>
                  ) : null}
                  {sr.trackingUrl ? (
                    <div>
                      <a
                        href={String(sr.trackingUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        Open tracking URL
                      </a>
                    </div>
                  ) : null}
                  {sr.lastError ? (
                    <div>
                      <dt className="text-ink-muted">Last error</dt>
                      <dd className="text-xs text-rose-800">{String(sr.lastError)}</dd>
                    </div>
                  ) : null}
                </dl>
                {scans.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink-muted">Recent scans</p>
                    <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-xs text-ink-muted">
                      {scans.slice(-12).map((s, idx) => (
                        <li key={idx}>
                          {s.date ? <span className="text-ink">{s.date}</span> : null}{" "}
                          {s.activity}
                          {s.location ? ` · ${s.location}` : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : typeof order.shiprocketCourierId === "number" && order.shiprocketCourierId > 0 ? (
              <p className="text-xs text-ink-muted">
                Courier id at checkout:{" "}
                <span className="font-mono text-ink">{order.shiprocketCourierId}</span> (shipment
                may still be creating)
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

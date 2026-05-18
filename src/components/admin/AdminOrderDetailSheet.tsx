"use client";

import Link from "next/link";
import { useState } from "react";
import { formatInrFromPaise } from "@/lib/format";
import { orderLineTotalPaise } from "@/lib/order-line-total";
import { apiFetch } from "@/lib/api/fetch-client";
import type { AdminOrderFull } from "@/lib/admin-order-types";
import type { AdminPrintKind } from "@/components/admin/AdminOrderPrintOverlay";

type Props = {
  order: AdminOrderFull;
  onClose: () => void;
  onRequestPrint: (kind: AdminPrintKind) => void;
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

export function AdminOrderDetailSheet({ order, onClose, onRequestPrint }: Props) {
  const inv = order.invoiceNumber;
  const ship = order.shipping;
  const pm = order.paymentMethod ?? "online";
  const [proofUploading, setProofUploading] = useState<Record<number, boolean>>({});
  const [proofResults, setProofResults] = useState<Record<number, { url: string; proofUrl: string }>>({});
  const [proofErrors, setProofErrors] = useState<Record<number, string>>({});

  async function uploadProof(itemIdx: number, file: File) {
    setProofUploading((p) => ({ ...p, [itemIdx]: true }));
    setProofErrors((p) => { const n = { ...p }; delete n[itemIdx]; return n; });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/v1/admin/orders/${order._id}/items/${itemIdx}/proof`, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const j = (await res.json()) as { data?: { proofImageUrl?: string; proofUrl?: string }; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Upload failed");
      setProofResults((p) => ({ ...p, [itemIdx]: { url: j.data?.proofImageUrl ?? "", proofUrl: j.data?.proofUrl ?? "" } }));
    } catch (e) {
      setProofErrors((p) => ({ ...p, [itemIdx]: e instanceof Error ? e.message : "Upload failed" }));
    } finally {
      setProofUploading((p) => { const n = { ...p }; delete n[itemIdx]; return n; });
    }
  }
  const sr = order.shiprocket && typeof order.shiprocket === "object" ? order.shiprocket : null;
  const scans = Array.isArray(sr?.webhookScans)
    ? (sr!.webhookScans as Array<{ date?: string; activity?: string; location?: string }>)
    : [];
  const shipmentId =
    sr && typeof sr.shipmentId === "number" && sr.shipmentId > 0 ? sr.shipmentId : null;
  const [shiprocketLabelBusy, setShiprocketLabelBusy] = useState(false);

  async function openShiprocketLabelPdf() {
    if (!shipmentId) return;
    setShiprocketLabelBusy(true);
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/api/v1/admin/orders/${order._id}/shiprocket-label`,
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not open Shiprocket label");
    } finally {
      setShiprocketLabelBusy(false);
    }
  }

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
        <div className="flex shrink-0 flex-col gap-3 border-b border-sand-deep px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
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
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-sand-deep bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-accent"
              onClick={() => onRequestPrint("invoice")}
            >
              Print invoice
            </button>
            <button
              type="button"
              className="rounded-full border border-sand-deep bg-white px-3 py-1.5 text-sm font-medium text-ink hover:border-accent"
              onClick={() => onRequestPrint("label")}
            >
              Print posting label
            </button>
            <button
              type="button"
              className="rounded-full border border-sand-deep px-3 py-1.5 text-sm text-ink-muted hover:border-ink hover:text-ink"
              onClick={onClose}
            >
              Close
            </button>
          </div>
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
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Line items
                </h3>
                <a
                  href={`/api/admin/orders/${order._id}/files`}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  Download all files (ZIP)
                </a>
              </div>
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
                      {typeof it.giftWrapPaise === "number" && it.giftWrapPaise > 0 ? (
                        <p className="mt-2 text-xs font-medium text-accent">
                          Gift wrap {formatInrFromPaise(it.giftWrapPaise)} / unit × {it.quantity} ={" "}
                          {formatInrFromPaise(it.giftWrapPaise * it.quantity)}
                        </p>
                      ) : null}
                      {it.giftMessage?.trim() ? (
                        <p className="mt-2 whitespace-pre-wrap rounded-md bg-emerald-50/80 px-2 py-1.5 text-xs text-ink-muted">
                          <span className="font-medium text-ink">Gift message:</span> {it.giftMessage}
                        </p>
                      ) : null}
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
                      {it.customizationData &&
                      typeof it.customizationData === "object" &&
                      !Array.isArray(it.customizationData) &&
                      Object.keys(it.customizationData as object).length > 0 ? (
                        <div className="mt-3 rounded-lg border border-sand-deep bg-sand/20 p-3">
                          <p className="text-xs font-semibold text-ink">Customer personalisation</p>
                          <dl className="mt-2 space-y-2 text-xs">
                            {Object.entries(it.customizationData as Record<string, unknown>).map(
                              ([key, val]) => {
                                if (val === undefined || val === null || val === "") return null;
                                const display =
                                  Array.isArray(val) ? val.join(", ")
                                  : typeof val === "boolean" ?
                                    val ? "Yes"
                                    : "No"
                                  : String(val);
                                return (
                                  <div key={key} className="grid gap-0.5 sm:grid-cols-[8rem_1fr]">
                                    <dt className="font-medium capitalize text-ink-muted">
                                      {key.replace(/_/g, " ")}
                                    </dt>
                                    <dd className="break-all text-ink">{display}</dd>
                                  </div>
                                );
                              },
                            )}
                          </dl>
                          {it.customizationFiles &&
                          typeof it.customizationFiles === "object" &&
                          !Array.isArray(it.customizationFiles) ? (
                            <ul className="mt-3 space-y-2 border-t border-sand-deep/80 pt-3">
                              {Object.entries(
                                it.customizationFiles as Record<
                                  string,
                                  | { url?: string; filename?: string }
                                  | Array<{ url?: string; filename?: string }>
                                >,
                              ).flatMap(([key, val]) => {
                                const list = Array.isArray(val) ? val : [val];
                                return list.map((m, mi) =>
                                  m?.url ? (
                                    <li
                                      key={`${key}-${mi}`}
                                      className="flex flex-wrap items-center gap-2 text-xs"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={m.url}
                                        alt=""
                                        className="h-12 w-12 rounded border border-sand-deep object-cover"
                                      />
                                      <span className="text-ink-muted">{key.replace(/_/g, " ")}:</span>
                                      <a
                                        href={m.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-accent hover:underline"
                                      >
                                        {m.filename || "Open file"}
                                      </a>
                                    </li>
                                  ) : null,
                                );
                              })}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-2">
                        <Link
                          href={`/products/${it.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          View on storefront →
                        </Link>
                      </div>

                      {/* Proof upload section */}
                      {(it.customizationData && Object.keys(it.customizationData).length > 0) ||
                      it.customizationFiles ||
                      it.customerImageUrl ? (
                        <div className="mt-3 rounded-lg border border-sand-deep bg-sand/30 p-3 text-xs">
                          <p className="font-semibold text-ink mb-2">Design proof</p>

                          {it.proofStatus === "approved" ? (
                            <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-green-800 font-medium">
                              ✓ Approved by customer
                            </span>
                          ) : it.proofStatus === "rejected" ? (
                            <div>
                              <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-red-800 font-medium">
                                ✗ Customer requested changes
                              </span>
                              {it.proofRejectionNote ? (
                                <p className="mt-1 text-ink-muted whitespace-pre-wrap">{it.proofRejectionNote}</p>
                              ) : null}
                            </div>
                          ) : it.proofStatus === "sent" || proofResults[i] ? (
                            <div>
                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 font-medium mb-2">
                                Awaiting customer approval
                              </span>
                              {(proofResults[i]?.proofUrl || it.proofToken) ? (
                                <p className="mt-1">
                                  <a
                                    href={proofResults[i]?.proofUrl ?? `/proof/${it.proofToken}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline break-all"
                                  >
                                    {proofResults[i]?.proofUrl ?? `/proof/${it.proofToken}`}
                                  </a>
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="text-ink-muted">No proof uploaded yet.</p>
                          )}

                          {proofErrors[i] ? (
                            <p className="mt-1 text-red-600">{proofErrors[i]}</p>
                          ) : null}

                          {it.proofStatus !== "approved" ? (
                            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-sand-deep bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-sand transition-colors">
                              {proofUploading[i] ? "Uploading…" : it.proofStatus === "sent" || proofResults[i] ? "Re-upload proof" : "Upload proof"}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={proofUploading[i]}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void uploadProof(i, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right text-sm font-medium text-ink">
                      {formatInrFromPaise(orderLineTotalPaise(it))}
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

            {sr &&
            (sr.awb ||
              sr.courierName ||
              sr.status ||
              sr.trackingUrl ||
              sr.lastError ||
              shipmentId) ? (
              <section className="rounded-xl border border-sand-deep bg-white p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Shiprocket / tracking
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  {shipmentId ? (
                    <div>
                      <dt className="text-ink-muted">Shipment id</dt>
                      <dd className="font-mono text-xs text-ink">{shipmentId}</dd>
                    </div>
                  ) : null}
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
                  {shipmentId ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        disabled={shiprocketLabelBusy}
                        className="text-left text-sm font-medium text-accent hover:underline disabled:opacity-50"
                        onClick={() => void openShiprocketLabelPdf()}
                      >
                        {shiprocketLabelBusy
                          ? "Opening Shiprocket label…"
                          : "Open Shiprocket shipping label (PDF)"}
                      </button>
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

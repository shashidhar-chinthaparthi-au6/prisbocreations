"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch-client";
import { formatInrFromPaise } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import { AdminOrderDetailSheet } from "@/components/admin/AdminOrderDetailSheet";
import type { AdminOrderFull } from "@/components/admin/admin-order-types";

const statuses = ["pending", "paid", "processing", "shipped", "cancelled"] as const;
const statusesWithoutCancelled = statuses.filter((s) => s !== "cancelled");

function formatPlaced(iso?: string | Date | null) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function asAdminOrder(raw: unknown): AdminOrderFull {
  const o = raw as Record<string, unknown>;
  const shipping = o.shipping as AdminOrderFull["shipping"];
  const items = Array.isArray(o.items) ? (o.items as AdminOrderFull["items"]) : [];
  return {
    _id: String(o._id ?? ""),
    invoiceNumber: typeof o.invoiceNumber === "string" ? o.invoiceNumber : undefined,
    status: String(o.status ?? ""),
    totalPaise: Number(o.totalPaise) || 0,
    subtotalPaise: Number(o.subtotalPaise) || 0,
    shippingPaise: typeof o.shippingPaise === "number" ? o.shippingPaise : 0,
    currency: typeof o.currency === "string" ? o.currency : "INR",
    createdAt: o.createdAt ? String(o.createdAt) : undefined,
    updatedAt: o.updatedAt ? String(o.updatedAt) : undefined,
    userId: o.userId ? String(o.userId) : undefined,
    guestEmail: typeof o.guestEmail === "string" ? o.guestEmail : undefined,
    customerEmail: typeof o.customerEmail === "string" ? o.customerEmail : undefined,
    paymentMethod: typeof o.paymentMethod === "string" ? o.paymentMethod : undefined,
    razorpayOrderId: typeof o.razorpayOrderId === "string" ? o.razorpayOrderId : undefined,
    notes: typeof o.notes === "string" ? o.notes : undefined,
    cancelReason: typeof o.cancelReason === "string" ? o.cancelReason : undefined,
    orderCancelledAt: o.orderCancelledAt as string | Date | undefined,
    shiprocketCourierId:
      typeof o.shiprocketCourierId === "number" ? o.shiprocketCourierId : undefined,
    shipping,
    items,
    shiprocket:
      o.shiprocket && typeof o.shiprocket === "object"
        ? (o.shiprocket as Record<string, unknown>)
        : null,
  };
}

export function AdminOrdersClient() {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<AdminOrderFull | null>(null);
  const [cancelModal, setCancelModal] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("Cancelled by admin");
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const raw = await apiFetch<unknown[]>("/api/v1/admin/orders");
      return raw.map(asAdminOrder);
    },
  });

  async function setStatus(id: string, status: (typeof statuses)[number]) {
    setUpdatingId(id);
    try {
      await apiFetch(`/api/v1/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmAdminCancel() {
    if (!cancelModal) return;
    setCancelErr(null);
    setUpdatingId(cancelModal.id);
    try {
      const reason = cancelReason.trim() || "Cancelled by admin";
      if (reason.length < 3) {
        setCancelErr("Reason must be at least 3 characters.");
        return;
      }
      await apiFetch(`/api/v1/admin/orders/${cancelModal.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled", cancelReason: reason }),
      });
      setCancelModal(null);
      setCancelReason("Cancelled by admin");
      setDetailOrder(null);
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e) {
      setCancelErr(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-sand-deep bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-sand-deep bg-sand/50 text-xs uppercase text-ink-muted">
            <tr>
              <th className="px-4 py-3">Invoice / ref</th>
              <th className="px-4 py-3">Placed</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pay</th>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6">
                  <span className="inline-flex items-center gap-2 text-ink-muted">
                    <Spinner size="sm" />
                    Loading…
                  </span>
                </td>
              </tr>
            ) : null}
            {orders?.map((o) => (
              <tr key={o._id} className="border-b border-sand-deep/80">
                <td className="px-4 py-3 font-mono text-xs">
                  <button
                    type="button"
                    className="text-left hover:text-accent"
                    onClick={() => setDetailOrder(o)}
                  >
                    {o.invoiceNumber ? (
                      <span className="block font-semibold text-ink">{o.invoiceNumber}</span>
                    ) : null}
                    <span className="mt-0.5 block text-[10px] text-ink-muted">{o._id}</span>
                    <span className="mt-1 block text-[10px] font-medium text-accent">
                      View invoice details →
                    </span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">
                  {formatPlaced(o.createdAt)}
                </td>
                <td className="max-w-[200px] px-4 py-3 text-xs">
                  {o.customerEmail ? (
                    <span className="break-all text-ink">{o.customerEmail}</span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                  {o.userId ? (
                    <span className="mt-1 block truncate font-mono text-[10px] text-ink-muted">
                      User {o.userId}
                    </span>
                  ) : (
                    <span className="mt-1 block text-[10px] text-ink-muted">Guest</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums text-ink-muted">
                  {o.items?.length ?? 0}
                </td>
                <td className="px-4 py-3">{formatInrFromPaise(o.totalPaise)}</td>
                <td className="px-4 py-3 text-xs capitalize text-ink-muted">
                  {o.paymentMethod === "cod" ? "COD" : "Online"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">
                  {o.shiprocket &&
                  typeof o.shiprocket === "object" &&
                  (o.shiprocket as { awb?: string }).awb ? (
                    <div className="max-w-[200px] space-y-1">
                      {(o.shiprocket as { courierName?: string }).courierName ? (
                        <p className="truncate text-ink">
                          {(o.shiprocket as { courierName: string }).courierName}
                        </p>
                      ) : null}
                      <p className="font-mono text-[10px] text-ink">
                        {(o.shiprocket as { awb: string }).awb}
                      </p>
                      {(o.shiprocket as { trackingUrl?: string }).trackingUrl ? (
                        <a
                          href={(o.shiprocket as { trackingUrl: string }).trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          Track
                        </a>
                      ) : null}
                    </div>
                  ) : (o.shiprocket as { status?: string } | null)?.status ? (
                    <span className="capitalize">
                      {(o.shiprocket as { status: string }).status}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2">
                    {updatingId === o._id ? <Spinner size="sm" className="text-ink-muted" /> : null}
                    {o.status === "cancelled" ? (
                      <span className="text-xs font-medium capitalize text-ink-muted">
                        Cancelled
                      </span>
                    ) : (
                      <>
                        <select
                          disabled={updatingId === o._id || Boolean(cancelModal)}
                          className="rounded border border-sand-deep px-2 py-1 text-xs disabled:opacity-60"
                          value={o.status}
                          onChange={(e) =>
                            setStatus(o._id, e.target.value as (typeof statuses)[number])
                          }
                        >
                          {statusesWithoutCancelled.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={updatingId === o._id || Boolean(cancelModal)}
                          className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-50"
                          onClick={() => {
                            setCancelErr(null);
                            setCancelReason("Cancelled by admin");
                            setCancelModal({
                              id: o._id,
                              label: o.invoiceNumber ? `${o.invoiceNumber} · ${o._id}` : o._id,
                            });
                          }}
                        >
                          Cancel…
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailOrder ? (
        <AdminOrderDetailSheet order={detailOrder} onClose={() => setDetailOrder(null)} />
      ) : null}

      {cancelModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-cancel-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-sand-deep bg-white p-6 shadow-xl">
            <h2 id="admin-cancel-title" className="font-display text-lg text-ink">
              Cancel this order?
            </h2>
            <p className="mt-2 font-mono text-xs text-ink-muted">{cancelModal.label}</p>
            <p className="mt-3 text-sm text-ink-muted">
              This will mark the order cancelled, attempt to cancel the Shiprocket shipment if one
              exists, and restore stock if the order was paid or COD-placed (processing).
            </p>
            <label className="mt-4 block text-sm">
              <span className="text-ink-muted">Reason (shown on the order)</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 text-sm"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={2000}
              />
            </label>
            {cancelErr ? (
              <p className="mt-2 text-sm text-rose" role="alert">
                {cancelErr}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm text-ink-muted hover:text-ink"
                disabled={updatingId === cancelModal.id}
                onClick={() => {
                  setCancelModal(null);
                  setCancelErr(null);
                }}
              >
                Don&apos;t cancel
              </button>
              <button
                type="button"
                disabled={updatingId === cancelModal.id}
                className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                onClick={() => void confirmAdminCancel()}
              >
                {updatingId === cancelModal.id ? <Spinner size="sm" className="text-white" /> : null}
                Yes, cancel order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

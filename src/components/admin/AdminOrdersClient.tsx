"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch-client";
import { formatInrFromPaise } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";

type OrderRow = {
  _id: string;
  invoiceNumber?: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  userId?: string;
  guestEmail?: string;
  paymentMethod?: string;
  shiprocket?: {
    awb?: string;
    courierName?: string;
    freightChargeRupees?: number;
    totalShippingRupees?: number;
    status?: string;
    trackingUrl?: string;
    lastError?: string;
  } | null;
};

const statuses = ["pending", "paid", "processing", "shipped", "cancelled"] as const;
const statusesWithoutCancelled = statuses.filter((s) => s !== "cancelled");

export function AdminOrdersClient() {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("Cancelled by admin");
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => apiFetch<OrderRow[]>("/api/v1/admin/orders"),
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
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e) {
      setCancelErr(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-sand-deep bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-sand-deep bg-sand/50 text-xs uppercase text-ink-muted">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Pay</th>
            <th className="px-4 py-3">Shipment</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} className="px-4 py-6">
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
                <div>{o._id}</div>
                {o.invoiceNumber ? (
                  <div className="mt-0.5 text-[10px] font-semibold text-ink-muted">{o.invoiceNumber}</div>
                ) : null}
              </td>
              <td className="px-4 py-3 text-xs">
                {o.userId ? (
                  <span className="font-mono">{o.userId}</span>
                ) : (
                  <span className="text-ink-muted">Guest · {o.guestEmail ?? "—"}</span>
                )}
              </td>
              <td className="px-4 py-3">{formatInrFromPaise(o.totalPaise)}</td>
              <td className="px-4 py-3 text-xs capitalize text-ink-muted">
                {o.paymentMethod === "cod" ? "COD" : "Online"}
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted">
                {o.shiprocket?.awb || o.shiprocket?.courierName || o.shiprocket?.status ? (
                  <div className="max-w-[200px] space-y-1">
                    {o.shiprocket.courierName ? (
                      <p className="truncate text-ink">{o.shiprocket.courierName}</p>
                    ) : null}
                    {o.shiprocket.awb ? (
                      <p className="font-mono text-[10px] text-ink">{o.shiprocket.awb}</p>
                    ) : (
                      <p className="capitalize">{o.shiprocket.status ?? "—"}</p>
                    )}
                    {typeof o.shiprocket.totalShippingRupees === "number" ? (
                      <p>
                        Ship:{" "}
                        {formatInrFromPaise(Math.round(o.shiprocket.totalShippingRupees * 100))}
                      </p>
                    ) : typeof o.shiprocket.freightChargeRupees === "number" ? (
                      <p>
                        Freight:{" "}
                        {formatInrFromPaise(Math.round(o.shiprocket.freightChargeRupees * 100))}
                      </p>
                    ) : null}
                    {o.shiprocket.trackingUrl ? (
                      <a
                        href={o.shiprocket.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        Track
                      </a>
                    ) : null}
                    {o.shiprocket.lastError ? (
                      <p className="text-[10px] text-rose">{o.shiprocket.lastError.slice(0, 80)}</p>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-2">
                  {updatingId === o._id ? <Spinner size="sm" className="text-ink-muted" /> : null}
                  {o.status === "cancelled" ? (
                    <span className="text-xs font-medium capitalize text-ink-muted">Cancelled</span>
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
                        Cancel order…
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
    </div>
  );
}

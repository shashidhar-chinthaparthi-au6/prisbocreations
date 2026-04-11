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

export function AdminOrdersClient() {
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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
                <div className="flex items-center gap-2">
                  {updatingId === o._id ? <Spinner size="sm" className="text-ink-muted" /> : null}
                  <select
                    disabled={updatingId === o._id}
                    className="rounded border border-sand-deep px-2 py-1 text-xs disabled:opacity-60"
                    value={o.status}
                    onChange={(e) =>
                      setStatus(o._id, e.target.value as (typeof statuses)[number])
                    }
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

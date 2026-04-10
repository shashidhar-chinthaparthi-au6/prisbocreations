"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/fetch-client";
import { formatInrFromPaise } from "@/lib/format";

type OrderRow = {
  _id: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  userId?: string;
  guestEmail?: string;
  paymentMethod?: string;
};

const statuses = ["pending", "paid", "processing", "shipped", "cancelled"] as const;

export function AdminOrdersClient() {
  const qc = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => apiFetch<OrderRow[]>("/api/v1/admin/orders"),
  });

  async function setStatus(id: string, status: (typeof statuses)[number]) {
    await apiFetch(`/api/v1/admin/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    await qc.invalidateQueries({ queryKey: ["admin-orders"] });
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
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-ink-muted">
                Loading…
              </td>
            </tr>
          ) : null}
          {orders?.map((o) => (
            <tr key={o._id} className="border-b border-sand-deep/80">
              <td className="px-4 py-3 font-mono text-xs">{o._id}</td>
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
              <td className="px-4 py-3">
                <select
                  className="rounded border border-sand-deep px-2 py-1 text-xs"
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { formatInrFromPaise } from "@/lib/format";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { ReorderButton } from "@/components/account/ReorderButton";
import { StoreEmptyState } from "@/components/ui/StoreEmptyState";

export type AccountOrderRow = {
  id: string;
  invoiceNumber?: string;
  createdAt: string;
  status: string;
  paymentMethod?: string;
  totalPaise: number;
  itemImages: string[];
  itemCount: number;
  scans: { activity?: string }[];
  /** True when tracking stage is DELIVERED (reorder allowed). */
  delivered: boolean;
  reorderItems: Array<{
    productId: string;
    slug: string;
    name: string;
    unitPricePaise: number;
    imageUrl?: string;
    optionKey?: string;
    optionLabel?: string;
    colorKey?: string;
    colorLabel?: string;
    customerImageUrl?: string;
    customerNotes?: string;
    giftWrapPaise?: number;
    giftMessage?: string;
  }>;
};

function Thumbs({ urls }: { urls: string[] }) {
  const show = urls.slice(0, 4);
  const more = urls.length - show.length;
  return (
    <div className="flex items-center gap-1">
      {show.map((u, i) => (
        <div key={i} className="h-10 w-10 overflow-hidden rounded-md bg-[var(--brand-sand,#F5F0E8)]">
          {u ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
      ))}
      {more > 0 ? <span className="text-xs text-[var(--brand-muted)]">+{more} more</span> : null}
    </div>
  );
}

export function AccountOrdersView({ orders }: { orders: AccountOrderRow[] }) {
  if (!orders.length) {
    return (
      <StoreEmptyState
        emoji="📦"
        title="No orders yet"
        description="When you shop with us, your orders and tracking will appear here."
        primary={{ label: "Browse products →", href: "/products" }}
      />
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--brand-border)] text-xs uppercase text-[var(--brand-muted)]">
                <th className="px-4 py-3 font-semibold">Order #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const inv = o.invoiceNumber ?? o.id;
                const cod = o.paymentMethod === "cod";
                const showTrack =
                  o.status === "shipped" || o.status === "processing" || o.scans.length > 0;
                const showReorder = o.delivered && o.reorderItems.length > 0;
                return (
                  <tr key={o.id} className="border-b border-[var(--brand-border)] last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/account/orders/${o.id}`}
                        className="font-mono text-xs font-medium text-[var(--brand-amber)] hover:underline"
                      >
                        {inv}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[var(--brand-muted)]">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Thumbs urls={o.itemImages} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--brand-ink)]">{formatInrFromPaise(o.totalPaise)}</span>
                      <p className="text-[11px] text-[var(--brand-muted)]">{cod ? "COD" : "Paid online"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge orderStatus={o.status} scanActivities={o.scans} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {showTrack ? (
                          <Link
                            href={`/account/orders/${o.id}#tracking`}
                            className="text-xs font-medium text-[var(--brand-amber)] hover:underline"
                          >
                            Track →
                          </Link>
                        ) : null}
                        <Link
                          href={`/account/orders/${o.id}`}
                          className="text-xs font-medium text-[var(--brand-muted)] hover:text-[var(--brand-ink)]"
                        >
                          View details
                        </Link>
                        {showReorder ? <ReorderButton items={o.reorderItems} /> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="space-y-3 md:hidden">
        {orders.map((o) => {
          const inv = o.invoiceNumber ?? o.id;
          const cod = o.paymentMethod === "cod";
          const showTrack =
            o.status === "shipped" || o.status === "processing" || o.scans.length > 0;
          const showReorder = o.delivered && o.reorderItems.length > 0;
          return (
            <li
              key={o.id}
              className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-2">
                <Link href={`/account/orders/${o.id}`} className="font-mono text-sm font-medium text-[var(--brand-amber)]">
                  #{inv}
                </Link>
                <OrderStatusBadge orderStatus={o.status} scanActivities={o.scans} />
              </div>
              <p className="mt-1 text-xs text-[var(--brand-muted)]">
                {new Date(o.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <div className="mt-3">
                <Thumbs urls={o.itemImages} />
              </div>
              <p className="mt-3 text-sm text-[var(--brand-ink)]">
                {formatInrFromPaise(o.totalPaise)}{" "}
                <span className="text-xs text-[var(--brand-muted)]">· {cod ? "COD" : "Paid online"}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {showTrack ? (
                  <Link
                    href={`/account/orders/${o.id}#tracking`}
                    className="rounded-full bg-[var(--brand-amber)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Track order →
                  </Link>
                ) : null}
                <Link
                  href={`/account/orders/${o.id}`}
                  className="rounded-full border border-[var(--brand-border)] px-3 py-1.5 text-xs font-medium"
                >
                  View details
                </Link>
                {showReorder ? <ReorderButton items={o.reorderItems} /> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

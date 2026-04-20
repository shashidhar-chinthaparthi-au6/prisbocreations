"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch-client";
import type { TrackPayload } from "@/types/track-payload";
import { TrackingTimeline } from "@/components/tracking/TrackingTimeline";
import { TrackingSkeletonLoader } from "@/components/tracking/TrackingSkeletonLoader";
import { OrderSummaryCard } from "@/components/tracking/OrderSummaryCard";
import type { ComponentProps } from "react";
import { ReorderButton } from "@/components/account/ReorderButton";

type ReorderLine = ComponentProps<typeof ReorderButton>["items"][number];

export function AccountOrderDetailClient({
  orderId,
  initialReorderItems,
}: {
  orderId: string;
  initialReorderItems: ReorderLine[];
}) {
  const [data, setData] = useState<TrackPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await apiFetch<TrackPayload>(`/api/account/orders/${orderId}/tracking`);
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (err) {
    return (
      <p className="text-sm text-red-700">
        {err}{" "}
        <Link href="/account/orders" className="underline">
          Back to orders
        </Link>
      </p>
    );
  }

  if (!data) {
    return <TrackingSkeletonLoader />;
  }

  const paidOnline = data.paymentMethod !== "cod";
  const paymentLabel = paidOnline
    ? data.status === "pending"
      ? "Payment pending"
      : "Paid online"
    : "Cash on delivery";

  const showReorder = data.currentStage === "DELIVERED" && initialReorderItems.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/orders" className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-amber)]">
          ← Orders
        </Link>
        <h1 className="mt-2 font-display text-2xl text-[var(--brand-ink)]">Order #{data.orderNumber}</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Placed{" "}
          {new Date(data.placedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: paidOnline && data.status !== "pending" ? "#ECFDF5" : "#FEF3C7",
              color: paidOnline && data.status !== "pending" ? "#065F46" : "#92400E",
            }}
          >
            {paymentLabel}
          </span>
          {showReorder ? <ReorderButton items={initialReorderItems} /> : null}
          <a
            href={`/api/account/orders/${orderId}/invoice`}
            className="rounded-full border border-[var(--brand-border)] px-3 py-1.5 text-xs font-medium text-[var(--brand-ink)] hover:border-[var(--brand-amber)]"
          >
            Download invoice (PDF)
          </a>
        </div>
      </div>

      {data.lastFetchAttemptFailed ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
          Live carrier data is temporarily unavailable. Showing saved tracking (~{data.cacheAgeHours}h ago).
        </p>
      ) : null}

      <OrderSummaryCard data={data} addressMode="account" />

      <section id="tracking">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">Tracking</h2>
        <div className="mt-4">
          <TrackingTimeline
            currentStage={data.currentStage}
            events={data.events}
            estimatedDelivery={data.estimatedDelivery}
          />
        </div>
      </section>

      <p className="text-sm text-[var(--brand-muted)]">
        Guest link:{" "}
        <Link href={`/track?order=${encodeURIComponent(data.orderNumber)}`} className="text-[var(--brand-amber)] underline">
          Share tracking page
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch-client";
import { resolveCustomerTrackingUrl, shiprocketAggregateTrackingUrl } from "@/lib/courier-tracking-url";
import { formatInrFromPaise } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";

type LookupShiprocket = {
  status?: string;
  awb?: string;
  trackingUrl?: string;
  courierName?: string;
  webhookStatus?: string;
  lastWebhookAt?: string;
  freightChargeRupees?: number;
  codChargeRupees?: number;
  totalShippingRupees?: number;
};

type LookupOrder = {
  _id: string;
  invoiceNumber?: string;
  status: string;
  paymentMethod?: string;
  totalPaise: number;
  subtotalPaise?: number;
  shippingPaise?: number;
  createdAt?: string;
  shiprocket?: LookupShiprocket | null;
};

function TrackDeliverySummary({ order }: { order: LookupOrder }) {
  const sr = order.shiprocket;
  if (!sr) return null;
  const hasAny =
    Boolean(sr.status) ||
    Boolean(sr.courierName) ||
    Boolean(sr.awb?.trim()) ||
    Boolean(sr.trackingUrl?.trim()) ||
    Boolean(sr.webhookStatus);
  if (!hasAny) return null;

  const awb = typeof sr.awb === "string" ? sr.awb.trim() : "";
  const courier = typeof sr.courierName === "string" ? sr.courierName : "";
  const storedUrl = typeof sr.trackingUrl === "string" ? sr.trackingUrl.trim() : "";
  const primaryHref =
    awb !== ""
      ? resolveCustomerTrackingUrl(awb, { storedUrl, courierName: courier || undefined })
      : storedUrl.startsWith("http")
        ? storedUrl
        : "";
  const canTrack = primaryHref.startsWith("http");
  const mirror =
    awb && canTrack && !primaryHref.includes("shiprocket.co/tracking")
      ? shiprocketAggregateTrackingUrl(awb)
      : "";

  return (
    <div className="mt-4 border-t border-sand-deep pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Delivery &amp; tracking</h3>
      {sr.status ? (
        <p className="mt-2 text-sm capitalize text-ink-muted">
          Shipment: <span className="text-ink">{sr.status.replace(/_/g, " ")}</span>
        </p>
      ) : null}
      {courier ? (
        <p className="mt-1 text-sm text-ink-muted">
          Courier: <span className="text-ink">{courier}</span>
        </p>
      ) : null}
      {awb ? (
        <p className="mt-2 font-mono text-sm text-ink">
          <span className="text-ink-muted">AWB:</span> <span className="font-semibold">{awb}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-amber-950">
          AWB not on file yet — open the full order page after pickup, or check your email.
        </p>
      )}
      {canTrack ? (
        <p className="mt-2">
          <a
            href={primaryHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-accent hover:underline"
          >
            Track package →
          </a>
        </p>
      ) : null}
      {mirror ? (
        <p className="mt-1">
          <a
            href={mirror}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-muted underline hover:text-accent"
          >
            Open on Shiprocket tracking
          </a>
        </p>
      ) : null}
      {sr.webhookStatus ? (
        <p className="mt-2 text-xs text-ink-muted">
          Last carrier update: <span className="font-medium text-ink">{sr.webhookStatus}</span>
          {sr.lastWebhookAt ? (
            <span className="ml-1">· {new Date(sr.lastWebhookAt).toLocaleString("en-IN")}</span>
          ) : null}
        </p>
      ) : null}
      {typeof sr.freightChargeRupees === "number" ? (
        <ul className="mt-2 space-y-1 text-xs text-ink-muted">
          <li>
            Freight:{" "}
            <span className="font-medium text-ink">
              {formatInrFromPaise(Math.round(sr.freightChargeRupees * 100))}
            </span>
          </li>
          {typeof sr.codChargeRupees === "number" && sr.codChargeRupees > 0 ? (
            <li>
              COD charges:{" "}
              <span className="font-medium text-ink">
                {formatInrFromPaise(Math.round(sr.codChargeRupees * 100))}
              </span>
            </li>
          ) : null}
          {typeof sr.totalShippingRupees === "number" ? (
            <li>
              Shipping total (est.):{" "}
              <span className="font-medium text-ink">
                {formatInrFromPaise(Math.round(sr.totalShippingRupees * 100))}
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

export function TrackOrderForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [found, setFound] = useState<LookupOrder | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setFound(null);
    setBusy(true);
    try {
      const order = await apiFetch<LookupOrder>("/api/v1/orders/lookup", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim(), email: email.trim() }),
      });
      setFound(order);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not find an order");
    } finally {
      setBusy(false);
    }
  }

  function openFullOrder() {
    if (!found) return;
    const q = new URLSearchParams();
    q.set("email", email.trim());
    router.push(`/orders/${found._id}?${q.toString()}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
        <h1 className="font-display text-2xl text-ink">Track order</h1>
        <p className="text-sm text-ink-muted">
          Enter the <strong>invoice number</strong> (e.g. PCB-20260411-ABC123) from your confirmation email, or
          your <strong>order id</strong>, together with the <strong>email</strong> used at checkout.
        </p>
        <label className="block text-sm">
          <span className="text-ink-muted">Invoice # or order id</span>
          <input
            className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2 font-mono text-sm"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="PCB-20260411-… or 674a…"
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="text-ink-muted">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        {err ? (
          <p className="text-sm text-rose" role="alert">
            {err}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-60"
        >
          {busy ? (
            <>
              <Spinner size="sm" className="text-white" />
              Looking up…
            </>
          ) : (
            "Find order"
          )}
        </button>
      </form>

      {found ? (
        <div className="space-y-4 rounded-2xl border border-sand-deep bg-sand/20 p-6">
          <h2 className="font-display text-lg text-ink">Order found</h2>
          <dl className="space-y-2 text-sm">
            {found.invoiceNumber ? (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Invoice</dt>
                <dd className="font-mono text-ink">{found.invoiceNumber}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Status</dt>
              <dd className="capitalize text-ink">{found.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Total</dt>
              <dd className="font-medium text-ink">{formatInrFromPaise(found.totalPaise)}</dd>
            </div>
          </dl>
          <TrackDeliverySummary order={found} />
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={openFullOrder}
              className="rounded-full border border-sand-deep bg-white px-4 py-2 text-sm font-medium text-ink hover:border-accent"
            >
              Open order &amp; invoice
            </button>
            <Link href="/categories" className="rounded-full px-4 py-2 text-sm text-accent hover:underline">
              Continue shopping
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

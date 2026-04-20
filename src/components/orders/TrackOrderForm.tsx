"use client";

import { useEffect, useState } from "react";
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

const WA_OPTIN_KEY = "prisbo_whatsapp_updates_optin";

function OrderStatusVisual({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const cancelled = normalized === "cancelled";
  const steps = [
    { key: "placed", label: "Placed" },
    { key: "paid", label: "Paid" },
    { key: "making", label: "Making" },
    { key: "shipped", label: "Shipped" },
  ] as const;
  const idx = cancelled
    ? -1
    : normalized === "shipped"
      ? 3
      : normalized === "processing"
        ? 2
        : normalized === "paid"
          ? 1
          : 0;

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Order progress</h3>
      <ol className="mt-3 flex flex-wrap gap-2">
        {steps.map((s, i) => {
          const done = !cancelled && i < idx;
          const current = !cancelled && i === idx;
          return (
            <li
              key={s.key}
              className={`flex min-w-0 flex-1 basis-[45%] items-center gap-2 rounded-xl border px-3 py-2 text-xs sm:basis-0 sm:text-sm ${
                cancelled
                  ? "border-sand-deep bg-sand/30 text-ink-muted"
                  : done
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                    : current
                      ? "border-accent bg-accent/10 font-semibold text-ink"
                      : "border-sand-deep bg-white text-ink-muted"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  cancelled
                    ? "bg-sand-deep text-ink-muted"
                    : done
                      ? "bg-emerald-600 text-white"
                      : current
                        ? "bg-accent text-white"
                        : "bg-sand-deep text-ink-muted"
                }`}
              >
                {cancelled ? "—" : done ? "✓" : i + 1}
              </span>
              <span className="min-w-0 truncate">{s.label}</span>
            </li>
          );
        })}
      </ol>
      {cancelled ? (
        <p className="mt-2 text-xs text-rose">This order was cancelled.</p>
      ) : null}
    </div>
  );
}

function WhatsAppUpdatesRow({ invoiceLabel }: { invoiceLabel: string }) {
  const [on, setOn] = useState(false);
  const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_E164?.replace(/\D/g, "") ?? "";

  useEffect(() => {
    try {
      setOn(localStorage.getItem(WA_OPTIN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(next: boolean) {
    setOn(next);
    try {
      localStorage.setItem(WA_OPTIN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  const href =
    wa && on
      ? `https://wa.me/${wa}?text=${encodeURIComponent(
          `Hi Prisbo — I'd like WhatsApp updates for my order (${invoiceLabel}).`,
        )}`
      : "";

  return (
    <div className="mt-4 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-1 accent-accent"
        />
        <span>
          <span className="text-sm font-medium text-ink">Get updates on WhatsApp</span>
          <span className="mt-0.5 block text-xs text-ink-muted">
            Popular in India for delivery day-of reminders. We&apos;ll never spam you.
          </span>
        </span>
      </label>
      {on && wa ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Open WhatsApp chat
        </a>
      ) : on && !wa ? (
        <p className="mt-2 text-xs text-ink-muted">
          WhatsApp number not configured yet — ask support to enable{" "}
          <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_SUPPORT_WHATSAPP_E164</code>.
        </p>
      ) : null}
    </div>
  );
}

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
      const order = await apiFetch<LookupOrder>("/api/track", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: identifier.trim(),
          email: email.trim(),
        }),
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
            "Track my gift"
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
          <OrderStatusVisual status={found.status} />
          <WhatsAppUpdatesRow
            invoiceLabel={found.invoiceNumber?.trim() || found._id}
          />
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

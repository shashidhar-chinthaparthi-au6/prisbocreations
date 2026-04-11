import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { resolveCustomerTrackingUrl, shiprocketAggregateTrackingUrl } from "@/lib/courier-tracking-url";
import { isShiprocketConfigured } from "@/lib/shiprocket-config";
import { getOrderForGuest, getOrderForUser } from "@/lib/services/orderService";
import { formatInrFromPaise } from "@/lib/format";
import { OrderCancelPanel } from "@/components/orders/OrderCancelPanel";
import { RetryShipmentSyncButton } from "@/components/orders/RetryShipmentSyncButton";

/** Always read latest order from DB (webhooks update shiprocket fields). */
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; cod?: string; email?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const secret = process.env.JWT_SECRET;
  if (!secret) redirect("/login");

  await connectDb();
  const session = await getSession(secret);

  let order = session ? await getOrderForUser(id, session.sub) : null;
  if (!order && !session && sp.email?.trim()) {
    order = await getOrderForGuest(id, sp.email);
  }
  if (!order) {
    if (session) notFound();
    redirect(`/login?next=/orders/${id}`);
  }

  const invoiceQs = sp.email?.trim() ? `?email=${encodeURIComponent(sp.email.trim())}` : "";
  const invoiceHref = `/orders/${id}/invoice${invoiceQs}`;
  const invoiceNumber = (order as { invoiceNumber?: string }).invoiceNumber;
  const shippingPaise = (order as { shippingPaise?: number }).shippingPaise ?? 0;
  const canCancel = ["pending", "paid", "processing"].includes(order.status);
  const cancelReason = (order as { cancelReason?: string }).cancelReason;
  const shiprocketCourierId = (order as { shiprocketCourierId?: number }).shiprocketCourierId;
  const srRaw = (order as { shiprocket?: Record<string, unknown> | null }).shiprocket;
  const sr = srRaw && typeof srRaw === "object" ? srRaw : null;
  const srStatus = typeof sr?.status === "string" ? sr.status : "";
  const srAwb = typeof sr?.awb === "string" ? sr.awb : "";
  const srTrackingUrl = typeof sr?.trackingUrl === "string" ? sr.trackingUrl : "";
  const srFreight = typeof sr?.freightChargeRupees === "number" ? sr.freightChargeRupees : null;
  const srCod = typeof sr?.codChargeRupees === "number" ? sr.codChargeRupees : null;
  const srTotal = typeof sr?.totalShippingRupees === "number" ? sr.totalShippingRupees : null;
  const srCourier = typeof sr?.courierName === "string" ? sr.courierName : "";
  const srLastErr = typeof sr?.lastError === "string" ? sr.lastError : "";
  const srWebhookStatus = typeof sr?.webhookStatus === "string" ? sr.webhookStatus : "";
  const srScans = Array.isArray(sr?.webhookScans)
    ? (sr.webhookScans as Array<{ date?: string; activity?: string; location?: string }>)
    : [];
  const srHasWebhook = Boolean(srWebhookStatus || srScans.length || sr?.lastWebhookAt);
  const srHasRichContent = Boolean(
    srStatus || srAwb || srTrackingUrl || srLastErr || srHasWebhook,
  );
  const awaitingCarrier =
    order.status !== "cancelled" &&
    typeof shiprocketCourierId === "number" &&
    shiprocketCourierId > 0 &&
    (order.status === "processing" || order.status === "paid" || order.status === "shipped") &&
    !srHasRichContent;
  const showDeliveryTracking =
    order.status !== "cancelled" && (srHasRichContent || awaitingCarrier || (sr && Object.keys(sr).length > 0));
  const shiprocketEnvOk = isShiprocketConfigured();
  const guestEmailForSync = !session && sp.email?.trim() ? sp.email.trim() : "";
  const awbForTracking = srAwb.trim();
  const primaryTrackingHref =
    awbForTracking !== ""
      ? resolveCustomerTrackingUrl(awbForTracking, {
          storedUrl: srTrackingUrl || undefined,
          courierName: srCourier || undefined,
        })
      : srTrackingUrl.trim();
  const canOpenTrack =
    primaryTrackingHref.startsWith("http://") || primaryTrackingHref.startsWith("https://");
  const shiprocketMirrorHref =
    awbForTracking &&
    canOpenTrack &&
    !primaryTrackingHref.includes("shiprocket.co/tracking")
      ? shiprocketAggregateTrackingUrl(awbForTracking)
      : "";

  return (
    <div className="space-y-6">
      {sp.paid ? (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Payment received. Thank you — we&apos;ll prepare your order shortly.
        </p>
      ) : null}
      {sp.cod ||
      (order as { paymentMethod?: string }).paymentMethod === "cod" ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Cash on delivery — pay the rider in cash when your package arrives. Order status:{" "}
          <span className="capitalize">{order.status}</span>.
        </p>
      ) : null}
      {!session && sp.email ? (
        <p className="text-sm text-ink-muted">
          Guest order — save this link or{" "}
          <Link href="/register" className="text-accent hover:underline">
            create an account
          </Link>{" "}
          to track future orders.
        </p>
      ) : null}
      <div>
        <p className="text-sm text-ink-muted">
          <Link href="/orders" className="hover:text-accent">
            Orders
          </Link>{" "}
          / Order detail
        </p>
        <h1 className="mt-2 font-display text-2xl text-ink">Order {String(order._id)}</h1>
        {invoiceNumber ? (
          <p className="mt-1 font-mono text-sm text-ink-muted">
            Invoice <span className="text-ink">{invoiceNumber}</span>
          </p>
        ) : null}
        <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <span className="capitalize">Status: {order.status}</span>
          {(order as { paymentMethod?: string }).paymentMethod === "cod" ? (
            <span className="rounded-full bg-sand-deep px-2 py-0.5 text-xs font-medium text-ink">
              COD
            </span>
          ) : null}
          <Link href={invoiceHref} className="text-accent hover:underline">
            View invoice / print
          </Link>
        </p>
        {cancelReason ? (
          <p className="mt-2 text-sm text-rose-800">
            Cancelled
            {(order as { orderCancelledAt?: Date }).orderCancelledAt
              ? ` · ${new Date((order as { orderCancelledAt: Date }).orderCancelledAt).toLocaleString("en-IN")}`
              : ""}
            <br />
            <span className="text-ink-muted">Reason:</span> {cancelReason}
          </p>
        ) : null}
      </div>
      <div className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg text-ink">Items</h2>
        <ul className="mt-4 divide-y divide-sand-deep">
          {order.items.map((it, i) => {
            const item = it as typeof it & {
              customerImageUrl?: string;
              customerNotes?: string;
            };
            return (
              <li key={i} className="flex flex-col gap-2 border-b border-sand-deep/60 py-3 text-sm last:border-0 sm:flex-row sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {item.name} × {item.quantity}
                  </p>
                  {item.customerNotes?.trim() ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">
                      {item.customerNotes}
                    </p>
                  ) : null}
                  {item.customerImageUrl ? (
                    <div className="relative mt-2 inline-block h-24 w-24 overflow-hidden rounded-lg border border-sand-deep bg-sand">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.customerImageUrl}
                        alt="Customer reference"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 text-ink-muted sm:text-right">
                  {formatInrFromPaise(item.unitPricePaise * item.quantity)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-1 text-right text-sm">
          <p className="text-ink-muted">
            Subtotal <span className="text-ink">{formatInrFromPaise(order.subtotalPaise)}</span>
          </p>
          <p className="text-ink-muted">
            Delivery <span className="text-ink">{formatInrFromPaise(shippingPaise)}</span>
          </p>
          <p className="font-display text-xl text-ink">Total {formatInrFromPaise(order.totalPaise)}</p>
        </div>
      </div>
      {showDeliveryTracking ? (
        <div className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg text-ink">Delivery &amp; tracking</h2>
          {awaitingCarrier ? (
            <div className="mt-2 space-y-2">
              {shiprocketEnvOk ? (
                <p className="text-sm text-ink-muted">
                  Your order includes a courier choice. AWB and tracking appear here as soon as
                  Shiprocket has created the shipment. If you still see this after checkout, use the
                  button below once — the page will refresh with courier details.
                </p>
              ) : (
                <p className="text-sm text-amber-900">
                  Courier quotes were saved at checkout, but the shop&apos;s Shiprocket connection is
                  not active on the server (missing API env). AWB cannot be created until that is fixed;
                  contact the store if this persists.
                </p>
              )}
              {shiprocketEnvOk ? (
                <RetryShipmentSyncButton
                  orderId={id}
                  guestEmail={guestEmailForSync || undefined}
                />
              ) : null}
            </div>
          ) : null}
          {srHasRichContent ? (
            <>
              <p className="mt-2 text-sm capitalize text-ink-muted">
                Shipment status: {srStatus || "—"}
              </p>
              {srCourier ? (
                <p className="mt-1 text-sm text-ink-muted">
                  Courier: <span className="text-ink">{srCourier}</span>
                </p>
              ) : null}
              {awbForTracking || canOpenTrack ? (
                <div className="mt-3 rounded-xl border border-accent/25 bg-accent/5 px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Tracking number &amp; link
                  </p>
                  {awbForTracking ? (
                    <p className="mt-1 font-mono text-sm text-ink">
                      <span className="text-ink-muted">AWB:</span>{" "}
                      <span className="font-semibold">{awbForTracking}</span>
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-amber-950">
                      No AWB yet — the courier may assign it after manifest. Refresh later or check the
                      tracking link if shown.
                    </p>
                  )}
                  {canOpenTrack ? (
                    <p className="mt-2">
                      <a
                        href={primaryTrackingHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-accent hover:underline"
                      >
                        Track package →
                      </a>
                    </p>
                  ) : null}
                  {shiprocketMirrorHref ? (
                    <p className="mt-1">
                      <a
                        href={shiprocketMirrorHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ink-muted underline hover:text-accent"
                      >
                        Open on Shiprocket tracking
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {srWebhookStatus ||
              srHasWebhook ||
              srTrackingUrl ||
              srAwb ? (
                <div className="mt-3 rounded-xl border border-sand-deep bg-sand/30 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Live tracking
                  </p>
                  {srWebhookStatus ? (
                    <p className="mt-1 text-sm text-ink">
                      Carrier status: <span className="font-medium">{srWebhookStatus}</span>
                      {sr?.lastWebhookAt ? (
                        <span className="ml-2 text-xs text-ink-muted">
                          · {new Date(String(sr.lastWebhookAt)).toLocaleString("en-IN")}
                        </span>
                      ) : null}
                    </p>
                  ) : sr?.lastWebhookAt ? (
                    <p className="mt-1 text-xs text-ink-muted">
                      Last update {new Date(String(sr.lastWebhookAt)).toLocaleString("en-IN")}
                    </p>
                  ) : srTrackingUrl || srAwb ? (
                    <p className="mt-1 text-sm text-ink-muted">
                      Detailed milestones appear here when Shiprocket sends webhooks. Use the tracking
                      link above for live map status.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {srFreight != null ? (
                <ul className="mt-3 space-y-1 text-sm text-ink-muted">
                  <li>
                    Freight:{" "}
                    <span className="font-medium text-ink">
                      {formatInrFromPaise(Math.round(srFreight * 100))}
                    </span>
                  </li>
                  {srCod != null && srCod > 0 ? (
                    <li>
                      COD charges:{" "}
                      <span className="font-medium text-ink">
                        {formatInrFromPaise(Math.round(srCod * 100))}
                      </span>
                    </li>
                  ) : null}
                  {srTotal != null ? (
                    <li>
                      Total shipping (estimate):{" "}
                      <span className="font-medium text-ink">
                        {formatInrFromPaise(Math.round(srTotal * 100))}
                      </span>
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {sr?.chargesBreakdown && typeof sr.chargesBreakdown === "object" ? (
                <details className="mt-3 text-xs text-ink-muted">
                  <summary className="cursor-pointer text-accent">All carrier charges (raw)</summary>
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-sand/50 p-2 font-mono text-[11px]">
                    {JSON.stringify(sr.chargesBreakdown, null, 2)}
                  </pre>
                </details>
              ) : null}
              {srLastErr ? (
                <p className="mt-2 text-xs text-rose" role="alert">
                  {srLastErr}
                </p>
              ) : null}
              {srScans.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    Recent scans (webhook)
                  </p>
                  <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto text-xs text-ink-muted">
                    {srScans.map((s, i) => (
                      <li key={i} className="rounded-lg border border-sand-deep/60 bg-sand/20 px-2 py-1.5">
                        <span className="font-medium text-ink">{s.activity ?? "—"}</span>
                        {s.location ? <span> · {s.location}</span> : null}
                        {s.date ? <span className="mt-0.5 block text-[10px]">{s.date}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : sr && Object.keys(sr).length > 0 && !awaitingCarrier ? (
            <p className="mt-2 text-sm text-ink-muted">
              Carrier details are being processed. Refresh this page shortly.
            </p>
          ) : null}
        </div>
      ) : null}
      <OrderCancelPanel
        orderId={String(order._id)}
        guestEmail={!session ? sp.email?.trim() ?? null : null}
        canCancel={canCancel}
      />

      <div className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg text-ink">Shipping</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {order.shipping.fullName}
          <br />
          {order.shipping.line1}
          {order.shipping.line2 ? (
            <>
              <br />
              {order.shipping.line2}
            </>
          ) : null}
          <br />
          {order.shipping.city}, {order.shipping.state} {order.shipping.postalCode}
          <br />
          {order.shipping.country}
          <br />
          {order.shipping.phone}
        </p>
      </div>
    </div>
  );
}

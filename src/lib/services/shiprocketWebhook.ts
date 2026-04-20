import mongoose from "mongoose";
import { resolveCustomerTrackingUrl } from "@/lib/courier-tracking-url";
import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { TrackingEvent } from "@/lib/models/TrackingEvent";

function awbString(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function scanRows(raw: unknown): Array<{ date: string; activity: string; location: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ date: string; activity: string; location: string }> = [];
  for (const row of raw.slice(0, 25)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    out.push({
      date: r.date != null ? String(r.date) : "",
      activity: r.activity != null ? String(r.activity) : "",
      location: r.location != null ? String(r.location) : "",
    });
  }
  return out;
}

/** Shiprocket may wrap the payload, or use alternate keys. */
function unwrapWebhookBody(raw: Record<string, unknown>): Record<string, unknown> {
  const inner = raw.payload ?? raw.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as Record<string, unknown>;
  }
  return raw;
}

/** Canonical 24-char hex so uppercase channel_order_id from Shiprocket still matches. */
function canonicalOrderObjectId(raw: string): string | null {
  const s = raw.trim();
  if (!s || !mongoose.Types.ObjectId.isValid(s)) return null;
  try {
    return new mongoose.Types.ObjectId(s).toString();
  } catch {
    return null;
  }
}

/**
 * Applies Shiprocket shipment webhook JSON. Idempotent; ignores unknown orders.
 * `channel_order_id` is our Mongo order id (set when creating Shiprocket orders).
 */
export async function applyShiprocketShipmentWebhook(rawBody: Record<string, unknown>): Promise<{
  ok: true;
  matched: boolean;
  orderId?: string;
}> {
  await connectDb();
  const body = unwrapWebhookBody(rawBody);

  const channelRaw =
    body.channel_order_id != null ? String(body.channel_order_id).trim() : "";
  let mongoId: string | null = channelRaw ? canonicalOrderObjectId(channelRaw) : null;

  if (!mongoId && body.order_id != null) {
    const srId = Number(body.order_id);
    if (Number.isFinite(srId) && srId > 0) {
      const o = await Order.findOne({ "shiprocket.shiprocketOrderId": srId }).select("_id").lean();
      if (o?._id) mongoId = String(o._id);
    }
  }

  if (!mongoId && body.shipment_id != null) {
    const sid = Number(body.shipment_id);
    if (Number.isFinite(sid) && sid > 0) {
      const o = await Order.findOne({ "shiprocket.shipmentId": sid }).select("_id").lean();
      if (o?._id) mongoId = String(o._id);
    }
  }

  if (!mongoId) {
    const awbLookup = awbString(body.awb ?? body.awb_code);
    if (awbLookup) {
      const o = await Order.findOne({ "shiprocket.awb": awbLookup }).select("_id").lean();
      if (o?._id) mongoId = String(o._id);
    }
  }

  if (!mongoId) {
    return { ok: true, matched: false };
  }

  const order = await Order.findById(mongoId).lean();
  if (!order) {
    return { ok: true, matched: false };
  }

  const statusText = String(body.current_status ?? body.shipment_status ?? "").trim();
  const awb = awbString(body.awb);
  const courierName =
    typeof body.courier_name === "string" && body.courier_name.trim()
      ? body.courier_name.trim()
      : undefined;
  const scans = scanRows(body.scans ?? body.scan);

  const $set: Record<string, unknown> = {
    "shiprocket.lastWebhookAt": new Date(),
  };
  if (statusText) $set["shiprocket.webhookStatus"] = statusText;
  if (awb) {
    $set["shiprocket.awb"] = awb;
    $set["shiprocket.trackingUrl"] = resolveCustomerTrackingUrl(awb, { courierName });
  }
  if (courierName) $set["shiprocket.courierName"] = courierName;
  if (scans.length) $set["shiprocket.webhookScans"] = scans;

  const st = statusText.toLowerCase();
  const looksDelivered =
    st.includes("delivered") || st.includes("rto delivered") || st.includes("rto undelivered");
  const looksCancelledLike =
    st.includes("cancel") || st.includes("failed") || st.includes("undelivered");
  const looksInTransit =
    !looksCancelledLike &&
    (st.includes("picked") ||
      st.includes("pickup") ||
      st.includes("manifest") ||
      st.includes("dispatched") ||
      st.includes("in transit") ||
      st.includes("out for delivery") ||
      st.includes("shipped") ||
      st.includes("at hub") ||
      st.includes("connected") ||
      st.includes("label") ||
      st.includes("awb") ||
      st.includes("packed") ||
      st.includes("ready to ship") ||
      st.includes("handover") ||
      st.includes("out for pickup"));

  const orderStatus = order.status;
  if (
    orderStatus !== "cancelled" &&
    orderStatus !== "pending" &&
    (looksDelivered || (looksInTransit && (orderStatus === "paid" || orderStatus === "processing")))
  ) {
    $set.status = "shipped";
  }

  await Order.findByIdAndUpdate(mongoId, { $set: $set });

  const oid = new mongoose.Types.ObjectId(mongoId);
  const eventBaseTime = (() => {
    const raw = body.updated_at ?? body.shipped_at ?? body.date ?? body.timestamp;
    if (raw != null) {
      const d = new Date(String(raw));
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date();
  })();

  const loc =
    typeof body.location === "string" && body.location.trim() ? body.location.trim() : undefined;

  if (statusText) {
    await TrackingEvent.updateOne(
      { orderId: oid, status: statusText, eventAt: eventBaseTime },
      {
        $set: { location: loc ?? null, description: statusText },
        $setOnInsert: { orderId: oid, status: statusText, eventAt: eventBaseTime },
      },
      { upsert: true },
    );
  }

  for (const s of scans) {
    const eventAt = s.date ? new Date(String(s.date)) : eventBaseTime;
    if (Number.isNaN(eventAt.getTime())) continue;
    const st = (s.activity ?? "").trim() || statusText;
    if (!st) continue;
    await TrackingEvent.updateOne(
      { orderId: oid, status: st, eventAt },
      {
        $set: { location: s.location?.trim() || null, description: st },
        $setOnInsert: { orderId: oid, status: st, eventAt },
      },
      { upsert: true },
    );
  }

  void import("@/lib/notify/tracking-stage")
    .then((m) => m.maybeNotifyTrackingStage(mongoId))
    .catch(() => {});

  return { ok: true, matched: true, orderId: mongoId };
}

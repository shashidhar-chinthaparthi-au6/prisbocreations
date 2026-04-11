import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/Order";

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

/**
 * Applies Shiprocket shipment webhook JSON. Idempotent; ignores unknown orders.
 * `channel_order_id` is our Mongo order id (set when creating Shiprocket orders).
 */
export async function applyShiprocketShipmentWebhook(body: Record<string, unknown>): Promise<{
  ok: true;
  matched: boolean;
  orderId?: string;
}> {
  await connectDb();

  const channelRaw =
    body.channel_order_id != null ? String(body.channel_order_id).trim() : "";
  let mongoId: string | null =
    channelRaw && mongoose.Types.ObjectId.isValid(channelRaw) && String(new mongoose.Types.ObjectId(channelRaw)) === channelRaw
      ? channelRaw
      : null;

  if (!mongoId && body.order_id != null) {
    const srId = Number(body.order_id);
    if (Number.isFinite(srId) && srId > 0) {
      const o = await Order.findOne({ "shiprocket.shiprocketOrderId": srId }).select("_id").lean();
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
  const scans = scanRows(body.scans);

  const $set: Record<string, unknown> = {
    "shiprocket.lastWebhookAt": new Date(),
  };
  if (statusText) $set["shiprocket.webhookStatus"] = statusText;
  if (awb) {
    $set["shiprocket.awb"] = awb;
    $set["shiprocket.trackingUrl"] = `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
  }
  if (courierName) $set["shiprocket.courierName"] = courierName;
  if (scans.length) $set["shiprocket.webhookScans"] = scans;

  const st = statusText.toLowerCase();
  const looksDelivered =
    st.includes("delivered") || st.includes("rto delivered") || st.includes("rto undelivered");
  const looksInTransit =
    st.includes("picked") ||
    st.includes("manifest") ||
    st.includes("dispatched") ||
    st.includes("in transit") ||
    st.includes("out for delivery") ||
    st.includes("shipped") ||
    st.includes("at hub") ||
    st.includes("connected");

  const orderStatus = order.status;
  if (
    orderStatus !== "cancelled" &&
    orderStatus !== "pending" &&
    (looksDelivered || (looksInTransit && (orderStatus === "paid" || orderStatus === "processing")))
  ) {
    $set.status = "shipped";
  }

  await Order.findByIdAndUpdate(mongoId, { $set: $set });

  return { ok: true, matched: true, orderId: mongoId };
}

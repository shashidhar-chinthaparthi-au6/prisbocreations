import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { TrackingEvent } from "@/lib/models/TrackingEvent";
import { appBaseUrl } from "@/lib/notify/config";
import { notify, type NotifyEvent } from "@/lib/notify/dispatch";
import { buildNotifyPayloadFromOrder } from "@/lib/notify/order-notify-data";
import type { OrderNotifyPayload } from "@/lib/notify/types";
import type { TrackingStage } from "@/lib/trackingStatus";
import { deriveCurrentStage } from "@/lib/trackingStatus";

const NOTIFY_STAGES: TrackingStage[] = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RTO",
];

const STAGE_TO_EVENT: Partial<Record<TrackingStage, NotifyEvent>> = {
  PACKED: "ORDER_SHIPPED",
  SHIPPED: "ORDER_SHIPPED",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
  RTO: "ORDER_RTO",
};

/**
 * Sends notifications when tracking stage advances (Shiprocket webhook or tracking API refresh).
 * Dedupes using `order.lastNotifiedTrackingStage`.
 */
export async function maybeNotifyTrackingStage(orderId: string): Promise<void> {
  await connectDb();
  const order = await Order.findById(orderId).lean();
  if (!order) return;

  const oid = order._id as mongoose.Types.ObjectId;
  const evs = await TrackingEvent.find({ orderId: oid }).sort({ eventAt: -1 }).limit(80).lean();
  if (!evs.length) return;

  const stage = deriveCurrentStage(
    order.status,
    evs.map((e) => ({ status: e.status })),
  );

  if (!NOTIFY_STAGES.includes(stage)) return;

  const prev = (order as { lastNotifiedTrackingStage?: string }).lastNotifiedTrackingStage?.trim();
  if (prev === stage) return;

  const notifyEvent = STAGE_TO_EVENT[stage];
  if (!notifyEvent) {
    await Order.findByIdAndUpdate(orderId, { lastNotifiedTrackingStage: stage });
    return;
  }

  const payload = await buildNotifyPayloadFromOrder(order as OrderNotifyPayload & Record<string, unknown>);
  const baseUrl = appBaseUrl();
  const orderIdStr = String((order as { _id?: unknown })._id ?? "");
  const reviewUrl = `${baseUrl}/account/orders/${encodeURIComponent(orderIdStr)}#review`;

  const reason =
    stage === "CANCELLED"
      ? ((order as { cancelReason?: string }).cancelReason?.trim() || "Cancelled or returned in transit")
      : undefined;

  const data: Record<string, unknown> = {
    ...payload,
    reviewUrl,
    ...(reason !== undefined ? { reason } : {}),
  };

  await notify(notifyEvent, data);

  await Order.findByIdAndUpdate(orderId, { lastNotifiedTrackingStage: stage });
}

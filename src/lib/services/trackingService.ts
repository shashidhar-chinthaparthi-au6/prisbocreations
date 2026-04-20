import mongoose from "mongoose";
import { Order } from "@/lib/models/Order";
import { TrackingEvent } from "@/lib/models/TrackingEvent";
import { User } from "@/lib/models/User";
import { shiprocketTrackByAwb } from "@/lib/services/shiprocketApi";
import { isShiprocketConfigured } from "@/lib/shiprocket-config";
import {
  FLOW_STAGES,
  type TrackingStage,
  stageFromShiprocketStatus,
  deriveCurrentStage,
} from "@/lib/trackingStatus";

const CACHE_MAX_MINUTES = 120;

function normalizeInvoice(s: string) {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

function activitiesFromShiprocketBody(body: Record<string, unknown>): Array<{
  activity: string;
  date: Date;
  location?: string;
}> {
  const td =
    (body.tracking_data as Record<string, unknown> | undefined) ??
    ((body.data as Record<string, unknown> | undefined)?.tracking_data as Record<string, unknown> | undefined);
  const raw =
    (td?.shipment_track_activities as unknown[]) ??
    (td?.shipment_track as unknown[]) ??
    (body.shipment_track_activities as unknown[]) ??
    [];
  const out: Array<{ activity: string; date: Date; location?: string }> = [];
  if (!Array.isArray(raw)) return out;

  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const activity = String(r.activity ?? r.status ?? r["sr-status"] ?? "").trim();
    const dateRaw = r.date ?? r["date-time"] ?? r.datetime;
    let date: Date;
    if (dateRaw instanceof Date) {
      date = dateRaw;
    } else if (typeof dateRaw === "string" || typeof dateRaw === "number") {
      date = new Date(dateRaw);
    } else {
      continue;
    }
    if (!activity || Number.isNaN(date.getTime())) continue;
    const loc = r.location != null ? String(r.location).trim() : "";
    out.push({
      activity,
      date,
      ...(loc ? { location: loc } : {}),
    });
  }
  return out;
}

export async function upsertTrackingEvents(
  orderId: mongoose.Types.ObjectId | string,
  rows: Array<{ activity: string; date: Date; location?: string }>,
) {
  const oid = typeof orderId === "string" ? new mongoose.Types.ObjectId(orderId) : orderId;
  for (const act of rows) {
    await TrackingEvent.updateOne(
      { orderId: oid, status: act.activity, eventAt: act.date },
      {
        $set: {
          location: act.location ?? null,
          description: act.activity,
        },
        $setOnInsert: {
          orderId: oid,
          status: act.activity,
          eventAt: act.date,
        },
      },
      { upsert: true },
    );
  }
}

export async function refreshTrackingFromShiprocket(orderId: string, awb: string) {
  if (!awb.trim() || !isShiprocketConfigured()) {
    return listTrackingEvents(orderId);
  }
  const body = (await shiprocketTrackByAwb(awb.trim())) as Record<string, unknown>;
  const acts = activitiesFromShiprocketBody(body);
  if (acts.length) {
    await upsertTrackingEvents(orderId, acts);
    void import("@/lib/notify/tracking-stage")
      .then((m) => m.maybeNotifyTrackingStage(orderId))
      .catch(() => {});
  }
  return listTrackingEvents(orderId);
}

/** One-time style: copy legacy `shiprocket.webhookScans` into `TrackingEvent` when the collection is empty. */
export async function hydrateEventsFromStoredScans(orderId: string) {
  const order = await Order.findById(orderId).select("shiprocket.webhookScans").lean();
  const scans = order?.shiprocket?.webhookScans;
  if (!Array.isArray(scans) || !scans.length) return;
  const oid = new mongoose.Types.ObjectId(orderId);
  for (const s of scans) {
    const row = s as { date?: string; activity?: string; location?: string };
    const eventAt = row.date ? new Date(String(row.date)) : new Date();
    if (Number.isNaN(eventAt.getTime())) continue;
    const st = (row.activity ?? "").trim();
    if (!st) continue;
    await TrackingEvent.updateOne(
      { orderId: oid, status: st, eventAt },
      {
        $set: { location: row.location?.trim() || null, description: st },
        $setOnInsert: { orderId: oid, status: st, eventAt },
      },
      { upsert: true },
    );
  }
}

export async function listTrackingEvents(orderId: string) {
  const oid = new mongoose.Types.ObjectId(orderId);
  const docs = await TrackingEvent.find({ orderId: oid }).sort({ eventAt: -1 }).lean();
  return docs.map((d) => ({
    status: d.status,
    location: d.location != null ? d.location : null,
    description: d.description != null ? d.description : null,
    eventAt: d.eventAt as Date,
    createdAt: (d as { createdAt?: Date }).createdAt ?? new Date(0),
  }));
}

function cacheAgeMinutes(events: Awaited<ReturnType<typeof listTrackingEvents>>): number {
  if (!events.length) return 999;
  const newest = events.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  return (Date.now() - newest.createdAt.getTime()) / 1000 / 60;
}

export async function loadEventsWithOptionalRefresh(
  orderId: string,
  awb: string | undefined | null,
): Promise<{ events: Awaited<ReturnType<typeof listTrackingEvents>>; refreshFailed: boolean }> {
  let events = await listTrackingEvents(orderId);
  if (!events.length) {
    await hydrateEventsFromStoredScans(orderId);
    events = await listTrackingEvents(orderId);
  }
  const age = cacheAgeMinutes(events);
  const needsRefresh = Boolean(awb?.trim()) && (age > CACHE_MAX_MINUTES || events.length === 0);
  let refreshFailed = false;
  if (needsRefresh) {
    try {
      events = await refreshTrackingFromShiprocket(orderId, awb!);
    } catch (e) {
      refreshFailed = true;
      console.error("[tracking] Shiprocket refresh failed:", e);
    }
  }
  return { events, refreshFailed };
}

export type TrackOrderLean = {
  _id: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  guestEmail?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  status: string;
  paymentMethod?: string;
  totalPaise: number;
  subtotalPaise?: number;
  shippingPaise?: number;
  discountPaise?: number;
  createdAt?: Date;
  estimatedDelivery?: string | null;
  selectedCourierName?: string | null;
  shiprocket?: {
    awb?: string;
    trackingUrl?: string;
    courierName?: string;
    webhookStatus?: string;
    lastWebhookAt?: Date;
  } | null;
  shipping: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    imageUrl?: string;
    optionLabel?: string;
    colorLabel?: string;
  }>;
};

export function syntheticEventsForOrder(order: TrackOrderLean): Array<{
  status: string;
  stage: TrackingStage;
  location?: string | null;
  description?: string | null;
  eventAt: string;
}> {
  const placedAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const base: Array<{ status: string; stage: TrackingStage; eventAt: Date }> = [
    { status: "Order Created", stage: "PLACED", eventAt: placedAt },
  ];
  if (order.status === "paid" || order.status === "processing" || order.status === "shipped") {
    base.push({
      status: "Pickup Scheduled",
      stage: "CONFIRMED",
      eventAt: new Date(placedAt.getTime() + 60 * 60 * 1000),
    });
  }
  return base.map((b) => ({
    status: b.status,
    stage: b.stage,
    location: null,
    description: null,
    eventAt: b.eventAt.toISOString(),
  }));
}

export function buildTrackPayload(input: {
  order: TrackOrderLean;
  events: Awaited<ReturnType<typeof listTrackingEvents>>;
  mode: "public" | "account";
  lastFetchAttemptFailed?: boolean;
}) {
  const { order, events: rawEvents, mode, lastFetchAttemptFailed } = input;
  const awb = order.shiprocket?.awb?.trim() ?? "";
  const hasDbEvents = rawEvents.length > 0;
  const eventsForStage = hasDbEvents ? rawEvents : [];

  let events = hasDbEvents
    ? rawEvents.map((e) => ({
        status: e.status,
        stage: stageFromShiprocketStatus(e.status),
        location: e.location,
        description: e.description ?? e.status,
        eventAt: e.eventAt.toISOString(),
      }))
    : syntheticEventsForOrder(order);

  const currentStage = deriveCurrentStage(
    order.status,
    eventsForStage.length ? eventsForStage : events.map((x) => ({ status: x.status })),
  );

  const newestEventAt = hasDbEvents
    ? rawEvents.reduce((a, b) => (a.eventAt > b.eventAt ? a : b)).eventAt
    : order.createdAt ?? new Date();

  const cacheUpdatedAt = hasDbEvents
    ? rawEvents.reduce((a, b) => (a.createdAt > b.createdAt ? a : b)).createdAt
    : order.createdAt ?? new Date();

  const cacheAgeHours = (Date.now() - cacheUpdatedAt.getTime()) / 1000 / 3600;

  const shippingAddress =
    mode === "public"
      ? {
          fullName: order.shipping.fullName,
          city: order.shipping.city,
          state: order.shipping.state,
          postalCode: order.shipping.postalCode,
        }
      : {
          fullName: order.shipping.fullName,
          phone: order.shipping.phone,
          line1: order.shipping.line1,
          line2: order.shipping.line2 ?? "",
          city: order.shipping.city,
          state: order.shipping.state,
          postalCode: order.shipping.postalCode,
          country: order.shipping.country,
        };

  return {
    orderNumber: order.invoiceNumber ?? "",
    status: order.status,
    paymentMethod: order.paymentMethod ?? "online",
    placedAt: (order.createdAt ?? new Date()).toISOString(),
    estimatedDelivery: order.estimatedDelivery?.trim() || null,
    awbCode: awb || null,
    courierName: "Standard delivery",
    items: order.items.map((i) => ({
      name: i.name,
      variant: [i.colorLabel, i.optionLabel].filter(Boolean).join(" · ") || undefined,
      size: undefined as string | undefined,
      quantity: i.quantity,
      imageUrl: i.imageUrl ?? null,
    })),
    shippingAddress,
    events,
    currentStage,
    totalPaise: order.totalPaise,
    subtotalPaise: order.subtotalPaise ?? order.totalPaise,
    shippingPaise: order.shippingPaise ?? 0,
    discountPaise: order.discountPaise ?? 0,
    lastUpdatedAt: newestEventAt.toISOString(),
    cacheAgeHours: Math.round(cacheAgeHours * 10) / 10,
    lastFetchAttemptFailed: Boolean(lastFetchAttemptFailed),
    flowStages: FLOW_STAGES,
  };
}

export async function findOrderForPublicTrack(orderNumber: string, email: string) {
  const em = email.trim().toLowerCase();
  const inv = normalizeInvoice(orderNumber);
  let order = await Order.findOne({ invoiceNumber: inv }).lean();
  if (!order && mongoose.Types.ObjectId.isValid(orderNumber)) {
    const id = String(new mongoose.Types.ObjectId(orderNumber));
    if (id === orderNumber.trim()) {
      order = await Order.findById(orderNumber).lean();
    }
  }
  if (!order) return null;

  if (order.guestEmail) {
    if (String(order.guestEmail).trim().toLowerCase() !== em) return null;
    return order as unknown as TrackOrderLean;
  }
  if (order.userId) {
    const u = await User.findById(order.userId).select("email").lean();
    if (!u || String(u.email ?? "").trim().toLowerCase() !== em) return null;
    return order as unknown as TrackOrderLean;
  }
  return null;
}

export async function findOrderForAccountTrack(orderId: string, userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  let order = await Order.findOne({ _id: orderId, userId: uid }).lean();
  if (!order && mongoose.Types.ObjectId.isValid(orderId)) {
    order = await Order.findOne({ _id: orderId, userId: uid }).lean();
  }
  if (!order) {
    const inv = normalizeInvoice(orderId);
    order = await Order.findOne({ invoiceNumber: inv, userId: uid }).lean();
  }
  return order as unknown as TrackOrderLean | null;
}

export async function findOrderByInvoiceForUser(invoice: string, userId: string) {
  const inv = normalizeInvoice(invoice);
  const uid = new mongoose.Types.ObjectId(userId);
  const order = await Order.findOne({ invoiceNumber: inv, userId: uid }).lean();
  return order as unknown as TrackOrderLean | null;
}

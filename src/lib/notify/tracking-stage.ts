import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { TrackingEvent } from "@/lib/models/TrackingEvent";
import { User } from "@/lib/models/User";
import { appBaseUrl } from "@/lib/notify/config";
import { sendSesEmail } from "@/lib/notify/ses";
import { sendMsg91Flow, normalizeIndianMobile } from "@/lib/notify/msg91";
import type { TrackingStage } from "@/lib/trackingStatus";
import { deriveCurrentStage } from "@/lib/trackingStatus";

function emailEnabled(): boolean {
  return process.env.EMAIL_ENABLED === "true";
}

function publicTrackUrl(invoice: string): string {
  const base = appBaseUrl();
  return `${base}/track?order=${encodeURIComponent(invoice)}`;
}

function reviewUrl(slug: string): string {
  const base = appBaseUrl();
  return `${base}/products/${encodeURIComponent(slug)}`;
}

async function customerEmailForOrder(order: {
  guestEmail?: string | null;
  userId?: mongoose.Types.ObjectId | null;
}): Promise<string | null> {
  if (order.guestEmail?.trim()) return order.guestEmail.trim().toLowerCase();
  if (order.userId) {
    const u = await User.findById(order.userId).select("email").lean();
    return u?.email ? String(u.email).toLowerCase() : null;
  }
  return null;
}

const NOTIFY_STAGES: TrackingStage[] = [
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RTO",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends email/SMS when tracking stage advances (Shiprocket webhook or tracking API refresh).
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

  const inv = (order as { invoiceNumber?: string }).invoiceNumber ?? String(order._id);
  const email = await customerEmailForOrder(order as { guestEmail?: string; userId?: mongoose.Types.ObjectId });
  const mobile = normalizeIndianMobile(
    (order as { shipping?: { phone?: string } }).shipping?.phone ?? "",
  );
  const awb = (order as { shiprocket?: { awb?: string } }).shiprocket?.awb?.trim() ?? "";
  const trackLink = publicTrackUrl(inv);
  const firstItemSlug = (order as { items?: { slug?: string }[] }).items?.[0]?.slug;
  const reviewLink = firstItemSlug ? reviewUrl(firstItemSlug) : `${appBaseUrl()}/products`;

  const sendEmail = emailEnabled();

  let subject = "";
  let text = "";
  let html = "";

  switch (stage) {
    case "CONFIRMED":
      subject = `Order confirmed — ${inv}`;
      text = `Your order #${inv} is confirmed! We're preparing it now.\n\n${trackLink}`;
      html = `<p>Your order <strong>${escapeHtml(inv)}</strong> is confirmed! We&apos;re preparing it now.</p><p><a href="${escapeHtml(trackLink)}">Track your order</a></p>`;
      break;
    case "PACKED":
      subject = `Packed — ${inv}`;
      text = `Your order is packed and pickup has been scheduled.\n\n${trackLink}`;
      html = `<p>Your order <strong>${escapeHtml(inv)}</strong> is packed and pickup has been scheduled.</p><p><a href="${escapeHtml(trackLink)}">Track your order</a></p>`;
      break;
    case "SHIPPED":
      subject = `On the way — ${inv}`;
      text = `Your order is on its way!${awb ? ` AWB: ${awb}` : ""}\n\nTrack: ${trackLink}`;
      html = `<p>Your order is on its way!${awb ? ` AWB: <code>${escapeHtml(awb)}</code>` : ""}</p><p><a href="${escapeHtml(trackLink)}">Track your order</a></p>`;
      break;
    case "OUT_FOR_DELIVERY":
      subject = `Out for delivery — ${inv}`;
      text = `Your Prisbo Creations order is out for delivery today!\n\n${trackLink}`;
      html = `<p>Your Prisbo Creations order is out for delivery today!</p><p><a href="${escapeHtml(trackLink)}">Track your order</a></p>`;
      break;
    case "DELIVERED":
      subject = `Delivered — ${inv}`;
      text = `Your order has been delivered. We hope you love it! Leave a review: ${reviewLink}`;
      html = `<p>Your order has been delivered. We hope you love it!</p><p><a href="${escapeHtml(reviewLink)}">Leave a review</a></p>`;
      break;
    case "CANCELLED":
    case "RTO":
      subject = `Delivery update — ${inv}`;
      text = `Your order could not be delivered. Refund will be initiated shortly.\n\n${trackLink}`;
      html = `<p>Your order could not be delivered. Refund will be initiated shortly.</p><p><a href="${escapeHtml(trackLink)}">Details</a></p>`;
      break;
    default:
      return;
  }

  if (!sendEmail) {
    console.info("[notify/tracking-stage] (dev / email disabled)", { stage, inv, email, text: text.slice(0, 120) });
  } else if (email) {
    try {
      await sendSesEmail({ to: email, subject, textBody: text, htmlBody: html });
    } catch (e) {
      console.error("[notify/tracking-stage] email", e);
    }
  }

  const tid = process.env.MSG91_TEMPLATE_ORDER_TRACKING?.trim();
  if (tid && mobile) {
    try {
      await sendMsg91Flow({
        mobiles: mobile,
        templateId: tid,
        variables: { VAR1: inv, VAR2: stage, VAR3: trackLink.slice(0, 200) },
      });
    } catch (e) {
      console.error("[notify/tracking-stage] sms", e);
    }
  }

  await Order.findByIdAndUpdate(orderId, { lastNotifiedTrackingStage: stage });
}

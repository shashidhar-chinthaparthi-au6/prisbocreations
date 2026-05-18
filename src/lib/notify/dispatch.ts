import mongoose from "mongoose";
import { User } from "@/lib/models/User";
import { sendEmail } from "@/lib/notify/email/ses";
import { adminLowStockEmail } from "@/lib/notify/email/templates/admin-low-stock";
import { adminNewOrderEmail } from "@/lib/notify/email/templates/admin-new-order";
import { adminBulkInquiryEmail } from "@/lib/notify/email/templates/admin-bulk-inquiry";
import { proofReadyEmail } from "@/lib/notify/email/templates/proof-ready";
import { proofApprovedEmail } from "@/lib/notify/email/templates/proof-approved";
import { emailChangeEmail } from "@/lib/notify/email/templates/email-change";
import { orderCancelledEmail } from "@/lib/notify/email/templates/order-cancelled";
import { orderDeliveredEmail } from "@/lib/notify/email/templates/order-delivered";
import { orderOutForDeliveryEmail } from "@/lib/notify/email/templates/order-out-for-delivery";
import { orderPaidEmail } from "@/lib/notify/email/templates/order-paid";
import { orderPlacedEmail } from "@/lib/notify/email/templates/order-placed";
import { orderRtoEmail } from "@/lib/notify/email/templates/order-rto";
import { orderShippedEmail } from "@/lib/notify/email/templates/order-shipped";
import { resetPasswordEmail } from "@/lib/notify/email/templates/reset-password";
import { welcomeEmail } from "@/lib/notify/email/templates/welcome";
import { appBaseUrl } from "@/lib/notify/config";
import { hasOrderEventBeenSent } from "@/lib/notify/notification-log";
import {
  buildNotifyPayloadFromOrder,
  mapItemsForEmail,
  publicTrackUrl,
} from "@/lib/notify/order-notify-data";
import { formatPhone, sendSMS } from "@/lib/notify/sms/msg91";
import { SMS_TEMPLATES } from "@/lib/notify/sms/templates";
import type { OrderNotifyPayload } from "@/lib/notify/types";

export type { OrderNotifyPayload } from "@/lib/notify/types";

export type NotifyEvent =
  | "ORDER_PLACED"
  | "ORDER_PAID"
  | "ORDER_PACKED"
  | "ORDER_SHIPPED"
  | "ORDER_OUT_FOR_DELIVERY"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "ORDER_RTO"
  | "USER_WELCOME"
  | "PASSWORD_RESET"
  | "EMAIL_CHANGE"
  | "ADMIN_NEW_ORDER"
  | "ADMIN_LOW_STOCK"
  | "PROOF_READY"
  | "PROOF_APPROVED";

function shortUrlDefault(): "0" | "1" {
  const v = process.env.MSG91_SHORT_URL_DEFAULT?.trim();
  return v === "1" ? "1" : "0";
}

async function userPrefs(userId?: string | null) {
  const defaults = { notifOrderUpdates: true, notifSMS: true, notifOffers: true };
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) return defaults;
  const u = await User.findById(userId)
    .select("notifOrderUpdates notifSMS notifOffers")
    .lean();
  if (!u) return defaults;
  return {
    notifOrderUpdates: u.notifOrderUpdates !== false,
    notifSMS: u.notifSMS !== false,
    notifOffers: u.notifOffers !== false,
  };
}

export async function notify(event: NotifyEvent, data: Record<string, unknown>): Promise<void> {
  try {
    await _dispatch(event, data);
  } catch (err) {
    console.error(`[notify] ${event} failed:`, err);
  }
}

async function _dispatch(event: NotifyEvent, data: Record<string, unknown>): Promise<void> {
  const uid = typeof data.userId === "string" ? data.userId : null;
  const prefs = await userPrefs(uid);

  const adminEmail = process.env.STORE_OWNER_EMAIL?.trim() || process.env.SES_FROM_EMAIL?.trim();
  if (!adminEmail && event.startsWith("ADMIN_")) {
    console.warn("[notify] STORE_OWNER_EMAIL / SES_FROM_EMAIL missing; skipping admin notification");
    return;
  }

  const orderNumber = typeof data.orderNumber === "string" ? data.orderNumber : "";
  const trackUrl =
    typeof data.trackUrl === "string" && data.trackUrl
      ? data.trackUrl
      : orderNumber
        ? publicTrackUrl(orderNumber)
        : appBaseUrl();

  const orderIdStr = typeof data.orderId === "string" ? data.orderId : null;
  const logBase = {
    orderId: orderIdStr,
    userId: uid,
  };

  switch (event) {
    case "ORDER_PLACED": {
      const email = typeof data.email === "string" ? data.email : undefined;
      const phone = typeof data.phone === "string" ? data.phone : undefined;
      if (email && prefs.notifOrderUpdates) {
        const tpl = orderPlacedEmail({
          firstName: String(data.firstName ?? "there"),
          orderNumber: String(data.orderNumber ?? ""),
          items: (data.items as Parameters<typeof orderPlacedEmail>[0]["items"]) ?? [],
          subtotal: Number(data.subtotal ?? 0),
          shippingCharge: Number(data.shippingCharge ?? 0),
          discount: Number(data.discount ?? 0),
          total: Number(data.total ?? 0),
          paymentMethod: String(data.paymentMethod ?? "Online"),
          shippingAddress: data.shippingAddress as Parameters<typeof orderPlacedEmail>[0]["shippingAddress"],
          estimatedDelivery: String(data.estimatedDelivery ?? ""),
          trackUrl,
        });
        await sendEmail({
          to: email,
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      if (phone && prefs.notifSMS && SMS_TEMPLATES.ORDER_PLACED.id.trim()) {
        await sendSMS(
          {
            template_id: SMS_TEMPLATES.ORDER_PLACED.id.trim(),
            short_url: shortUrlDefault(),
            recipients: [
              {
                mobiles: formatPhone(phone),
                VAR1: String(data.orderNumber ?? ""),
                VAR2: String(data.firstName ?? ""),
                VAR3: String(data.total ?? ""),
                VAR4: trackUrl,
              },
            ],
          },
          { event, ...logBase },
        );
      }
      if (adminEmail) {
        const tpl = adminNewOrderEmail({
          orderNumber: String(data.orderNumber ?? ""),
          customerName: String(data.customerName ?? ""),
          customerEmail: String(data.email ?? ""),
          customerPhone: String(data.phone ?? ""),
          total: Number(data.total ?? 0),
          paymentMethod: String(data.paymentMethod ?? ""),
          items: (data.items as Parameters<typeof adminNewOrderEmail>[0]["items"]) ?? [],
          shippingAddress: data.shippingAddress as Parameters<typeof adminNewOrderEmail>[0]["shippingAddress"],
          adminOrderUrl: `${appBaseUrl()}/admin/orders`,
        });
        await sendEmail({
          to: adminEmail,
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      break;
    }

    case "ORDER_PAID": {
      if (data.email && prefs.notifOrderUpdates) {
        const tpl = orderPaidEmail({
          firstName: String(data.firstName ?? "there"),
          orderNumber: String(data.orderNumber ?? ""),
          total: Number(data.total ?? 0),
          trackUrl,
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      if (data.phone && prefs.notifSMS && SMS_TEMPLATES.ORDER_PAID.id.trim()) {
        await sendSMS(
          {
            template_id: SMS_TEMPLATES.ORDER_PAID.id.trim(),
            short_url: "0",
            recipients: [
              {
                mobiles: formatPhone(String(data.phone)),
                VAR1: String(data.orderNumber ?? ""),
                VAR2: String(data.firstName ?? ""),
                VAR3: String(data.total ?? ""),
              },
            ],
          },
          { event, ...logBase },
        );
      }
      break;
    }

    case "ORDER_SHIPPED": {
      if (orderIdStr && (await hasOrderEventBeenSent(orderIdStr, "ORDER_SHIPPED"))) {
        break;
      }
      if (data.email && prefs.notifOrderUpdates) {
        const tpl = orderShippedEmail({
          firstName: String(data.firstName ?? "there"),
          orderNumber: String(data.orderNumber ?? ""),
          awbCode: String(data.awbCode ?? ""),
          courierName: "Standard delivery",
          trackingUrl: String(data.trackingUrl ?? trackUrl),
          estimatedDelivery: String(data.estimatedDelivery ?? "—"),
          items: (data.items as Parameters<typeof orderShippedEmail>[0]["items"]) ?? [],
          prisboTrackUrl: trackUrl,
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      if (data.phone && prefs.notifSMS && SMS_TEMPLATES.ORDER_SHIPPED.id.trim()) {
        await sendSMS(
          {
            template_id: SMS_TEMPLATES.ORDER_SHIPPED.id.trim(),
            short_url: "0",
            recipients: [
              {
                mobiles: formatPhone(String(data.phone)),
                VAR1: String(data.orderNumber ?? ""),
                VAR2: String(data.awbCode ?? ""),
                VAR3: String(data.estimatedDelivery ?? "—"),
                VAR4: trackUrl,
              },
            ],
          },
          { event, ...logBase },
        );
      }
      break;
    }

    case "ORDER_OUT_FOR_DELIVERY": {
      if (data.email && prefs.notifOrderUpdates) {
        const tpl = orderOutForDeliveryEmail({
          firstName: String(data.firstName ?? "there"),
          orderNumber: String(data.orderNumber ?? ""),
          trackingUrl: String(data.trackingUrl ?? trackUrl),
          isCod: data.paymentMethod === "COD" || data.paymentMethod === "cod",
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      break;
    }

    case "ORDER_DELIVERED": {
      if (data.email && prefs.notifOrderUpdates) {
        const tpl = orderDeliveredEmail({
          firstName: String(data.firstName ?? "there"),
          orderNumber: String(data.orderNumber ?? ""),
          items: (data.items as Parameters<typeof orderDeliveredEmail>[0]["items"]) ?? [],
          reviewUrl: String(data.reviewUrl ?? `${appBaseUrl()}/products`),
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      break;
    }

    case "ORDER_CANCELLED": {
      if (data.email) {
        const tpl = orderCancelledEmail({
          firstName: String(data.firstName ?? "there"),
          orderNumber: String(data.orderNumber ?? ""),
          reason: data.reason ? String(data.reason) : undefined,
          total: Number(data.total ?? 0),
          paymentMethod: String(data.paymentMethod ?? "Online"),
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      if (data.phone && prefs.notifSMS && SMS_TEMPLATES.ORDER_CANCELLED.id.trim()) {
        await sendSMS(
          {
            template_id: SMS_TEMPLATES.ORDER_CANCELLED.id.trim(),
            short_url: "0",
            recipients: [
              {
                mobiles: formatPhone(String(data.phone)),
                VAR1: String(data.orderNumber ?? ""),
                VAR2: String(data.firstName ?? ""),
              },
            ],
          },
          { event, ...logBase },
        );
      }
      break;
    }

    case "ORDER_RTO": {
      if (data.email && prefs.notifOrderUpdates) {
        const tpl = orderRtoEmail({
          firstName: String(data.firstName ?? "there"),
          orderNumber: String(data.orderNumber ?? ""),
          trackUrl,
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, ...logBase },
        });
      }
      break;
    }

    case "USER_WELCOME": {
      if (data.email) {
        const tpl = welcomeEmail({ firstName: String(data.firstName ?? "there") });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, userId: uid },
        });
      }
      break;
    }

    case "PASSWORD_RESET": {
      if (data.email) {
        const tpl = resetPasswordEmail({
          firstName: String(data.firstName ?? "there"),
          resetUrl: String(data.resetUrl ?? ""),
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, userId: uid },
        });
      }
      break;
    }

    case "EMAIL_CHANGE": {
      if (data.email) {
        const tpl = emailChangeEmail({
          firstName: String(data.firstName ?? "there"),
          verifyUrl: String(data.verifyUrl ?? ""),
        });
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, userId: uid },
        });
      }
      break;
    }

    case "ADMIN_LOW_STOCK": {
      if (adminEmail) {
        const tpl = adminLowStockEmail({
          items: (data.items as Parameters<typeof adminLowStockEmail>[0]["items"]) ?? [],
          adminProductsUrl: `${appBaseUrl()}/admin/products`,
        });
        await sendEmail({
          to: adminEmail,
          subject: tpl.subject,
          html: tpl.html,
          log: { event },
        });
      }
      break;
    }

    case "ORDER_PACKED":
      break;

    case "PROOF_READY": {
      const tpl = proofReadyEmail({
        firstName: String(data.firstName ?? "there"),
        orderNumber: String(data.orderNumber ?? ""),
        productName: String(data.productName ?? "your item"),
        proofUrl: String(data.proofUrl ?? ""),
      });
      if (data.email) {
        await sendEmail({
          to: String(data.email),
          subject: tpl.subject,
          html: tpl.html,
          log: { event, orderId: String(data.orderId ?? "") },
        });
      }
      break;
    }

    case "PROOF_APPROVED": {
      if (adminEmail) {
        const tpl = proofApprovedEmail({
          orderNumber: String(data.orderNumber ?? ""),
          productName: String(data.productName ?? "item"),
          adminOrderUrl: `${appBaseUrl()}/admin/orders`,
        });
        await sendEmail({
          to: adminEmail,
          subject: tpl.subject,
          html: tpl.html,
          log: { event, orderId: String(data.orderId ?? "") },
        });
      }
      break;
    }

    default:
      break;
  }
}

export async function notifyWelcomeEmail(to: string, name: string): Promise<void> {
  const first = name.trim().split(/\s+/)[0] || "there";
  await notify("USER_WELCOME", { email: to, firstName: first });
}

export async function notifyPasswordResetEmail(
  to: string,
  resetLink: string,
  firstName?: string,
): Promise<void> {
  await notify("PASSWORD_RESET", {
    email: to,
    firstName: firstName ?? "there",
    resetUrl: resetLink,
  });
}

export async function notifyOrderPlaced(order: OrderNotifyPayload & Record<string, unknown>): Promise<void> {
  const p = await buildNotifyPayloadFromOrder(order);
  await notify("ORDER_PLACED", p);
}

export async function notifyOrderPaid(order: OrderNotifyPayload & Record<string, unknown>): Promise<void> {
  const p = await buildNotifyPayloadFromOrder(order);
  await notify("ORDER_PAID", p);
}

export async function notifyOrderCancelled(
  order: OrderNotifyPayload & Record<string, unknown>,
  reason: string,
): Promise<void> {
  const p = await buildNotifyPayloadFromOrder(order);
  await notify("ORDER_CANCELLED", { ...p, reason });
}

export async function notifyOrderShipped(order: OrderNotifyPayload & Record<string, unknown>): Promise<void> {
  const p = await buildNotifyPayloadFromOrder(order);
  const items = mapItemsForEmail(order);
  await notify("ORDER_SHIPPED", {
    ...p,
    items,
    estimatedDelivery: p.estimatedDelivery,
    trackingUrl: p.trackingUrl,
    trackUrl: p.trackUrl,
  });
}

export async function notifyBulkInquiry(inquiry: {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  productInterest?: string;
  quantity?: number;
  deadlineDate?: Date;
  notes?: string;
  _id: { toString(): string };
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const tpl = adminBulkInquiryEmail({
    company: inquiry.company,
    contactName: inquiry.contactName,
    email: inquiry.email,
    phone: inquiry.phone,
    productInterest: inquiry.productInterest,
    quantity: inquiry.quantity,
    deadlineDate: inquiry.deadlineDate?.toLocaleDateString("en-IN"),
    notes: inquiry.notes,
    adminInboxUrl: `${baseUrl}/admin/bulk-inquiries`,
  });
  const { sendEmail } = await import("@/lib/notify/email/ses");
  await sendEmail({ to: adminEmail, subject: tpl.subject, html: tpl.html, log: { event: "BULK_INQUIRY" } });
}

export async function notifyProofReady(data: {
  email: string;
  firstName: string;
  orderNumber: string;
  productName: string;
  proofUrl: string;
  orderId: string;
}): Promise<void> {
  await notify("PROOF_READY", data);
}

export async function notifyProofApproved(data: {
  orderNumber: string;
  productName: string;
  orderId: string;
}): Promise<void> {
  await notify("PROOF_APPROVED", data);
}

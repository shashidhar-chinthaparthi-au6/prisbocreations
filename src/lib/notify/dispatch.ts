import mongoose from "mongoose";
import { User } from "@/lib/models/User";
import { formatInrFromPaise } from "@/lib/format";
import { appBaseUrl } from "@/lib/notify/config";
import { sendMsg91Flow, normalizeIndianMobile } from "@/lib/notify/msg91";
import { sendSesEmail } from "@/lib/notify/ses";

export type OrderNotifyPayload = {
  _id: mongoose.Types.ObjectId | string;
  invoiceNumber?: string;
  status?: string;
  paymentMethod?: string;
  totalPaise: number;
  guestEmail?: string | null;
  userId?: mongoose.Types.ObjectId | null;
  shipping: { fullName: string; phone: string };
  items?: Array<{ name: string; quantity: number }>;
  cancelReason?: string;
  shiprocket?: { awb?: string; trackingUrl?: string; courierName?: string };
};

function logErr(ctx: string, e: unknown) {
  console.error(`[notify] ${ctx}`, e instanceof Error ? e.message : e);
}

async function customerEmail(order: OrderNotifyPayload): Promise<string | null> {
  if (order.guestEmail?.trim()) return order.guestEmail.trim().toLowerCase();
  if (order.userId) {
    const u = await User.findById(order.userId).select("email").lean();
    return u?.email ? String(u.email).toLowerCase() : null;
  }
  return null;
}

function orderSmsMobile(order: OrderNotifyPayload): string | null {
  return normalizeIndianMobile(order.shipping?.phone ?? "");
}

function itemsSummary(order: OrderNotifyPayload): string {
  const lines = (order.items ?? []).slice(0, 6).map((i) => `· ${i.quantity}× ${i.name}`);
  if ((order.items?.length ?? 0) > 6) lines.push("…");
  return lines.join("\n") || "—";
}

function orderTrackPath(orderId: string, email?: string | null): string {
  const base = appBaseUrl();
  const id = String(orderId);
  if (email) {
    return `${base}/orders/${id}?email=${encodeURIComponent(email)}`;
  }
  return `${base}/orders/${id}`;
}

export async function notifyWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    await sendSesEmail({
      to,
      subject: "Welcome to Prisbo Creations",
      textBody: `Hi ${name},\n\nThanks for creating an account. You can sign in anytime to track orders.\n\n— Prisbo Creations`,
      htmlBody: `<p>Hi ${escapeHtml(name)},</p><p>Thanks for creating an account. You can sign in anytime to track orders.</p><p>— Prisbo Creations</p>`,
    });
  } catch (e) {
    logErr("welcome email", e);
  }
}

export async function notifyPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  try {
    await sendSesEmail({
      to,
      subject: "Reset your Prisbo Creations password",
      textBody: `We received a request to reset your password.\n\nOpen this link (valid for 1 hour):\n${resetLink}\n\nIf you did not request this, you can ignore this email.\n\n— Prisbo Creations`,
      htmlBody: `<p>We received a request to reset your password.</p><p><a href="${escapeHtml(resetLink)}">Reset password</a> (valid for 1 hour)</p><p>If you did not request this, ignore this email.</p><p>— Prisbo Creations</p>`,
    });
  } catch (e) {
    logErr("password reset email", e);
  }
}

export async function notifyOrderPlaced(order: OrderNotifyPayload): Promise<void> {
  const email = await customerEmail(order);
  const id = String(order._id);
  const inv = order.invoiceNumber ?? id;
  const total = formatInrFromPaise(order.totalPaise);
  const pm = order.paymentMethod === "cod" ? "Cash on delivery" : "Online (complete payment if still pending)";
  const track = orderTrackPath(id, email ?? order.guestEmail ?? undefined);

  if (email) {
    try {
      await sendSesEmail({
        to: email,
        subject: `Order received — ${inv}`,
        textBody: `Hi ${order.shipping.fullName},\n\nThank you for your order.\n\nInvoice: ${inv}\nTotal: ${total}\nPayment: ${pm}\n\n${itemsSummary(order)}\n\nView your order: ${track}\n\n— Prisbo Creations`,
        htmlBody: `<p>Hi ${escapeHtml(order.shipping.fullName)},</p><p>Thank you for your order.</p><p><strong>Invoice:</strong> ${escapeHtml(inv)}<br/><strong>Total:</strong> ${escapeHtml(total)}<br/><strong>Payment:</strong> ${escapeHtml(pm)}</p><pre style="font-family:sans-serif">${escapeHtml(itemsSummary(order))}</pre><p><a href="${escapeHtml(track)}">View order</a></p><p>— Prisbo Creations</p>`,
      });
    } catch (e) {
      logErr("order placed email", e);
    }
  }

  const tid = process.env.MSG91_TEMPLATE_ORDER_PLACED?.trim();
  const mobile = orderSmsMobile(order);
  if (tid && mobile) {
    try {
      await sendMsg91Flow({
        mobiles: mobile,
        templateId: tid,
        variables: {
          VAR1: inv,
          VAR2: total,
          VAR3: track.slice(0, 200),
          VAR4: pm.slice(0, 80),
        },
      });
    } catch (e) {
      logErr("order placed sms", e);
    }
  }
}

export async function notifyOrderPaid(order: OrderNotifyPayload): Promise<void> {
  const email = await customerEmail(order);
  const id = String(order._id);
  const inv = order.invoiceNumber ?? id;
  const total = formatInrFromPaise(order.totalPaise);
  const track = orderTrackPath(id, email ?? order.guestEmail ?? undefined);

  if (email) {
    try {
      await sendSesEmail({
        to: email,
        subject: `Payment received — ${inv}`,
        textBody: `Hi ${order.shipping.fullName},\n\nWe have received your payment.\n\nInvoice: ${inv}\nTotal: ${total}\n\nView your order: ${track}\n\n— Prisbo Creations`,
        htmlBody: `<p>Hi ${escapeHtml(order.shipping.fullName)},</p><p>We have received your payment for invoice <strong>${escapeHtml(inv)}</strong> (${escapeHtml(total)}).</p><p><a href="${escapeHtml(track)}">View order</a></p><p>— Prisbo Creations</p>`,
      });
    } catch (e) {
      logErr("order paid email", e);
    }
  }

  const tid = process.env.MSG91_TEMPLATE_ORDER_PAID?.trim();
  const mobile = orderSmsMobile(order);
  if (tid && mobile) {
    try {
      await sendMsg91Flow({
        mobiles: mobile,
        templateId: tid,
        variables: { VAR1: inv, VAR2: total, VAR3: track.slice(0, 200) },
      });
    } catch (e) {
      logErr("order paid sms", e);
    }
  }
}

export async function notifyOrderCancelled(order: OrderNotifyPayload, reason: string): Promise<void> {
  const email = await customerEmail(order);
  const id = String(order._id);
  const inv = order.invoiceNumber ?? id;
  const track = orderTrackPath(id, email ?? order.guestEmail ?? undefined);

  if (email) {
    try {
      await sendSesEmail({
        to: email,
        subject: `Order cancelled — ${inv}`,
        textBody: `Hi ${order.shipping.fullName},\n\nYour order ${inv} has been cancelled.\n\nReason: ${reason}\n\n${track}\n\n— Prisbo Creations`,
        htmlBody: `<p>Hi ${escapeHtml(order.shipping.fullName)},</p><p>Your order <strong>${escapeHtml(inv)}</strong> has been cancelled.</p><p><strong>Reason:</strong> ${escapeHtml(reason)}</p><p><a href="${escapeHtml(track)}">Order page</a></p><p>— Prisbo Creations</p>`,
      });
    } catch (e) {
      logErr("order cancelled email", e);
    }
  }

  const tid = process.env.MSG91_TEMPLATE_ORDER_CANCELLED?.trim();
  const mobile = orderSmsMobile(order);
  if (tid && mobile) {
    try {
      await sendMsg91Flow({
        mobiles: mobile,
        templateId: tid,
        variables: { VAR1: inv, VAR2: reason.slice(0, 200) },
      });
    } catch (e) {
      logErr("order cancelled sms", e);
    }
  }
}

export async function notifyOrderShipped(order: OrderNotifyPayload): Promise<void> {
  const email = await customerEmail(order);
  const id = String(order._id);
  const inv = order.invoiceNumber ?? id;
  const track = orderTrackPath(id, email ?? order.guestEmail ?? undefined);
  const sr = order.shiprocket;
  const awb = sr?.awb?.trim() ?? "";
  const tr = sr?.trackingUrl?.trim() ?? "";

  if (email) {
    try {
      await sendSesEmail({
        to: email,
        subject: `Shipped — ${inv}`,
        textBody: `Hi ${order.shipping.fullName},\n\nYour order ${inv} is on the way.\n\n${awb ? `Tracking / AWB: ${awb}\n` : ""}${tr ? `Track: ${tr}\n` : ""}\nOrder page: ${track}\n\n— Prisbo Creations`,
        htmlBody: `<p>Hi ${escapeHtml(order.shipping.fullName)},</p><p>Your order <strong>${escapeHtml(inv)}</strong> has shipped.</p>${awb ? `<p>AWB: <code>${escapeHtml(awb)}</code></p>` : ""}${tr ? `<p><a href="${escapeHtml(tr)}">Track shipment</a></p>` : ""}<p><a href="${escapeHtml(track)}">Order page</a></p><p>— Prisbo Creations</p>`,
      });
    } catch (e) {
      logErr("order shipped email", e);
    }
  }

  const tid = process.env.MSG91_TEMPLATE_ORDER_SHIPPED?.trim();
  const mobile = orderSmsMobile(order);
  if (tid && mobile) {
    try {
      await sendMsg91Flow({
        mobiles: mobile,
        templateId: tid,
        variables: {
          VAR1: inv,
          VAR2: awb || "—",
          VAR3: (tr || track).slice(0, 200),
        },
      });
    } catch (e) {
      logErr("order shipped sms", e);
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

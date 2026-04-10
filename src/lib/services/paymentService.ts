import crypto from "crypto";
import Razorpay from "razorpay";
import { getEnv } from "@/lib/env";
import { Payment } from "@/lib/models/Payment";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { attachRazorpayOrderId, markOrderPaid } from "./orderService";

function getRazorpay() {
  const env = getEnv();
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

type PayContext = { userId?: string; guestEmail?: string };

function assertOrderPayableBy(
  order: { userId?: { toString: () => string } | null; guestEmail?: string | null },
  ctx: PayContext
) {
  if (order.userId) {
    if (!ctx.userId || order.userId.toString() !== ctx.userId) throw new Error("Order not found");
    return;
  }
  const ge = order.guestEmail;
  if (!ge || !ctx.guestEmail || ge.toLowerCase() !== ctx.guestEmail.trim().toLowerCase()) {
    throw new Error("Order not found");
  }
}

export async function createRazorpayOrderForAppOrder(appOrderId: string, ctx: PayContext) {
  const order = await Order.findById(appOrderId).lean();
  if (!order) throw new Error("Order not found");
  assertOrderPayableBy(order, ctx);
  const pm = (order as { paymentMethod?: string }).paymentMethod ?? "online";
  if (pm === "cod") throw new Error("This order is cash on delivery — no online payment");
  if (order.status !== "pending") throw new Error("Order is not payable");
  if (order.razorpayOrderId) {
    const env = getEnv();
    return { razorpayOrderId: order.razorpayOrderId, amountPaise: order.totalPaise, keyId: env.RAZORPAY_KEY_ID };
  }

  const rz = getRazorpay();
  const rzOrder = await rz.orders.create({
    amount: order.totalPaise,
    currency: order.currency || "INR",
    receipt: order._id.toString().slice(-20),
    notes: { appOrderId: order._id.toString() },
  });

  await attachRazorpayOrderId(order._id.toString(), rzOrder.id);
  const env = getEnv();
  return {
    razorpayOrderId: rzOrder.id,
    amountPaise: order.totalPaise,
    keyId: env.RAZORPAY_KEY_ID,
  };
}

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const env = getEnv();
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === signature;
}

export async function recordVerifiedPayment(input: {
  appOrderId: string;
  userId?: string;
  guestEmail?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) {
  if (
    !verifyRazorpaySignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.signature
    )
  ) {
    throw new Error("Invalid payment signature");
  }

  const order = await Order.findById(input.appOrderId).lean();
  if (!order) throw new Error("Order not found");
  assertOrderPayableBy(order, { userId: input.userId, guestEmail: input.guestEmail });
  const pm = (order as { paymentMethod?: string }).paymentMethod ?? "online";
  if (pm === "cod") throw new Error("Invalid order for online payment");
  if (order.razorpayOrderId && order.razorpayOrderId !== input.razorpayOrderId) {
    throw new Error("Razorpay order mismatch");
  }

  const already = await Payment.findOne({ orderId: order._id, verified: true }).lean();
  if (already) return { ok: true as const };

  await Payment.create({
    orderId: order._id,
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.razorpayPaymentId,
    amountPaise: order.totalPaise,
    currency: order.currency || "INR",
    verified: true,
  });

  await markOrderPaid(order._id.toString());

  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity },
    });
  }

  return { ok: true as const };
}

/** Best-effort webhook: verify with webhook secret if configured */
export function verifyWebhookSignature(body: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

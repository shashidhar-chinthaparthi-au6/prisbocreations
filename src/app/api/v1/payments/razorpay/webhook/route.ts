import { connectDb } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/services/paymentService";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Order } from "@/lib/models/Order";
import { Payment } from "@/lib/models/Payment";
import { decrementInventoryForOrderItems, markOrderPaid } from "@/lib/services/orderService";

/** Razorpay may send payment.captured — verify HMAC when webhook secret is set */
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature");
  const hasSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.length);
  if (hasSecret && !verifyWebhookSignature(raw, sig)) {
    return jsonError("Invalid webhook signature", 400);
  }
  if (!hasSecret && process.env.NODE_ENV === "production") {
    return jsonError("RAZORPAY_WEBHOOK_SECRET is required in production", 501);
  }

  let payload: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const entity = payload.payload?.payment?.entity as
    | { order_id?: string; id?: string; status?: string }
    | undefined;
  if (!entity?.order_id || !entity.id) return jsonOk({ ignored: true });

  await connectDb();

  const order = await Order.findOne({ razorpayOrderId: entity.order_id }).lean();
  if (!order) return jsonOk({ ignored: true });
  if ((order as { paymentMethod?: string }).paymentMethod === "cod") {
    return jsonOk({ ignored: true });
  }

  const dup = await Payment.findOne({ orderId: order._id, verified: true }).lean();
  if (dup) return jsonOk({ duplicate: true });

  if (entity.status === "captured" || entity.status === "authorized") {
    await Payment.create({
      orderId: order._id,
      razorpayOrderId: entity.order_id,
      razorpayPaymentId: entity.id,
      amountPaise: order.totalPaise,
      currency: order.currency || "INR",
      verified: true,
      raw: entity,
    });
    await markOrderPaid(order._id.toString());
    await decrementInventoryForOrderItems(order.items);
  }

  return jsonOk({ processed: true });
}

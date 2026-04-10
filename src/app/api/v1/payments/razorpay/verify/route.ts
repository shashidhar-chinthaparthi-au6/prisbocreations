import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { recordVerifiedPayment } from "@/lib/services/paymentService";

const schema = z.object({
  appOrderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  guestEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    const session = await getOptionalAuth();
    if (session) {
      const result = await recordVerifiedPayment({
        appOrderId: body.appOrderId,
        userId: session.sub,
        razorpayOrderId: body.razorpay_order_id,
        razorpayPaymentId: body.razorpay_payment_id,
        signature: body.razorpay_signature,
      });
      return jsonOk(result);
    }
    if (!body.guestEmail?.trim()) {
      return jsonError("Email required to verify guest payment", 401);
    }
    const result = await recordVerifiedPayment({
      appOrderId: body.appOrderId,
      guestEmail: body.guestEmail.trim(),
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    return jsonOk(result);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Verification failed";
    return jsonError(msg, 400);
  }
}

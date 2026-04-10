import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { createRazorpayOrderForAppOrder } from "@/lib/services/paymentService";

const schema = z.object({
  orderId: z.string().min(1),
  guestEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    const session = await getOptionalAuth();
    if (session) {
      const out = await createRazorpayOrderForAppOrder(body.orderId, { userId: session.sub });
      return jsonOk(out);
    }
    if (!body.guestEmail?.trim()) {
      return jsonError("Email required to continue payment", 401);
    }
    const out = await createRazorpayOrderForAppOrder(body.orderId, {
      guestEmail: body.guestEmail.trim(),
    });
    return jsonOk(out);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Payment init failed";
    return jsonError(msg, 400);
  }
}

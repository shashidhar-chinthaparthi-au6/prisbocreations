import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { cancelOrderByOwner } from "@/lib/services/orderService";

const schema = z.object({
  reason: z.string().min(3).max(2000),
  guestEmail: z.string().email().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await ctx.params;
    const body = schema.parse(await req.json());
    const session = await getOptionalAuth();

    if (session) {
      const order = await cancelOrderByOwner({
        orderId: id,
        userId: session.sub,
        reason: body.reason,
      });
      return jsonOk(order);
    }
    if (!body.guestEmail?.trim()) {
      return jsonError("Email is required to cancel a guest order", 400);
    }
    const order = await cancelOrderByOwner({
      orderId: id,
      guestEmail: body.guestEmail.trim(),
      reason: body.reason,
    });
    return jsonOk(order);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Cancel failed";
    return jsonError(msg, 400);
  }
}

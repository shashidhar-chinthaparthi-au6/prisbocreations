import { z, ZodError } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getOrderForGuest, getOrderForUser } from "@/lib/services/orderService";
import { syncShiprocketForOrder } from "@/lib/services/shiprocketSync";
import { isShiprocketConfigured } from "@/lib/shiprocket-config";

const bodySchema = z.object({
  guestEmail: z.string().email().optional(),
});

/** Owner-only: retries Shiprocket create/AWB (e.g. after a stuck COD order on older deploys). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await connectDb();
    const { id } = await ctx.params;

    if (!isShiprocketConfigured()) {
      return jsonError("Shipment partner is not configured on this server", 503);
    }

    let guestEmail: string | undefined;
    try {
      const raw = await req.json().catch(() => ({}));
      guestEmail = bodySchema.parse(raw ?? {}).guestEmail?.trim();
    } catch {
      return jsonError("Invalid input", 400);
    }

    const session = await getOptionalAuth();
    let order: Awaited<ReturnType<typeof getOrderForUser>> | null = null;

    if (session) {
      order = await getOrderForUser(id, session.sub);
    } else if (guestEmail) {
      order = await getOrderForGuest(id, guestEmail);
    } else {
      return jsonError("Sign in or send guestEmail in the JSON body", 401);
    }

    if (!order) return jsonError("Order not found", 404);

    const st = order.status;
    if (st === "cancelled" || st === "pending") {
      return jsonError("This order cannot sync a shipment in its current status", 400);
    }

    await syncShiprocketForOrder(id);

    const refreshed = session
      ? await getOrderForUser(id, session.sub)
      : await getOrderForGuest(id, guestEmail!);

    return jsonOk({
      status: refreshed?.status,
      shiprocket: refreshed?.shiprocket ?? null,
    });
  } catch (e) {
    if (e instanceof ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Sync failed";
    return jsonError(msg, 500);
  }
}

import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import {
  buildTrackPayload,
  findOrderForAccountTrack,
  loadEventsWithOptionalRefresh,
} from "@/lib/services/trackingService";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await connectDb();
  const { id } = await ctx.params;
  const order = await findOrderForAccountTrack(id, auth.session.sub);
  if (!order) return jsonError("Order not found", 404);

  const awb = order.shiprocket?.awb;
  const { events, refreshFailed } = await loadEventsWithOptionalRefresh(String(order._id), awb);
  return jsonOk(
    buildTrackPayload({
      order,
      events,
      mode: "account",
      lastFetchAttemptFailed: refreshFailed,
    }),
  );
}

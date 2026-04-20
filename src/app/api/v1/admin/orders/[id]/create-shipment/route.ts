import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getShiprocketConfig } from "@/lib/shiprocket-config";
import { getOrderById } from "@/lib/services/orderService";
import { syncShiprocketForOrder } from "@/lib/services/shiprocketSync";

/**
 * Admin-only: create Shiprocket order, assign AWB, request pickup (same as automatic sync).
 * Use when automatic sync failed or for manual retry after packing.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  if (!getShiprocketConfig()) {
    return jsonError("Shiprocket is not configured", 503);
  }

  await connectDb();
  const { id } = await ctx.params;

  const order = await getOrderById(id);
  if (!order) return jsonError("Not found", 404);

  const st = order.status;
  if (st === "cancelled") {
    return jsonError("Order is cancelled", 400);
  }
  if (st === "pending") {
    return jsonError("Order is not paid yet — complete payment before creating a shipment", 400);
  }

  const sr = order.shiprocket as { shipmentId?: number } | null | undefined;
  if (sr?.shipmentId && sr.shipmentId > 0) {
    return jsonError("Shipment already exists for this order", 409);
  }

  await syncShiprocketForOrder(id);

  const updated = await getOrderById(id);
  const nextSr = updated?.shiprocket as
    | { shipmentId?: number; awb?: string; lastError?: string }
    | null
    | undefined;
  const shipmentId = nextSr?.shipmentId;

  if (!shipmentId || shipmentId <= 0) {
    const err = nextSr?.lastError?.trim();
    return jsonError(err || "Shiprocket did not return a shipment — check order logs", 502);
  }

  return jsonOk({
    shipmentId,
    awb: nextSr?.awb ?? null,
    shiprocket: updated?.shiprocket ?? null,
  });
}

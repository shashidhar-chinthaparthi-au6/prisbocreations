import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getOrderById } from "@/lib/services/orderService";
import {
  parseShiprocketLabelPdfUrl,
  shiprocketGenerateLabel,
} from "@/lib/services/shiprocketApi";
import { getShiprocketConfig } from "@/lib/shiprocket-config";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  if (!getShiprocketConfig()) return jsonError("Shiprocket is not configured", 503);

  await connectDb();
  const { id } = await ctx.params;
  const order = await getOrderById(id);
  if (!order) return jsonError("Not found", 404);

  const sr = order.shiprocket as { shipmentId?: number } | null | undefined;
  const shipmentId = sr && typeof sr.shipmentId === "number" ? sr.shipmentId : null;
  if (!shipmentId || shipmentId <= 0) {
    return jsonError("Order has no Shiprocket shipment id yet", 400);
  }

  try {
    const body = await shiprocketGenerateLabel([shipmentId]);
    const url = parseShiprocketLabelPdfUrl(body);
    if (!url) return jsonError("Shiprocket returned no label URL", 502);
    return jsonOk({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Label generation failed";
    return jsonError(msg, 502);
  }
}

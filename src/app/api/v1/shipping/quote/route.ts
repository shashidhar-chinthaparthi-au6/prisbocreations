import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getShiprocketConfig, isShiprocketConfigured } from "@/lib/shiprocket-config";
import { shiprocketServiceability } from "@/lib/services/shiprocketApi";

const bodySchema = z.object({
  deliveryPostalCode: z.string().min(3).max(12),
  weightKg: z.number().positive().max(100).optional(),
  cod: z.boolean().optional(),
});

/** Public: Shiprocket courier quotes (freight / COD) for checkout. */
export async function POST(req: Request) {
  try {
    if (!isShiprocketConfigured()) {
      return jsonError("Shipping quotes are not configured", 503);
    }
    const body = bodySchema.parse(await req.json());
    const cfg = getShiprocketConfig()!;
    const weightKg = body.weightKg ?? cfg.defaultWeightKg;
    const couriers = await shiprocketServiceability({
      deliveryPostcode: body.deliveryPostalCode,
      weightKg,
      cod: body.cod ?? false,
    });
    return jsonOk({
      pickupPostcode: cfg.pickupPostcode,
      weightKg,
      cod: body.cod ?? false,
      couriers: couriers.map((c) => ({
        courierId: c.courierId,
        courierName: c.courierName,
        freightChargeRupees: c.freightCharge,
        codChargesRupees: c.codCharges,
        totalChargeRupees: c.totalCharge,
        estimatedDeliveryDays: c.estimatedDeliveryDays,
        rating: c.rating,
      })),
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Quote failed";
    return jsonError(msg, 400);
  }
}

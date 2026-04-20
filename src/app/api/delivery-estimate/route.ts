import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api/response";
import { checkServiceability } from "@/lib/serviceability";

const schema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit PIN"),
  cartTotal: z.coerce.number().min(0).default(0),
  weight: z.coerce.number().min(0.1).default(0.5),
  isCOD: z
    .string()
    .optional()
    .default("true")
    .transform((v) => v !== "false"),
});

export async function GET(req: Request) {
  const q = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = schema.safeParse(q);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return jsonError("Invalid query", 400, { issues: flat.fieldErrors });
  }
  const { pincode, cartTotal, weight, isCOD } = parsed.data;

  try {
    const result = await checkServiceability(pincode, weight, cartTotal, isCOD);

    if (!result.serviceable) {
      return jsonOk({ serviceable: false });
    }

    const {
      _selectedCourierId: _a,
      _selectedCourierName: _b,
      _actualCost: _c,
      ...clientSafe
    } = result;
    void _a;
    void _b;
    void _c;
    return jsonOk({
      ...clientSafe,
      days: clientSafe.estimatedDays,
      isCODAvailable: clientSafe.codAvailable,
    });
  } catch (err) {
    console.error("[delivery-estimate]", err);
    const threshold = Number(process.env.FREE_DELIVERY_THRESHOLD ?? 1499);
    const th = Number.isFinite(threshold) && threshold > 0 ? threshold : 1499;
    return jsonOk({
      serviceable: true,
      showFreeDelivery: cartTotal >= th,
      customerShippingCharge: cartTotal >= th ? 0 : 60,
      estimatedDays: "4–7 working days",
      estimatedDate: "Estimated within a week",
      codAvailable: true,
      days: "4–7 working days",
      isCODAvailable: true,
      fallback: true,
    });
  }
}

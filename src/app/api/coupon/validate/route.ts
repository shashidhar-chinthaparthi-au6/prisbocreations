import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { validateCouponCode } from "@/lib/services/couponService";

const schema = z.object({
  code: z.string().min(1),
  subtotalPaise: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    const r = await validateCouponCode(body.code, body.subtotalPaise);
    return jsonOk({
      valid: r.valid,
      discountAmount: r.discountPaise / 100,
      discountPaise: r.discountPaise,
      message: r.message,
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Could not validate", 400);
  }
}

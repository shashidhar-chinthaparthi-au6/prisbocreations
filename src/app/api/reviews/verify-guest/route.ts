import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Order } from "@/lib/models/Order";
import mongoose from "mongoose";
import { orderIsDelivered } from "@/lib/order-delivered";
import { guestVerifyAllowEmail } from "@/lib/review-rate-limit";

const schema = z.object({
  email: z.string().email(),
  productId: z.string().min(1),
});

export async function POST(req: Request) {
  await connectDb();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return jsonError("Invalid input", 400);
  }

  const email = body.email.trim().toLowerCase();
  if (!guestVerifyAllowEmail(email)) {
    return jsonError("Too many attempts. Try again in about an hour.", 429);
  }

  if (!mongoose.isValidObjectId(body.productId)) {
    return jsonOk({ eligible: false, guestName: null as string | null });
  }

  const pid = new mongoose.Types.ObjectId(body.productId);

  const orders = await Order.find({
    guestEmail: email,
    items: { $elemMatch: { productId: pid } },
    status: { $nin: ["cancelled", "pending"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const delivered = orders.find((o) => orderIsDelivered(o));
  if (!delivered) {
    return jsonOk({ eligible: false, guestName: null as string | null });
  }

  const name = delivered.shipping?.fullName?.trim() ?? "";
  return jsonOk({ eligible: true, guestName: name || null });
}

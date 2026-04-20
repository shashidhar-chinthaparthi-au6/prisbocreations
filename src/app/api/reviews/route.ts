import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";
import { Order } from "@/lib/models/Order";
import mongoose from "mongoose";

const schema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(10).max(4000),
  variantId: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    if (!mongoose.isValidObjectId(body.productId)) return jsonError("Invalid product", 400);
    const pid = new mongoose.Types.ObjectId(body.productId);
    const uid = auth.session.sub;

    const delivered = await Order.findOne({
      userId: uid,
      status: "shipped",
      items: { $elemMatch: { productId: pid } },
    }).lean();

    const anyPurchase = await Order.findOne({
      userId: uid,
      status: { $in: ["paid", "processing", "shipped"] },
      items: { $elemMatch: { productId: pid } },
    }).lean();

    if (!anyPurchase) {
      return jsonError("You can only review products you have purchased", 403);
    }

    const isVerified = Boolean(delivered);

    await Review.create({
      productId: pid,
      userId: uid,
      guestName: "",
      rating: body.rating,
      body: body.body.trim(),
      variantId: body.variantId?.trim() ?? "",
      orderId: anyPurchase._id,
      isVerified,
      isApproved: false,
    });

    return jsonOk({
      ok: true,
      message: "Thanks! Your review will appear after a quick check.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Could not submit review", 400);
  }
}

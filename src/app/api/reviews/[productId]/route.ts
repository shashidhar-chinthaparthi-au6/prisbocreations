import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";
import mongoose from "mongoose";

export async function GET(_req: Request, ctx: { params: Promise<{ productId: string }> }) {
  await connectDb();
  const { productId } = await ctx.params;
  if (!mongoose.isValidObjectId(productId)) {
    return jsonOk({ reviews: [], average: 0, count: 0 });
  }
  const reviews = await Review.find({
    productId,
    isApproved: true,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const ratings = reviews.map((r) => r.rating);
  const average =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return jsonOk({
    reviews: reviews.map((r) => ({
      id: String(r._id),
      rating: r.rating,
      body: r.body,
      guestName: r.guestName,
      isVerified: r.isVerified,
      createdAt: r.createdAt,
      variantId: r.variantId,
    })),
    average: Math.round(average * 10) / 10,
    count: reviews.length,
  });
}

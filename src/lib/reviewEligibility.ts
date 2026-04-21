import mongoose from "mongoose";
import { Order } from "@/lib/models/Order";
import { Review } from "@/lib/models/Review";
import { orderIsDelivered } from "@/lib/order-delivered";

function pid(productId: string) {
  return mongoose.Types.ObjectId.isValid(productId) ? new mongoose.Types.ObjectId(productId) : null;
}

export async function getReviewEligibility(
  productId: string,
  userId: string | null,
  guestEmail: string | null,
): Promise<{
  canReview: boolean;
  isVerified: boolean;
  existingReview: string | null;
  eligibleOrderId: string | null;
}> {
  const p = pid(productId);
  if (!p) {
    return { canReview: false, isVerified: false, existingReview: null, eligibleOrderId: null };
  }

  const emailNorm = guestEmail?.trim().toLowerCase() ?? null;

  const existing = await Review.findOne({
    productId: p,
    ...(userId && mongoose.Types.ObjectId.isValid(userId)
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : emailNorm
        ? { guestEmail: emailNorm, userId: null }
        : { _id: null }),
  })
    .select("_id")
    .lean();

  const userQ =
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? { userId: new mongoose.Types.ObjectId(userId) }
      : emailNorm
        ? { guestEmail: emailNorm }
        : null;

  if (!userQ) {
    return {
      canReview: false,
      isVerified: false,
      existingReview: existing ? String(existing._id) : null,
      eligibleOrderId: null,
    };
  }

  const orders = await Order.find({
    status: { $nin: ["cancelled", "pending"] },
    items: { $elemMatch: { productId: p } },
    ...userQ,
  })
    .sort({ createdAt: -1 })
    .lean();

  const deliveredOrder = orders.find((o) => orderIsDelivered(o));

  return {
    canReview: Boolean(deliveredOrder) && !existing,
    isVerified: Boolean(deliveredOrder),
    existingReview: existing ? String(existing._id) : null,
    eligibleOrderId: deliveredOrder ? String(deliveredOrder._id) : null,
  };
}

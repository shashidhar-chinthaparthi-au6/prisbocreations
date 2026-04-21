import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import mongoose from "mongoose";
import { getReviewEligibility } from "@/lib/reviewEligibility";
import { reviewSubmitAllowUser } from "@/lib/review-rate-limit";
import { isTrustedReviewPhotoUrl } from "@/lib/review-photo-trust";
import { sendEmail } from "@/lib/notify/email/ses";
import { appBaseUrl } from "@/lib/notify/config";

const schema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional().or(z.literal("")),
  body: z.string().min(20).max(500),
  photos: z.array(z.string().url()).max(3).default([]),
  orderId: z.string().optional(),
  guestName: z.string().max(120).optional(),
  guestEmail: z.string().email().optional(),
});

function variantLabelFromItem(item: {
  optionLabel?: string | null;
  colorLabel?: string | null;
}): string {
  const o = item.optionLabel?.trim();
  const c = item.colorLabel?.trim();
  if (o && c) return `${c} / ${o}`;
  return c || o || "";
}

export async function POST(req: Request) {
  await connectDb();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return jsonError("Invalid input", 400);
  }

  if (!mongoose.isValidObjectId(body.productId)) return jsonError("Invalid product", 400);

  const auth = await getOptionalAuth();
  const uid = auth?.sub ?? null;
  const guestEmailIn = body.guestEmail?.trim().toLowerCase() ?? null;

  if (!uid && !guestEmailIn) {
    return jsonError("Sign in or verify your purchase email to submit a review", 401);
  }

  if (uid && guestEmailIn) {
    return jsonError("Use either your account or guest email, not both", 400);
  }

  const eligibility = await getReviewEligibility(body.productId, uid, uid ? null : guestEmailIn);
  if (!eligibility.canReview) {
    if (eligibility.existingReview) {
      return jsonError("You already reviewed this product", 409);
    }
    return jsonError("Only customers with a delivered order for this product can review", 403);
  }

  if (uid && !reviewSubmitAllowUser(uid)) {
    return jsonError("Too many reviews submitted today. Try again tomorrow.", 429);
  }

  for (const u of body.photos) {
    if (!isTrustedReviewPhotoUrl(u)) return jsonError("Invalid photo URL", 400);
  }

  const pid = new mongoose.Types.ObjectId(body.productId);
  const orderIdStr = body.orderId ?? eligibility.eligibleOrderId;
  let orderItemIndex = 0;
  let variantName = "";
  let orderOid: mongoose.Types.ObjectId | null = null;

  if (orderIdStr && mongoose.isValidObjectId(orderIdStr)) {
    orderOid = new mongoose.Types.ObjectId(orderIdStr);
    const order = await Order.findById(orderOid).lean();
    if (order) {
      const items = order.items ?? [];
      const idx = items.findIndex((it) => String(it.productId) === body.productId);
      if (idx >= 0) {
        orderItemIndex = idx;
        variantName = variantLabelFromItem(items[idx]!);
      }
    }
  }

  let guestNameResolved = body.guestName?.trim() ?? "";
  if (!uid && !guestNameResolved && orderOid) {
    const o = await Order.findById(orderOid).select("shipping.fullName").lean();
    guestNameResolved = o?.shipping?.fullName?.trim() ?? "";
  }

  const doc = await Review.create({
    productId: pid,
    userId: uid ? new mongoose.Types.ObjectId(uid) : null,
    guestName: uid ? "" : guestNameResolved,
    guestEmail: uid ? null : guestEmailIn,
    rating: body.rating,
    title: body.title?.trim() ?? "",
    body: body.body.trim(),
    photos: body.photos,
    orderId: orderOid,
    orderItemId: String(orderItemIndex),
    variantName,
    isVerified: eligibility.isVerified,
    isApproved: false,
    isRejected: false,
  });

  const autoApprove =
    doc.isVerified &&
    doc.rating >= 4 &&
    doc.body.length >= 50 &&
    (!doc.photos || doc.photos.length === 0);

  if (autoApprove) {
    await Review.updateOne({ _id: doc._id }, { $set: { isApproved: true } });
    doc.isApproved = true;
  }

  const product = await Product.findById(pid).select("name slug").lean();
  const adminEmail = process.env.STORE_OWNER_EMAIL?.trim() || process.env.SES_FROM_EMAIL?.trim();
  if (adminEmail && product) {
    const base = appBaseUrl().replace(/\/$/, "");
    const tplSubject = `New review pending — ${"★".repeat(doc.rating)} ${product.name}`;
    const tplHtml = `
      <p><strong>Rating:</strong> ${doc.rating} stars</p>
      <p><strong>Product:</strong> ${product.name}</p>
      <p><strong>Review:</strong> ${doc.body.slice(0, 400)}${doc.body.length > 400 ? "…" : ""}</p>
      <p><a href="${base}/admin/reviews">Review in admin →</a></p>
    `;
    void sendEmail({
      to: adminEmail,
      subject: tplSubject,
      html: tplHtml,
      log: { event: "ADMIN_REVIEW_PENDING", orderId: orderOid?.toString() },
    }).catch(() => {});
  }

  return jsonOk({
    success: true,
    message: doc.isApproved
      ? "Thanks! Your review is live."
      : "Review submitted — pending approval (usually within 1–2 days).",
    reviewId: String(doc._id),
  });
}

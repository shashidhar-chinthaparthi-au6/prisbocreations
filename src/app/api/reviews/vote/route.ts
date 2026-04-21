import { z } from "zod";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";
import { ReviewVote } from "@/lib/models/ReviewVote";
import mongoose from "mongoose";

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

const schema = z.object({
  reviewId: z.string().min(1),
  isHelpful: z.boolean(),
});

export async function POST(req: Request) {
  await connectDb();
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return jsonError("Invalid input", 400);
  }

  if (!mongoose.isValidObjectId(body.reviewId)) return jsonError("Invalid review", 400);

  const auth = await getOptionalAuth();
  const uid = auth?.sub && mongoose.isValidObjectId(auth.sub) ? auth.sub : null;
  const ip = clientIp(req);

  const review = await Review.findById(body.reviewId).select("helpfulCount notHelpfulCount").lean();
  if (!review) return jsonError("Review not found", 404);

  const filter = uid
    ? { reviewId: new mongoose.Types.ObjectId(body.reviewId), userId: new mongoose.Types.ObjectId(uid) }
    : { reviewId: new mongoose.Types.ObjectId(body.reviewId), ipAddress: ip };

  const existing = await ReviewVote.findOne(filter).lean();

  let helpful = review.helpfulCount ?? 0;
  let notHelpful = review.notHelpfulCount ?? 0;

  if (existing) {
    if (existing.isHelpful === body.isHelpful) {
      return jsonOk({ helpfulCount: helpful, notHelpfulCount: notHelpful, yourVote: body.isHelpful });
    }
    if (existing.isHelpful) {
      helpful = Math.max(0, helpful - 1);
      notHelpful += 1;
    } else {
      notHelpful = Math.max(0, notHelpful - 1);
      helpful += 1;
    }
    await ReviewVote.updateOne({ _id: existing._id }, { $set: { isHelpful: body.isHelpful } });
  } else {
    if (body.isHelpful) helpful += 1;
    else notHelpful += 1;
    await ReviewVote.create({
      reviewId: new mongoose.Types.ObjectId(body.reviewId),
      userId: uid ? new mongoose.Types.ObjectId(uid) : null,
      ipAddress: uid ? null : ip,
      isHelpful: body.isHelpful,
    });
  }

  await Review.updateOne(
    { _id: body.reviewId },
    { $set: { helpfulCount: helpful, notHelpfulCount: notHelpful } },
  );

  return jsonOk({
    helpfulCount: helpful,
    notHelpfulCount: notHelpful,
    yourVote: body.isHelpful,
  });
}

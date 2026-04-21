import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getReviewEligibility } from "@/lib/reviewEligibility";
import mongoose from "mongoose";

export async function GET(req: Request) {
  await connectDb();
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId")?.trim() ?? "";
  if (!productId || !mongoose.isValidObjectId(productId)) {
    return jsonError("Invalid productId", 400);
  }

  const auth = await getOptionalAuth();
  const emailParam = url.searchParams.get("email")?.trim().toLowerCase() ?? null;

  const userId = auth?.sub ?? null;
  const guestEmail = userId ? null : emailParam;

  const e = await getReviewEligibility(productId, userId, guestEmail);
  return jsonOk(e);
}

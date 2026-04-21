import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return jsonError("Invalid id", 400);
  await connectDb();
  const r = await Review.findByIdAndUpdate(
    id,
    { $set: { isApproved: true, isRejected: false } },
    { new: true },
  ).lean();
  if (!r) return jsonError("Not found", 404);
  return jsonOk({ ok: true });
}

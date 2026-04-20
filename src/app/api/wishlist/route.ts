import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";
import { Wishlist } from "@/lib/models/Wishlist";
import mongoose from "mongoose";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  await connectDb();
  let doc = await Wishlist.findOne({ userId: auth.session.sub }).lean();
  if (!doc) {
    doc = (
      await Wishlist.create({
        userId: new mongoose.Types.ObjectId(auth.session.sub),
        productIds: [],
      })
    ).toObject();
  }
  const ids = (doc.productIds ?? []).map((id) => String(id));
  return jsonOk({ productIds: ids });
}

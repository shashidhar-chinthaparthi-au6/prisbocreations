import { z } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Wishlist } from "@/lib/models/Wishlist";
import { Product } from "@/lib/models/Product";

const schema = z.object({
  productIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const { productIds } = schema.parse(await req.json());
    const uid = new mongoose.Types.ObjectId(auth.session.sub);
    const raw = productIds.map((id) => id.trim()).filter(Boolean);
    const validOids = raw.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
    if (!validOids.length) {
      let doc = await Wishlist.findOne({ userId: uid }).lean();
      if (!doc) {
        doc = (
          await Wishlist.create({
            userId: uid,
            productIds: [],
          })
        ).toObject();
      }
      const ids = (doc.productIds ?? []).map((id) => String(id));
      return jsonOk({ productIds: ids });
    }

    const existingProducts = await Product.find({ _id: { $in: validOids } })
      .select("_id")
      .lean();
    const toAdd = existingProducts.map((p) => p._id);

    await Wishlist.findOneAndUpdate(
      { userId: uid },
      { $addToSet: { productIds: { $each: toAdd } } },
      { upsert: true, new: true },
    );

    const doc = await Wishlist.findOne({ userId: uid }).lean();
    const ids = (doc?.productIds ?? []).map((id) => String(id));
    return jsonOk({ productIds: ids });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Failed", 400);
  }
}

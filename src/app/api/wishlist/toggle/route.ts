import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Wishlist } from "@/lib/models/Wishlist";
import mongoose from "mongoose";

const schema = z.object({ productId: z.string().min(1) });

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const { productId } = schema.parse(await req.json());
    if (!mongoose.isValidObjectId(productId)) return jsonError("Invalid product", 400);
    const oid = new mongoose.Types.ObjectId(productId);
    const uid = new mongoose.Types.ObjectId(auth.session.sub);

    let doc = await Wishlist.findOne({ userId: uid });
    if (!doc) {
      doc = await Wishlist.create({ userId: uid, productIds: [oid] });
      return jsonOk({ wishlisted: true, productId, on: true, count: 1 });
    }
    const list = [...(doc.productIds ?? []).map((id) => id.toString())];
    const i = list.indexOf(productId);
    if (i === -1) {
      doc.productIds = [...(doc.productIds ?? []), oid];
    } else {
      doc.productIds = (doc.productIds ?? []).filter((id) => id.toString() !== productId);
    }
    await doc.save();
    const on = i === -1;
    return jsonOk({ wishlisted: on, productId, on, count: doc.productIds.length });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Failed", 400);
  }
}

import { z } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";

const schema = z.object({
  notifOrderUpdates: z.boolean().optional(),
  notifOffers: z.boolean().optional(),
  notifSMS: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return jsonError("Invalid input", 400);
  }

  if (Object.keys(body).length === 0) {
    return jsonError("No fields to update", 400);
  }

  await connectDb();
  const uid = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(uid)) return jsonError("Not found", 404);

  const $set: Record<string, boolean> = {};
  if (body.notifOrderUpdates !== undefined) $set.notifOrderUpdates = body.notifOrderUpdates;
  if (body.notifOffers !== undefined) $set.notifOffers = body.notifOffers;
  if (body.notifSMS !== undefined) $set.notifSMS = body.notifSMS;

  const res = await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(uid) }, { $set });
  if (res.matchedCount === 0) return jsonError("Not found", 404);

  return jsonOk({ success: true });
}

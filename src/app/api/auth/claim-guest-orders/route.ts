import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Order } from "@/lib/models/Order";

export async function POST() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const email = auth.session.email?.trim().toLowerCase();
  if (!email) {
    return jsonError("Unauthorized", 401);
  }

  await connectDb();
  const uid = new mongoose.Types.ObjectId(auth.session.sub);

  const filter = {
    guestEmail: email,
    $or: [{ userId: null }, { userId: { $exists: false } }],
  };

  const guestOrders = await Order.find(filter).select("invoiceNumber").lean();
  if (guestOrders.length === 0) {
    return jsonOk({ claimed: 0, orderNumbers: [] as string[] });
  }

  await Order.updateMany(filter, { $set: { userId: uid } });

  const orderNumbers = guestOrders
    .map((o) => (typeof o.invoiceNumber === "string" ? o.invoiceNumber : ""))
    .filter(Boolean);

  return jsonOk({
    claimed: guestOrders.length,
    orderNumbers,
  });
}

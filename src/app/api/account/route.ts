import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Wishlist } from "@/lib/models/Wishlist";
import { Address } from "@/lib/models/Address";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function DELETE() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const uid = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(uid)) return jsonError("Not found", 404);
  const oid = new mongoose.Types.ObjectId(uid);

  await connectDb();

  const fakeEmail = `deleted_${uid}@prisbo.invalid`;

  try {
    await User.collection.updateOne(
      { _id: oid },
      {
        $set: {
          name: "Deleted User",
          email: fakeEmail,
          passwordHash: "DELETED",
          profileImageUrl: null,
          deletedAt: new Date(),
          savedCartLines: [],
          addresses: [],
        },
        $unset: {
          phone: 1,
          emailChangeTokenHash: 1,
          emailChangeTo: 1,
          emailChangeExpiry: 1,
          passwordResetTokenHash: 1,
          passwordResetExpires: 1,
          emailVerifyToken: 1,
        },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return jsonError(msg, 400);
  }

  await Wishlist.deleteMany({ userId: oid });

  await Address.deleteMany({ userId: oid });

  return jsonOk({ success: true, redirect: "/" });
}

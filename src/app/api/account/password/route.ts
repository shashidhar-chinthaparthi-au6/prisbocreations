import { z } from "zod";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
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

  await connectDb();
  const uid = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(uid)) return jsonError("Not found", 404);

  const user = await User.findById(uid).select("passwordHash").exec();
  if (!user?.passwordHash || user.passwordHash === "DELETED") {
    return jsonError("Password change is not available for this account", 400);
  }

  const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!valid) {
    return jsonError("Incorrect password. Try again.", 400, { code: "current_password_wrong" });
  }

  const sameAsOld = await bcrypt.compare(body.newPassword, user.passwordHash);
  if (sameAsOld) {
    return jsonError("New password must be different from your current password", 400, {
      code: "same_as_current",
    });
  }

  const hash = await bcrypt.hash(body.newPassword, 12);
  await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(uid) }, { $set: { passwordHash: hash } });

  return jsonOk({ success: true });
}

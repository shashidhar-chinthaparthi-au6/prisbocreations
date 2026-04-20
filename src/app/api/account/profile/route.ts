import { z } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { Order } from "@/lib/models/Order";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { computeInitials } from "@/lib/account/compute-initials";
import { normalizeIndianMobile10, isIndianMobile10 } from "@/lib/account/phone-in";

const patchSchema = z.object({
  fullName: z.string().min(2).max(80).optional(),
  phone: z.string().optional(),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await connectDb();
  const uid = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(uid)) return jsonError("Not found", 404);

  const user = await User.findById(uid).lean();
  if (!user?.email) return jsonError("Not found", 404);

  const oid = new mongoose.Types.ObjectId(uid);
  const orderCount = await Order.countDocuments({ userId: oid });

  const pendingEmail =
    user.emailChangeTo &&
    user.emailChangeExpiry &&
    new Date(user.emailChangeExpiry).getTime() > Date.now()
      ? user.emailChangeTo
      : null;

  const profileImageUrl = String(user.profileImageUrl ?? "").trim();
  const nameStr = String(user.name ?? "");
  const initialsStored = String(user.avatarInitials ?? "").trim();

  return jsonOk({
    fullName: nameStr,
    email: String(user.email),
    phone: user.phone ? String(user.phone) : "",
    avatarUrl: profileImageUrl || null,
    avatarInitials: initialsStored || (nameStr ? computeInitials(nameStr) : "?"),
    memberSince: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    orderCount,
    pendingEmailChange: pendingEmail,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.issues[0]?.message ?? "Invalid input";
      return jsonError(first, 400, { issues: e.flatten() });
    }
    return jsonError("Invalid JSON", 400);
  }

  if (Object.keys(body).length === 0) {
    return jsonError("No fields to update", 400);
  }

  await connectDb();
  const uid = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(uid)) return jsonError("Not found", 404);

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};

  if (body.fullName !== undefined) {
    const n = body.fullName.trim();
    $set.name = n;
    $set.avatarInitials = computeInitials(n);
  }
  if (body.phone !== undefined) {
    const p = body.phone.trim();
    if (p === "") {
      $unset.phone = 1;
    } else {
      const d = normalizeIndianMobile10(p);
      if (!isIndianMobile10(d)) {
        return jsonError("Enter a valid 10-digit mobile number", 400);
      }
      $set.phone = d;
    }
  }

  const mongoUpdate: Record<string, unknown> = {};
  if (Object.keys($set).length) mongoUpdate.$set = $set;
  if (Object.keys($unset).length) mongoUpdate.$unset = $unset;
  if (!Object.keys(mongoUpdate).length) return jsonError("No fields to update", 400);

  const res = await User.collection.updateOne({ _id: new mongoose.Types.ObjectId(uid) }, mongoUpdate as never);
  if (res.matchedCount === 0) return jsonError("Not found", 404);

  return GET();
}

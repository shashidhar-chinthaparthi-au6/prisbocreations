import { z } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { hashEmailChangeToken, newEmailChangeRawToken } from "@/lib/account/email-change-token";
import { sendEmailChangeVerificationEmail } from "@/lib/notify/auth-email";
import { appBaseUrl } from "@/lib/notify/config";

const bodySchema = z.object({
  newEmail: z.string().email().transform((s) => s.trim().toLowerCase()),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return jsonError("Valid email required", 400);
  }

  await connectDb();
  const uid = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(uid)) return jsonError("Not found", 404);

  const user = await User.findById(uid).lean();
  if (!user?.email) return jsonError("Not found", 404);

  const current = String(user.email).toLowerCase();
  if (body.newEmail === current) {
    return jsonError("That is already your email", 400);
  }

  const taken = await User.exists({ email: body.newEmail });
  if (taken) {
    return jsonError("That email is already in use", 400);
  }

  const raw = newEmailChangeRawToken();
  const hash = hashEmailChangeToken(raw);
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await User.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(uid) },
    {
      $set: {
        emailChangeTokenHash: hash,
        emailChangeTo: body.newEmail,
        emailChangeExpiry: expiry,
      },
    },
  );

  const verifyLink = `${appBaseUrl()}/api/account/verify-email?token=${encodeURIComponent(raw)}`;
  const firstName = user.name?.trim().split(/\s+/)[0] ?? "there";
  await sendEmailChangeVerificationEmail(body.newEmail, verifyLink, firstName, uid);

  return jsonOk({ success: true });
}

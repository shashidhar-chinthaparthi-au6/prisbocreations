import mongoose from "mongoose";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { computeInitials } from "@/lib/account/compute-initials";
import { loadMeUserDto } from "@/lib/services/meUserLoader";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await connectDb();
  const user = await loadMeUserDto(auth.session.sub);
  if (!user) return jsonError("Not found", 404);

  return jsonOk({ user });
}

function isHttpOrHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const profileImageUrlField = z
  .union([
    z
      .string()
      .max(2048)
      .transform((s) => s.trim())
      .refine(isHttpOrHttpsUrl, "Must be a valid http(s) URL"),
    z.literal(""),
    z.null(),
  ])
  .optional();

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(32).optional().nullable(),
  profileImageUrl: profileImageUrlField,
});

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.issues[0]?.message ?? "Invalid input";
      return jsonError(first, 400);
    }
    return jsonError("Invalid JSON", 400);
  }

  if (Object.keys(body).length === 0) {
    return jsonError("No fields to update", 400);
  }

  await connectDb();

  const userId = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return jsonError("Not found", 404);
  }
  const oid = new mongoose.Types.ObjectId(userId);
  const idFilter = { _id: oid };

  const exists = await User.exists(idFilter);
  if (!exists) return jsonError("Not found", 404);

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};

  if (body.name !== undefined) {
    const n = body.name.trim();
    $set.name = n;
    $set.avatarInitials = computeInitials(n);
  }
  if (body.phone !== undefined) {
    const p = body.phone?.trim();
    if (p) $set.phone = p;
    else $unset.phone = 1;
  }
  if (body.profileImageUrl !== undefined) {
    if (body.profileImageUrl === null || body.profileImageUrl === "") {
      $unset.profileImageUrl = 1;
    } else {
      $set.profileImageUrl = body.profileImageUrl;
    }
  }

  const hasSet = Object.keys($set).length > 0;
  const hasUnset = Object.keys($unset).length > 0;
  if (!hasSet && !hasUnset) {
    return jsonError("No fields to update", 400);
  }

  const mongoUpdate: Record<string, unknown> = {};
  if (hasSet) mongoUpdate.$set = $set;
  if (hasUnset) mongoUpdate.$unset = $unset;

  try {
    /** Use collection driver so `$set` is not stripped when an old `User` model is cached without newer paths (Next.js HMR). */
    const res = await User.collection.updateOne(idFilter, mongoUpdate as never);
    if (res.matchedCount === 0) return jsonError("Not found", 404);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return jsonError(msg, 400);
  }

  const refreshed = await loadMeUserDto(userId);
  if (!refreshed) return jsonError("Not found", 404);

  return jsonOk({ user: refreshed });
}

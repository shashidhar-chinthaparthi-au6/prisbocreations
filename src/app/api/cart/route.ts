import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { User } from "@/lib/models/User";
import { mergeCartLines, normalizeCartLines } from "@/lib/cart/normalize-lines";
import mongoose from "mongoose";

const linesBody = z.object({
  lines: z.array(z.record(z.unknown())).max(200),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  if (!mongoose.Types.ObjectId.isValid(auth.session.sub)) {
    return jsonError("Unauthorized", 401);
  }
  await connectDb();
  const user = await User.findById(auth.session.sub).select("savedCartLines").lean();
  const lines = normalizeCartLines(user?.savedCartLines ?? []);
  return jsonOk({ lines });
}

export async function PUT(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  if (!mongoose.Types.ObjectId.isValid(auth.session.sub)) {
    return jsonError("Unauthorized", 401);
  }
  try {
    const body = linesBody.parse(await req.json());
    const lines = normalizeCartLines(body.lines);
    await connectDb();
    await User.findByIdAndUpdate(auth.session.sub, { savedCartLines: lines });
    return jsonOk({ lines });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid cart payload", 400);
    return jsonError("Failed to save cart", 400);
  }
}

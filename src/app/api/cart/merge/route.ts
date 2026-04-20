import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { User } from "@/lib/models/User";
import { mergeCartLines, normalizeCartLines } from "@/lib/cart/normalize-lines";
import mongoose from "mongoose";

const bodySchema = z.object({
  lines: z.array(z.record(z.unknown())).max(200),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  if (!mongoose.Types.ObjectId.isValid(auth.session.sub)) {
    return jsonError("Unauthorized", 401);
  }
  try {
    const body = bodySchema.parse(await req.json());
    const guest = normalizeCartLines(body.lines);
    await connectDb();
    const user = await User.findById(auth.session.sub).select("savedCartLines").lean();
    const server = normalizeCartLines(user?.savedCartLines ?? []);
    const merged = mergeCartLines(server, guest);
    await User.findByIdAndUpdate(auth.session.sub, { savedCartLines: merged });
    return jsonOk({ lines: merged });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid cart payload", 400);
    return jsonError("Merge failed", 400);
  }
}

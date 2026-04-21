import { z } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Review } from "@/lib/models/Review";

const schema = z.object({
  text: z.string().min(1).max(300),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!mongoose.isValidObjectId(id)) return jsonError("Invalid id", 400);
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return jsonError("Invalid body", 400);
  }
  await connectDb();
  const r = await Review.findByIdAndUpdate(
    id,
    {
      $set: {
        adminReply: body.text.trim(),
        adminRepliedAt: new Date(),
      },
    },
    { new: true },
  ).lean();
  if (!r) return jsonError("Not found", 404);
  return jsonOk({ ok: true });
}

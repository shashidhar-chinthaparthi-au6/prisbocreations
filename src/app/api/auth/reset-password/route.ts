import { z } from "zod";
import { connectDb } from "@/lib/db";
import { resetPasswordWithEmailToken } from "@/lib/services/authService";
import { jsonOk, jsonError } from "@/lib/api/response";
import { requireJsonContentType } from "@/lib/auth/rate-limit-memory";

const schema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  newPassword: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  if (!requireJsonContentType(req)) {
    return jsonError("Content-Type must be application/json", 415);
  }
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    await resetPasswordWithEmailToken(body.email, body.token, body.newPassword);
    return jsonOk({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Reset failed";
    if (/expired/i.test(msg)) return jsonError("Link expired", 400);
    return jsonError(msg, 400);
  }
}

import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { resetPasswordWithToken } from "@/lib/services/authService";

const schema = z.object({
  uid: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    await resetPasswordWithToken(body.uid, body.token, body.password);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Reset failed";
    return jsonError(msg, 400);
  }
}

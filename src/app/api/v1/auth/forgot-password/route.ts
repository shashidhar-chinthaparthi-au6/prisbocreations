import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { requestPasswordReset } from "@/lib/services/authService";

const schema = z.object({
  email: z.string().email(),
});

/** Public: request password reset email (always 200 if body valid — no email enumeration). */
export async function POST(req: Request) {
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    await requestPasswordReset(body.email);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonOk({ ok: true });
  }
}

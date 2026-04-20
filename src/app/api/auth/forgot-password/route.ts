import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requestStorefrontPasswordReset } from "@/lib/services/authService";
import { jsonOk, jsonError } from "@/lib/api/response";
import { rateLimitMemory, requireJsonContentType } from "@/lib/auth/rate-limit-memory";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  if (!requireJsonContentType(req)) {
    return jsonError("Content-Type must be application/json", 415);
  }

  try {
    await connectDb();
    const body = schema.parse(await req.json());
    const emailKey = body.email.toLowerCase().trim();
    if (!rateLimitMemory(`forgot:${emailKey}`, 3, 60 * 60 * 1000)) {
      return jsonOk({ success: true, accountFound: true });
    }
    const { accountFound } = await requestStorefrontPasswordReset(body.email);
    return jsonOk({ success: true, accountFound });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonOk({ success: true, accountFound: true });
  }
}

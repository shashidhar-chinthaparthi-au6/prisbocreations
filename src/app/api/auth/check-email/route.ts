import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { User } from "@/lib/models/User";
import { clientIpFromRequest, rateLimitMemory } from "@/lib/auth/rate-limit-memory";

export async function GET(req: Request) {
  const ip = clientIpFromRequest(req);
  if (!rateLimitMemory(`check-email:${ip}`, 10, 60 * 1000)) {
    return jsonError("Too many requests. Try again shortly.", 429);
  }

  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Valid email required", 400);
  }
  await connectDb();
  const exists = Boolean(await User.exists({ email }));
  return jsonOk({ exists });
}

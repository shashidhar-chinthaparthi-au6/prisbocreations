import { connectDb } from "@/lib/db";
import { storefrontResetTokenValid } from "@/lib/services/authService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";
  if (!token || !email) return jsonError("Missing token or email", 400);
  try {
    await connectDb();
    const valid = await storefrontResetTokenValid(email, token);
    return jsonOk({ valid });
  } catch {
    return jsonOk({ valid: false });
  }
}

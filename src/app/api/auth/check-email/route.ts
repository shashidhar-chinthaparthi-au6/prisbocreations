import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Valid email required", 400);
  }
  await connectDb();
  const exists = Boolean(await User.exists({ email }));
  return jsonOk({ exists });
}

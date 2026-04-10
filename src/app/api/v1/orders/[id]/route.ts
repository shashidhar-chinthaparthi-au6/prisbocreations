import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getOrderForUser } from "@/lib/services/orderService";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  await connectDb();
  const { id } = await ctx.params;
  const order = await getOrderForUser(id, auth.session.sub);
  if (!order) return jsonError("Not found", 404);
  return jsonOk(order);
}

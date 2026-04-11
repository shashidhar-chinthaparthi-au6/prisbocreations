import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getOrderById, updateOrderStatus } from "@/lib/services/orderService";

const patchSchema = z.object({
  status: z.enum(["pending", "paid", "processing", "shipped", "cancelled"]),
  /** Optional; when status is cancelled, stored on the order (defaults server-side if omitted). */
  cancelReason: z.string().max(2000).optional(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  const { id } = await ctx.params;
  const order = await getOrderById(id);
  if (!order) return jsonError("Not found", 404);
  return jsonOk(order);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());
    const order = await updateOrderStatus(id, body.status, {
      cancelReason: body.cancelReason,
    });
    if (!order) return jsonError("Not found", 404);
    return jsonOk(order);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Update failed", 400);
  }
}

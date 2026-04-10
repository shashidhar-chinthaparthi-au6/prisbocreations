import { connectDb } from "@/lib/db";
import { getProductBySlug } from "@/lib/services/catalogService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  await connectDb();
  const { slug } = await ctx.params;
  const p = await getProductBySlug(slug);
  if (!p) return jsonError("Not found", 404);
  return jsonOk(p);
}

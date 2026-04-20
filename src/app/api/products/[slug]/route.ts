import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getStorefrontProductDetailBySlug } from "@/lib/services/storefrontCatalog";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  await connectDb();
  const { slug } = await ctx.params;
  const p = await getStorefrontProductDetailBySlug(slug);
  if (!p) return jsonError("Not found", 404);
  return jsonOk(p);
}

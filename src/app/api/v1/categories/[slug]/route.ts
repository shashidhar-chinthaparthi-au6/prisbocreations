import { connectDb } from "@/lib/db";
import { getCategoryBySlug } from "@/lib/services/catalogService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  await connectDb();
  const { slug } = await ctx.params;
  const cat = await getCategoryBySlug(slug);
  if (!cat) return jsonError("Not found", 404);
  return jsonOk(cat);
}

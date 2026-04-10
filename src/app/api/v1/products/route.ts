import { connectDb } from "@/lib/db";
import { listProducts } from "@/lib/services/catalogService";
import { jsonOk } from "@/lib/api/response";

export async function GET(req: Request) {
  await connectDb();
  const url = new URL(req.url);
  const categorySlug = url.searchParams.get("category") ?? undefined;
  const subcategorySlug = url.searchParams.get("subcategory") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const rows = await listProducts({
    categorySlug: categorySlug ?? undefined,
    subcategorySlug: subcategorySlug ?? undefined,
    q: q ?? undefined,
  });
  return jsonOk(rows);
}

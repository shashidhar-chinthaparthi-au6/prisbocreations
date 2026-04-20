import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import {
  listStorefrontCategoryRows,
  listStorefrontSubcategoryRowsForCategory,
} from "@/lib/services/storefrontCatalog";

export async function GET(req: Request) {
  await connectDb();
  const url = new URL(req.url);
  const forCategory = url.searchParams.get("subcategoriesFor")?.trim().toLowerCase();
  if (forCategory) {
    const rows = await listStorefrontSubcategoryRowsForCategory(forCategory);
    return jsonOk({ subcategories: rows });
  }
  const categories = await listStorefrontCategoryRows();
  return jsonOk({ categories });
}

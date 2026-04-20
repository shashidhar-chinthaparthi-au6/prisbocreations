import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { listStorefrontFilterFacets } from "@/lib/services/storefrontCatalog";

export async function GET(req: Request) {
  await connectDb();
  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.trim().toLowerCase() || undefined;
  const subcategory = url.searchParams.get("subcategory")?.trim().toLowerCase() || undefined;
  const subcategoryCategory = url.searchParams.get("subcategoryCategory")?.trim().toLowerCase() || undefined;

  const facets = await listStorefrontFilterFacets({
    categorySlugs: category ? [category] : undefined,
    subcategorySlug: subcategory,
    subcategoryCategorySlug: subcategoryCategory,
  });

  return jsonOk(facets);
}

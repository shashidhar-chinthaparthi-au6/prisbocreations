import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { listNavCategoryTree } from "@/lib/services/catalogService";
import {
  listStorefrontProductSuggestions,
  listStorefrontProducts,
} from "@/lib/services/storefrontCatalog";

/** Grouped suggestions + optional full results when `results=1`. */
export async function GET(req: Request) {
  await connectDb();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const wantResults = url.searchParams.get("results") === "1";
  const limit = Math.min(12, Number(url.searchParams.get("limit") ?? "8") || 8);

  if (wantResults && q) {
    const { items, total } = await listStorefrontProducts({ q, page: 1, pageSize: 48, sort: "relevance" });
    return jsonOk({ query: q, products: items, total });
  }

  if (!q) {
    return jsonOk({ products: [], categories: [], tags: [] });
  }

  const [products, nav] = await Promise.all([
    listStorefrontProductSuggestions(q, 4),
    listNavCategoryTree(),
  ]);

  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const categories = nav
    .filter((c) => rx.test(c.name))
    .slice(0, 3)
    .map((c) => ({ slug: c.slug, name: c.name }));

  const tagSet = new Set<string>();
  for (const c of nav) {
    for (const s of c.subcategories) {
      if (rx.test(s.name)) tagSet.add(s.name);
    }
  }
  const tags = [...tagSet].slice(0, 3).map((name) => ({ label: name }));

  return jsonOk({
    query: q,
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      thumb: p.thumb,
      displayPricePaise: p.displayPricePaise,
    })),
    categories,
    tags,
  });
}

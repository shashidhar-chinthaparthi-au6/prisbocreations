import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { listStorefrontProducts, type StorefrontSort } from "@/lib/services/storefrontCatalog";

function parseSort(raw: string | null): StorefrontSort | undefined {
  const s = raw?.trim();
  if (
    s === "relevance" ||
    s === "newest" ||
    s === "price_asc" ||
    s === "price_desc" ||
    s === "popular" ||
    s === "name_asc"
  ) {
    return s;
  }
  return undefined;
}

export async function GET(req: Request) {
  await connectDb();
  const url = new URL(req.url);
  const category = url.searchParams.getAll("category").filter(Boolean);
  const categoryCsv = url.searchParams.get("categories");
  const categorySlugs = [
    ...category,
    ...(categoryCsv ? categoryCsv.split(",").map((s) => s.trim()).filter(Boolean) : []),
  ];
  const subcategorySlug = url.searchParams.get("subcategory") ?? undefined;
  const subcategoryCategorySlug = url.searchParams.get("subcategoryCategory") ?? undefined;
  const featured = url.searchParams.get("featured") === "true";
  const idsRaw = url.searchParams.get("ids");
  const ids = idsRaw
    ? idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const recipient = url.searchParams.get("recipient") ?? undefined;
  const q = url.searchParams.get("q") ?? url.searchParams.get("search") ?? undefined;
  const sort = parseSort(url.searchParams.get("sort"));
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const limit = Number(url.searchParams.get("limit") ?? url.searchParams.get("pageSize") ?? "12") || 12;
  const inStockOnly = url.searchParams.get("in_stock") === "1" || url.searchParams.get("in_stock") === "true";

  const priceMinRupees = url.searchParams.get("price_min");
  const priceMaxRupees = url.searchParams.get("price_max");
  const priceMinPaise =
    priceMinRupees != null && priceMinRupees !== ""
      ? Math.max(0, Math.round(Number(priceMinRupees) * 100))
      : undefined;
  const priceMaxPaise =
    priceMaxRupees != null && priceMaxRupees !== ""
      ? Math.max(0, Math.round(Number(priceMaxRupees) * 100))
      : undefined;

  const result = await listStorefrontProducts({
    categorySlugs: categorySlugs.length ? categorySlugs : undefined,
    subcategorySlug,
    subcategoryCategorySlug,
    featured,
    ids,
    recipient,
    q,
    sort,
    page,
    pageSize: limit,
    inStockOnly,
    priceMinPaise,
    priceMaxPaise,
  });

  return jsonOk(result);
}

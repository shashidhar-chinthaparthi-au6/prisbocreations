import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { productToExploreCardDTO } from "@/lib/home-explore-dto";
import type { ExploreFeedMode } from "@/lib/explore-feed-mode";
import { listExploreProductsPaged } from "@/lib/services/catalogService";

function parseMode(raw: string | null): ExploreFeedMode {
  return raw === "all-active" ? "all-active" : "non-featured";
}

export async function GET(req: Request) {
  await connectDb();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "18");
  const skip = Number(url.searchParams.get("skip") ?? "0");
  const mode = parseMode(url.searchParams.get("mode"));

  const rows = await listExploreProductsPaged(limit, skip, mode);
  const data = rows.map((p) => productToExploreCardDTO(p));

  return jsonOk({ items: data, mode });
}

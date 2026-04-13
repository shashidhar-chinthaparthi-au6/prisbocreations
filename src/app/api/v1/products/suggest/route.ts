import { connectDb } from "@/lib/db";
import { listProductSuggestions } from "@/lib/services/catalogService";
import { jsonOk } from "@/lib/api/response";

export async function GET(req: Request) {
  await connectDb();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const items = await listProductSuggestions(q, 8);
  return jsonOk(items);
}

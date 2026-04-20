import { connectDb } from "@/lib/db";
import { jsonOk } from "@/lib/api/response";
import { listNavCategoryTree } from "@/lib/services/catalogService";

export async function GET() {
  await connectDb();
  const tree = await listNavCategoryTree();
  return jsonOk(tree);
}

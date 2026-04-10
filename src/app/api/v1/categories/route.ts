import { connectDb } from "@/lib/db";
import { listCategories } from "@/lib/services/catalogService";
import { jsonOk } from "@/lib/api/response";

export async function GET() {
  await connectDb();
  const rows = await listCategories();
  return jsonOk(rows);
}

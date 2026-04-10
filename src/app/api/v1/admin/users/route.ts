import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk } from "@/lib/api/response";
import { listUsersAdmin } from "@/lib/services/adminService";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  return jsonOk(await listUsersAdmin());
}

import { connectDb } from "@/lib/db";
import { getUserById } from "@/lib/services/authService";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await connectDb();
  const session = auth.session;
  const user = await getUserById(session.sub);
  if (!user) return jsonError("Not found", 404);

  return jsonOk({
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
    },
  });
}

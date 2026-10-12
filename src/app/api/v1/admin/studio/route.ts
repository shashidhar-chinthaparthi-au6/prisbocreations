import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { loadStudio, saveStudio } from "@/lib/services/adminStudioService";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    return jsonOk(await loadStudio());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 500);
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    return jsonOk(await saveStudio(await req.json(), auth.session.sub));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save";
    return jsonError(msg, 400);
  }
}

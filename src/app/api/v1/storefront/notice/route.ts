import { jsonError, jsonOk } from "@/lib/api/response";
import { getPublicNotice } from "@/lib/services/adminStudioService";

export async function GET() {
  try {
    return jsonOk(await getPublicNotice());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 500);
  }
}

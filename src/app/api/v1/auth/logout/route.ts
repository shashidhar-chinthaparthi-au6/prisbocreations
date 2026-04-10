import { clearSessionCookie } from "@/lib/auth/session";
import { jsonOk } from "@/lib/api/response";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ loggedOut: true });
}

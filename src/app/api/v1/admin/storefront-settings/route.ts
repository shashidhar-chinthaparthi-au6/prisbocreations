import { revalidateTag } from "next/cache";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getAdminStorefrontSettings, setAssistantEnabled } from "@/lib/services/storefrontSettingsService";

const bodySchema = z.object({
  assistantEnabled: z.boolean(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    return jsonOk(await getAdminStorefrontSettings());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 500);
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError("Invalid input", 400, { issues: parsed.error.flatten() });
    }
    const data = await setAssistantEnabled(parsed.data.assistantEnabled);
    revalidateTag("storefront-settings");
    return jsonOk(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}

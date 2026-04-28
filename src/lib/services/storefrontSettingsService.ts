import { unstable_cache } from "next/cache";
import { jsonError } from "@/lib/api/response";
import { connectDb } from "@/lib/db";
import { StorefrontSettings } from "@/lib/models/StorefrontSettings";

const KEY = "default";

async function readAssistantEnabledUncached(): Promise<boolean> {
  await connectDb();
  const doc = await StorefrontSettings.findOne({ singletonKey: KEY }).select("assistantEnabled").lean();
  if (!doc) return true;
  return doc.assistantEnabled !== false;
}

/** Cached for layout / API; invalidate with `revalidateTag("storefront-settings")` after admin updates. */
export const getAssistantEnabledCached = unstable_cache(readAssistantEnabledUncached, ["storefront-assistant-enabled-v1"], {
  tags: ["storefront-settings"],
});

export async function getAdminStorefrontSettings(): Promise<{ assistantEnabled: boolean }> {
  await connectDb();
  const doc = await StorefrontSettings.findOne({ singletonKey: KEY }).lean();
  return { assistantEnabled: doc?.assistantEnabled !== false };
}

export async function setAssistantEnabled(value: boolean): Promise<{ assistantEnabled: boolean }> {
  await connectDb();
  await StorefrontSettings.findOneAndUpdate(
    { singletonKey: KEY },
    { $set: { assistantEnabled: value } },
    { upsert: true, new: true },
  );
  return { assistantEnabled: value };
}

/** Gate `/api/storefront/assistant*` when the feature is disabled in Admin → Storefront. */
export async function storefrontAssistantUnavailableResponse(): Promise<ReturnType<typeof jsonError> | null> {
  const ok = await getAssistantEnabledCached();
  if (ok) return null;
  return jsonError("Prisbo Assistant is turned off.", 403);
}

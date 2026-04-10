import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getS3Config } from "@/lib/s3-config";
import { deleteObjectByKey, publicUrlToKey } from "@/lib/s3-server";

const bodySchema = z.object({
  url: z.string().url(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const cfg = getS3Config();
  if (!cfg) {
    return jsonError("S3 is not configured", 503);
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await req.json();
    body = bodySchema.parse(json);
  } catch {
    return jsonError("Invalid body (url required)", 400);
  }

  const key = publicUrlToKey(body.url, cfg);
  if (!key) {
    return jsonError("URL is not an object in this bucket", 400);
  }

  try {
    await deleteObjectByKey(cfg, key);
    return jsonOk({ deleted: true as const });
  } catch (e) {
    console.error(e);
    return jsonError("Could not delete object", 500);
  }
}

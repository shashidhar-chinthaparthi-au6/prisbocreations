import { requireAdmin } from "@/lib/api/auth";
import { jsonError } from "@/lib/api/response";
import { getS3Config } from "@/lib/s3-config";
import { getObjectBytes } from "@/lib/s3-server";

/** Allow streaming product videos through admin preview (slightly over max upload). */
const MAX_BYTES = 105 * 1024 * 1024;

function safeKey(raw: string | null): string | null {
  if (!raw) return null;
  const key = decodeURIComponent(raw);
  if (!key.startsWith("uploads/")) return null;
  if (key.includes("..") || key.includes("//")) return null;
  return key;
}

/** Admin-only: stream S3 object so previews work while the bucket stays private. Requires IAM s3:GetObject on uploads/*. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const cfg = getS3Config();
  if (!cfg) {
    return jsonError("S3 is not configured", 503);
  }

  const key = safeKey(new URL(req.url).searchParams.get("key"));
  if (!key) {
    return jsonError("Invalid or missing key", 400);
  }

  try {
    const { body, contentType } = await getObjectBytes(cfg, key);
    if (body.byteLength > MAX_BYTES) {
      return jsonError("Object too large", 413);
    }
    return new Response(Buffer.from(body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e: unknown) {
    const meta =
      e && typeof e === "object" && "$metadata" in e
        ? (e as { $metadata?: { httpStatusCode?: number } }).$metadata
        : undefined;
    if (meta?.httpStatusCode === 404) {
      return jsonError("Not found", 404);
    }
    if (meta?.httpStatusCode === 403) {
      return jsonError("S3 denied read — add s3:GetObject on uploads/* to your IAM user", 403);
    }
    console.error(e);
    return jsonError("Could not load object", 500);
  }
}

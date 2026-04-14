import { connectDb } from "@/lib/db";
import { getUserById } from "@/lib/services/authService";
import { requireAuth } from "@/lib/api/auth";
import { jsonError } from "@/lib/api/response";
import { getS3Config } from "@/lib/s3-config";
import {
  extractCustomerProfileUploadKey,
  getObjectBytes,
  publicUrlToCustomerUploadKey,
} from "@/lib/s3-server";

/**
 * Streams the signed-in user's profile image from S3 so the browser does not need a public bucket
 * or permissive bucket policy (avoids broken `<img src="https://s3…">` after upload).
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await connectDb();
  const user = await getUserById(auth.session.sub);
  if (!user) return jsonError("Not found", 404);

  const stored = typeof user.profileImageUrl === "string" ? user.profileImageUrl.trim() : "";
  if (!stored) return jsonError("No profile image", 404);

  const cfg = getS3Config();
  if (!cfg) return jsonError("Storage not configured", 503);

  let key =
    publicUrlToCustomerUploadKey(stored, cfg) ?? extractCustomerProfileUploadKey(stored);
  if (!key) return jsonError("Invalid profile image URL", 404);

  try {
    const { body, contentType } = await getObjectBytes(cfg, key);
    const bytes = Buffer.from(body);
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return jsonError("Image unavailable", 502);
  }
}

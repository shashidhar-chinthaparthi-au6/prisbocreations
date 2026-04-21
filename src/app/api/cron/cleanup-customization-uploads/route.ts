import { NextResponse } from "next/server";
import {
  cleanupLocalCustomizationUploads,
  cleanupS3CustomizationUploads,
  CUSTOMIZATION_UPLOAD_RETENTION_MS,
} from "@/lib/customization-upload-cleanup";

export const runtime = "nodejs";

/**
 * Deletes buyer customization uploads older than 7 days (abandoned cart files).
 * Schedule via Vercel Cron / external scheduler:
 *   GET /api/cron/cleanup-customization-uploads
 *   Header: Authorization: Bearer <CRON_SECRET>
 *
 * Set `CRON_SECRET` in env (min 16 chars recommended).
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not set" },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const maxAgeMs = CUSTOMIZATION_UPLOAD_RETENTION_MS;
  const local = await cleanupLocalCustomizationUploads({ maxAgeMs });
  const s3 = await cleanupS3CustomizationUploads({ maxAgeMs });

  return NextResponse.json({
    ok: true,
    data: {
      retentionDays: 7,
      localDeleted: local.deleted,
      s3Deleted: s3.deleted,
      s3Scanned: s3.scanned,
    },
  });
}

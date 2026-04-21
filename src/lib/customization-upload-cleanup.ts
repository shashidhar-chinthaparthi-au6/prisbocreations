import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getS3Config } from "@/lib/s3-config";

const PREFIX = "uploads/customization/";

function s3Client(cfg: NonNullable<ReturnType<typeof getS3Config>>) {
  return new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

/** Remove files in `public/uploads/customization/` older than maxAgeMs (by mtime). */
export async function cleanupLocalCustomizationUploads(opts: {
  maxAgeMs: number;
  now?: number;
}): Promise<{ deleted: number }> {
  const dir = path.join(process.cwd(), "public", "uploads", "customization");
  const now = opts.now ?? Date.now();
  let deleted = 0;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return { deleted: 0 };
  }
  for (const name of entries) {
    if (name.startsWith(".") || name === ".gitkeep") continue;
    const full = path.join(dir, name);
    try {
      const st = await stat(full);
      if (!st.isFile()) continue;
      if (now - st.mtimeMs > opts.maxAgeMs) {
        await unlink(full);
        deleted += 1;
      }
    } catch {
      /* ignore per file */
    }
  }
  return { deleted };
}

/** List and delete S3 objects under `uploads/customization/` older than maxAgeMs. */
export async function cleanupS3CustomizationUploads(opts: {
  maxAgeMs: number;
  now?: number;
}): Promise<{ deleted: number; scanned: number }> {
  const cfg = getS3Config();
  if (!cfg) return { deleted: 0, scanned: 0 };

  const s3 = s3Client(cfg);
  const cutoff = (opts.now ?? Date.now()) - opts.maxAgeMs;
  let deleted = 0;
  let scanned = 0;
  let token: string | undefined;

  do {
    const out = await s3.send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: PREFIX,
        ContinuationToken: token,
      }),
    );
    for (const obj of out.Contents ?? []) {
      scanned += 1;
      const key = obj.Key;
      if (!key || !obj.LastModified) continue;
      if (obj.LastModified.getTime() < cutoff) {
        await s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
        deleted += 1;
      }
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);

  return { deleted, scanned };
}

export const CUSTOMIZATION_UPLOAD_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

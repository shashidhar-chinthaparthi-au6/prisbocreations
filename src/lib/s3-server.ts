import { randomBytes } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Config } from "@/lib/s3-config";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export function extForContentType(contentType: string): string | undefined {
  return MIME_EXT[contentType];
}

function client(cfg: S3Config) {
  return new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    // Default WHEN_SUPPORTED adds checksum query params to presigned PUTs; browsers only send
    // Content-Type, which breaks the signature. WHEN_REQUIRED keeps URLs compatible with XHR PUT.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

export type PresignedKeyPrefix = "uploads" | "customer-uploads";

export async function createPresignedPut(
  cfg: S3Config,
  contentType: string,
  opts?: { keyPrefix?: PresignedKeyPrefix },
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const ext = extForContentType(contentType);
  if (!ext) {
    throw new Error("Unsupported content type");
  }

  const prefix = opts?.keyPrefix ?? "uploads";
  // Buyer refs use `uploads/customer-uploads/*` so one IAM policy `arn:...:bucket/uploads/*`
  // covers admin catalog and storefront uploads (top-level `customer-uploads/*` often has no PutObject).
  const key =
    prefix === "customer-uploads"
      ? `uploads/customer-uploads/${Date.now()}-${randomBytes(8).toString("hex")}${ext}`
      : `${prefix}/${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const s3 = client(cfg);

  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 15 });
  const publicUrl = `${cfg.publicBaseUrl}/${key}`;

  return { uploadUrl, publicUrl, key };
}

export function publicUrlToKey(url: string, cfg: S3Config): string | null {
  const base = cfg.publicBaseUrl.replace(/\/$/, "");
  if (!url.startsWith(base)) return null;
  const rest = url.slice(base.length).replace(/^\//, "");
  if (!rest.startsWith("uploads/")) return null;
  if (rest.includes("..") || rest.includes("//")) return null;
  return rest;
}

/** Public URL must point at our bucket under buyer-ref prefixes (see createPresignedPut). */
export function publicUrlToCustomerUploadKey(url: string, cfg: S3Config): string | null {
  const base = cfg.publicBaseUrl.replace(/\/$/, "");
  if (!url.startsWith(base)) return null;
  const rest = url.slice(base.length).replace(/^\//, "");
  if (rest.includes("..") || rest.includes("//")) return null;
  if (rest.startsWith("uploads/customer-uploads/")) return rest;
  /** Legacy keys before nested path (still valid if objects exist). */
  if (rest.startsWith("customer-uploads/")) return rest;
  return null;
}

export async function deleteObjectByKey(cfg: S3Config, key: string): Promise<void> {
  const s3 = client(cfg);
  await s3.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  );
}

export async function getObjectBytes(
  cfg: S3Config,
  key: string,
): Promise<{ body: Uint8Array; contentType: string }> {
  const s3 = client(cfg);
  const out = await s3.send(
    new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  );
  if (!out.Body) {
    throw new Error("Empty object body");
  }
  const body = await out.Body.transformToByteArray();
  const contentType = out.ContentType || "application/octet-stream";
  return { body, contentType };
}

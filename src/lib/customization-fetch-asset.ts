import { readFile } from "fs/promises";
import path from "path";
import { isTrustedCustomizationAssetUrl, extractCustomizationUploadKey } from "@/lib/customization-trust-url";
import { isTrustedCustomerImageUrl } from "@/lib/customer-upload";
import { getS3Config } from "@/lib/s3-config";
import { getObjectBytes, publicUrlToKey, extractCustomerProfileUploadKey } from "@/lib/s3-server";

/** Load image bytes for a trusted buyer-upload URL (S3 or local /public). */
export async function loadTrustedCustomizationBytes(url: string): Promise<Buffer | null> {
  const u = url.trim();
  if (!u) return null;
  if (!isTrustedCustomizationAssetUrl(u) && !isTrustedCustomerImageUrl(u)) return null;

  const cfg = getS3Config();
  if (cfg) {
    const key =
      extractCustomizationUploadKey(u) ??
      publicUrlToKey(u, cfg) ??
      extractCustomerProfileUploadKey(u) ??
      null;
    if (key) {
      try {
        const { body } = await getObjectBytes(cfg, key);
        return Buffer.from(body);
      } catch {
        return null;
      }
    }
  }

  try {
    const parsed = new URL(u);
    const pathname = parsed.pathname;
    if (pathname.startsWith("/uploads/customization/") || pathname.startsWith("/uploads/")) {
      const disk = path.join(process.cwd(), "public", pathname);
      return await readFile(disk);
    }
  } catch {
    /* ignore */
  }
  return null;
}

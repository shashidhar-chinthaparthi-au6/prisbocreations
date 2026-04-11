import { getS3Config } from "@/lib/s3-config";
import { publicUrlToCustomerUploadKey } from "@/lib/s3-server";

export function isTrustedCustomerImageUrl(url: string): boolean {
  const cfg = getS3Config();
  if (!cfg) return false;
  return Boolean(publicUrlToCustomerUploadKey(url.trim(), cfg));
}

/** Optional S3 config for presigned uploads (server-only). */
export type S3Config = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Base URL where objects are publicly readable (no trailing slash), e.g. CloudFront or S3 website URL. */
  publicBaseUrl: string;
};

export function getS3Config(): S3Config | null {
  const region = process.env.AWS_REGION?.trim();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const bucket =
    process.env.S3_BUCKET_NAME?.trim() || process.env.AWS_S3_BUCKET?.trim();
  const publicBaseUrl =
    process.env.S3_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.trim();

  if (!region || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    return null;
  }

  return {
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
  };
}

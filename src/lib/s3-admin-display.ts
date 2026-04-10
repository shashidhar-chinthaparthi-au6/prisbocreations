function s3PublicBaseConfigured(): boolean {
  const u = process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.trim();
  return Boolean(u && u.length > 0);
}

/**
 * For admin UI: use same-origin proxy so thumbnails/previews work when S3 objects are private
 * (AccessDenied on direct GET). Requires IAM `s3:GetObject` on `uploads/*` for the app user.
 */
export function adminS3DisplaySrc(storedUrl: string): string {
  if (!s3PublicBaseConfigured()) return storedUrl;
  const base = process.env.NEXT_PUBLIC_S3_PUBLIC_URL!.replace(/\/$/, "");
  if (!storedUrl.startsWith(base)) return storedUrl;
  const key = storedUrl.slice(base.length).replace(/^\//, "");
  if (!key.startsWith("uploads/") || key.includes("..")) return storedUrl;
  return `/api/v1/admin/s3/inline?key=${encodeURIComponent(key)}`;
}

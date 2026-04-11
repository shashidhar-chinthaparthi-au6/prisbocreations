/** Shared rules for admin media uploads (images + product videos). */

export const ADMIN_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const ADMIN_VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export const MAX_ADMIN_IMAGE_BYTES = 5 * 1024 * 1024;
/** Storefront buyer reference images (S3 key uploads/customer-uploads/*). High-res phone / print refs. */
export const MAX_CUSTOMER_IMAGE_BYTES = 30 * 1024 * 1024;
/** Product videos (S3 direct upload; local dev writes to disk). */
export const MAX_ADMIN_VIDEO_BYTES = 100 * 1024 * 1024;

const VIDEO_EXT_RE = /\.(mp4|webm|mov)(\?|$)/i;

export function isVideoMime(mime: string): boolean {
  if (!mime) return false;
  return (ADMIN_VIDEO_MIMES as readonly string[]).includes(mime);
}

export function isImageMime(mime: string): boolean {
  if (!mime) return false;
  return (ADMIN_IMAGE_MIMES as readonly string[]).includes(mime);
}

export function maxBytesForAdminMime(mime: string): number {
  return isVideoMime(mime) ? MAX_ADMIN_VIDEO_BYTES : MAX_ADMIN_IMAGE_BYTES;
}

export function maxBytesForCustomerImageMime(mime: string): number {
  return isImageMime(mime) ? MAX_CUSTOMER_IMAGE_BYTES : 0;
}

export function isVideoUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  return VIDEO_EXT_RE.test(path);
}

export function allAdminUploadMimes(imagesOnly: boolean): string[] {
  return imagesOnly ? [...ADMIN_IMAGE_MIMES] : [...ADMIN_IMAGE_MIMES, ...ADMIN_VIDEO_MIMES];
}

export function isAdminUploadableImageFile(f: File): boolean {
  if (isImageMime(f.type)) return true;
  return !f.type && /\.(jpe?g|png|gif|webp)$/i.test(f.name);
}

export function isAdminUploadableVideoFile(f: File): boolean {
  if (isVideoMime(f.type)) return true;
  return !f.type && /\.(mp4|webm|mov)$/i.test(f.name);
}

export function isAdminUploadableMediaFile(f: File): boolean {
  return isAdminUploadableImageFile(f) || isAdminUploadableVideoFile(f);
}

/** Ensures `file.type` is set when the browser leaves it empty (needed for presign + API). */
export function withInferredMimeType(file: File): File {
  if (file.type) return file;
  const n = file.name.toLowerCase();
  const type =
    n.endsWith(".jpg") || n.endsWith(".jpeg")
      ? "image/jpeg"
      : n.endsWith(".png")
        ? "image/png"
        : n.endsWith(".gif")
          ? "image/gif"
          : n.endsWith(".webp")
            ? "image/webp"
            : n.endsWith(".mp4")
              ? "video/mp4"
              : n.endsWith(".webm")
                ? "video/webm"
                : n.endsWith(".mov")
                  ? "video/quicktime"
                  : "";
  if (!type) return file;
  return new File([file], file.name, { type, lastModified: file.lastModified });
}

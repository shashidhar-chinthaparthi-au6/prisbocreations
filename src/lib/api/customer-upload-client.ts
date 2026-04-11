import { apiFetch } from "@/lib/api/fetch-client";
import { isImageMime, maxBytesForCustomerImageMime, withInferredMimeType } from "@/lib/media-upload";

export async function uploadCustomerImageToS3(file: File): Promise<string> {
  const f = withInferredMimeType(file);
  if (!isImageMime(f.type)) {
    throw new Error("Please choose an image file (JPEG, PNG, WebP, or GIF).");
  }
  const maxBytes = maxBytesForCustomerImageMime(f.type);
  if (f.size > maxBytes) {
    throw new Error(
      `Image too large (max ${Math.round(maxBytes / (1024 * 1024))} MB). Try saving as JPEG or reduce dimensions.`,
    );
  }
  const { uploadUrl, publicUrl } = await apiFetch<{
    uploadUrl: string;
    publicUrl: string;
  }>("/api/v1/uploads/customer-presign", {
    method: "POST",
    body: JSON.stringify({ contentType: f.type, contentLength: f.size }),
  });
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": f.type },
    body: f,
  });
  if (!res.ok) {
    const hint =
      res.status === 413
        ? "File rejected by storage (too large)."
        : "Check your connection, or try a different format (JPEG, PNG, WebP, GIF).";
    throw new Error(`Upload failed (${res.status}). ${hint}`);
  }
  return publicUrl;
}

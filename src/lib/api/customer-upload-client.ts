import { apiFetch } from "@/lib/api/fetch-client";
import { withInferredMimeType } from "@/lib/media-upload";

export async function uploadCustomerImageToS3(file: File): Promise<string> {
  const f = withInferredMimeType(file);
  if (!f.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPEG, PNG, WebP, or GIF).");
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
    throw new Error("Upload failed. Try a smaller image or different format.");
  }
  return publicUrl;
}

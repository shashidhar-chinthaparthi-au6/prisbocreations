import { apiFetch } from "@/lib/api/fetch-client";
import {
  isImageMime,
  isVideoMime,
  maxBytesForAdminMime,
  withInferredMimeType,
} from "@/lib/media-upload";

type PresignRes = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  contentType: string;
};

function xhrPut(
  url: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(file);
  });
}

function xhrPostLocal(file: File, onProgress: (percent: number) => void): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/admin/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        onProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText) as {
          ok: boolean;
          data?: { url: string };
          error?: string;
        };
        if (xhr.status >= 200 && xhr.status < 300 && json.ok && json.data?.url) {
          onProgress(100);
          resolve(json.data.url);
        } else {
          reject(new Error(json.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Invalid upload response"));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export function isS3PublicConfigured(): boolean {
  const u = process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.trim();
  return Boolean(u && u.length > 0);
}

function assertAllowedFile(file: File, imagesOnly: boolean): void {
  const mime = file.type;
  if (imagesOnly) {
    if (!isImageMime(mime)) {
      throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
    }
  } else {
    if (!isImageMime(mime) && !isVideoMime(mime)) {
      throw new Error("Allowed: images (JPEG, PNG, WebP, GIF) or video (MP4, WebM, MOV)");
    }
  }
  const max = maxBytesForAdminMime(mime);
  if (file.size > max) {
    throw new Error(`File too large (max ${Math.round(max / (1024 * 1024))} MB for this type)`);
  }
}

/**
 * Upload image or (when `imagesOnly` is false) video with progress.
 * S3 presigned PUT when `NEXT_PUBLIC_S3_PUBLIC_URL` is set, else local `/api/v1/admin/upload`.
 */
export async function uploadAdminMediaWithProgress(
  file: File,
  onProgress: (percent: number) => void,
  options: { imagesOnly?: boolean } = {},
): Promise<string> {
  const { imagesOnly = false } = options;
  const f = withInferredMimeType(file);
  assertAllowedFile(f, imagesOnly);

  onProgress(0);

  if (isS3PublicConfigured()) {
    const presign = await apiFetch<PresignRes>("/api/v1/admin/s3/presign", {
      method: "POST",
      body: JSON.stringify({
        contentType: f.type,
        contentLength: f.size,
      }),
    });
    await xhrPut(presign.uploadUrl, f, presign.contentType, onProgress);
    onProgress(100);
    return presign.publicUrl;
  }

  return xhrPostLocal(f, onProgress);
}

/** Category/subcategory image uploads only. */
export async function uploadAdminImageWithProgress(
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  return uploadAdminMediaWithProgress(file, onProgress, { imagesOnly: true });
}

/** Remove object from S3 when URL belongs to this app’s public base; no-op if not S3 or wrong base. */
export async function deleteAdminS3ObjectIfManaged(url: string): Promise<void> {
  const base = process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.replace(/\/$/, "");
  if (!base || !url.startsWith(base)) return;
  await apiFetch<{ deleted: true }>("/api/v1/admin/s3/delete", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

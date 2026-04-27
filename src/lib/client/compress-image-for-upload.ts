import { isImageMime, MAX_ADMIN_IMAGE_BYTES } from "@/lib/media-upload";

const DEFAULT_MAX_EDGE = 2560;

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "image";
}

/**
 * Browser-side resize + re-encode so the file fits under `maxBytes` (default admin image cap).
 * GIFs are unchanged if already under limit; oversized GIFs throw (animation cannot be preserved via canvas).
 */
export async function compressImageFileForAdmin(
  file: File,
  opts?: { maxBytes?: number; maxEdge?: number },
): Promise<File> {
  const maxBytes = opts?.maxBytes ?? MAX_ADMIN_IMAGE_BYTES;
  const maxEdge = opts?.maxEdge ?? DEFAULT_MAX_EDGE;

  if (!isImageMime(file.type)) return file;

  if (file.type === "image/gif") {
    if (file.size <= maxBytes) return file;
    throw new Error(
      "GIF is larger than the upload limit. Use a smaller GIF or convert to WebP/JPEG.",
    );
  }

  if (file.size <= maxBytes) return file;

  const bmp = await createImageBitmap(file);
  try {
    let w = bmp.width;
    let h = bmp.height;
    let scale = Math.min(1, maxEdge / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not compress image");

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, w, h);
    };
    draw();

    const base = stripExtension(file.name);
    const ts = Date.now();

    const webpSupported = (): boolean => {
      try {
        return canvas.toDataURL("image/webp").startsWith("data:image/webp");
      } catch {
        return false;
      }
    };

    const encodeWebp = (q: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/webp", q);
      });

    const encodeJpeg = (q: number) =>
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", q);
      });

    if (webpSupported()) {
      let quality = 0.9;
      for (let i = 0; i < 18; i++) {
        const blob = await encodeWebp(quality);
        if (blob && blob.size <= maxBytes) {
          return new File([blob], `${base}-${ts}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });
        }
        quality -= 0.05;
        if (quality < 0.35) break;
      }
    }

    let quality = 0.9;
    for (let i = 0; i < 18; i++) {
      const blob = await encodeJpeg(quality);
      if (blob && blob.size <= maxBytes) {
        return new File([blob], `${base}-${ts}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
      quality -= 0.05;
      if (quality < 0.35) break;
    }

    let factor = 0.82;
    while (Math.min(w, h) > 480) {
      w = Math.max(480, Math.round(w * factor));
      h = Math.max(480, Math.round(h * factor));
      canvas.width = w;
      canvas.height = h;
      const c2 = canvas.getContext("2d");
      if (!c2) break;
      c2.drawImage(bmp, 0, 0, w, h);
      for (let q = 0.82; q >= 0.4; q -= 0.06) {
        const blob = await encodeJpeg(q);
        if (blob && blob.size <= maxBytes) {
          return new File([blob], `${base}-${ts}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
        }
      }
      factor = 0.88;
    }

    throw new Error("Could not compress image enough. Try a smaller original file.");
  } finally {
    bmp.close();
  }
}

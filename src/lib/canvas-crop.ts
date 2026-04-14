import type { Area } from "react-easy-crop";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      image.crossOrigin = "anonymous";
    }
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Image failed to load")));
    image.src = url;
  });
}

export function outputMimeForFile(originalMime: string): { mime: string; quality?: number } {
  if (originalMime === "image/png") return { mime: "image/png" };
  if (originalMime === "image/webp") return { mime: "image/webp", quality: 0.92 };
  return { mime: "image/jpeg", quality: 0.92 };
}

function scaleCanvasToMaxEdge(source: HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const w = source.width;
  const h = source.height;
  const m = Math.max(w, h);
  if (m <= maxEdge) return source;
  const scale = maxEdge / m;
  const w2 = Math.max(1, Math.round(w * scale));
  const h2 = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = w2;
  c.height = h2;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h, 0, 0, w2, h2);
  return c;
}

export type CroppedBlobOptions = {
  /** If set and the crop is larger, scale down so the longest edge is at most this (px). */
  maxEdge?: number;
  /** Override output MIME (e.g. `image/jpeg` for avatars). */
  outputMime?: string;
  /** JPEG / WebP quality when encoding (0–1). */
  quality?: number;
};

/** Renders `pixelCrop` from `imageSrc` (object URL or remote URL with CORS) to a blob. */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  originalMime: string,
  opts?: CroppedBlobOptions,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelCrop.width));
  canvas.height = Math.max(1, Math.round(pixelCrop.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const work =
    opts?.maxEdge != null && opts.maxEdge > 0
      ? scaleCanvasToMaxEdge(canvas, opts.maxEdge)
      : canvas;

  const inferred = outputMimeForFile(originalMime);
  const mime = opts?.outputMime?.trim() || inferred.mime;
  const quality =
    opts?.quality ??
    (mime === "image/jpeg" || mime === "image/webp" ? inferred.quality ?? 0.92 : undefined);

  return new Promise((resolve, reject) => {
    work.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode image"));
      },
      mime,
      quality,
    );
  });
}

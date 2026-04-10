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

/** Renders `pixelCrop` from `imageSrc` (object URL or remote URL with CORS) to a blob. */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  originalMime: string,
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

  const { mime, quality } = outputMimeForFile(originalMime);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode image"));
      },
      mime,
      quality,
    );
  });
}

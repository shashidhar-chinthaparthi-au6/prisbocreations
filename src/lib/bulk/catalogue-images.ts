import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import type { BulkCatalogueItem } from "@/lib/bulk/catalogue";

export type CataloguePdfItem = BulkCatalogueItem & {
  imageDataUri?: string;
};

const MAX_BYTES = 4_000_000;

function isPublicHttps(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0"
    ) {
      return false;
    }
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function publicFile(url: string): string | null {
  if (!url.startsWith("/") || url.startsWith("//") || url.includes("\0")) return null;
  const rel = url.replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return null;
  const root = path.resolve(process.cwd(), "public");
  const full = path.resolve(root, rel);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

async function loadImageBuffer(url: string): Promise<Buffer | null> {
  const local = publicFile(url);
  if (local) {
    try {
      const buf = await readFile(local);
      return buf.byteLength > MAX_BYTES ? null : buf;
    } catch {
      return null;
    }
  }
  if (!isPublicHttps(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

async function toDataUri(url: string | undefined): Promise<string | undefined> {
  if (!url) return undefined;
  const buf = await loadImageBuffer(url);
  if (!buf) return undefined;
  try {
    const jpeg = await sharp(buf)
      .rotate()
      .resize(480, 480, { fit: "cover", position: "centre" })
      .jpeg({ quality: 72 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return undefined;
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      out[index] = await fn(items[index]);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

export async function embedCatalogueImages(items: BulkCatalogueItem[]): Promise<CataloguePdfItem[]> {
  return mapPool(items, 6, async (item) => {
    const imageDataUri = await toDataUri(item.imageUrl);
    return imageDataUri ? { ...item, imageDataUri } : { ...item };
  });
}

import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getS3Config } from "@/lib/s3-config";
import { putPublicUploadObject } from "@/lib/s3-server";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_WIDTH = 1200;

async function processImage(buf: Buffer, mime: string): Promise<{ out: Buffer; contentType: string }> {
  const meta = await sharp(buf).metadata();
  const needResize = meta.width != null && meta.width > MAX_WIDTH;
  let pipeline = sharp(buf).rotate();
  if (needResize) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  if (mime === "image/jpeg") {
    const out = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    return { out, contentType: "image/jpeg" };
  }
  if (mime === "image/png") {
    const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    return { out, contentType: "image/png" };
  }
  if (mime === "image/webp") {
    const out = await pipeline.webp({ quality: 85 }).toBuffer();
    return { out, contentType: "image/webp" };
  }
  throw new Error("Unsupported image type");
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("image") ?? form.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return jsonError("Missing image", 400);
  }

  const mime = (file as File).type;
  const ext = MIME_EXT[mime];
  if (!ext) {
    return jsonError("Use JPG, PNG, or WebP", 400);
  }

  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.length === 0) return jsonError("Empty file", 400);
  if (buf.length > MAX_BYTES) return jsonError("Max 2 MB per file", 400);

  let processed: Buffer;
  let contentType: string;
  try {
    const r = await processImage(buf, mime);
    processed = r.out;
    contentType = r.contentType;
  } catch {
    return jsonError("Could not process image", 400);
  }

  const outExt = MIME_EXT[contentType] ?? ext;
  const base = `${Date.now()}-${randomBytes(8).toString("hex")}${outExt}`;
  const cfg = getS3Config();

  if (cfg) {
    const key = `uploads/categories/${base}`;
    try {
      await putPublicUploadObject(cfg, key, processed, contentType);
    } catch {
      return jsonError("Storage upload failed", 500);
    }
    const url = `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    return jsonOk({ url });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "categories");
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, base);
  await writeFile(fsPath, processed);
  const url = `/uploads/categories/${base}`;
  return jsonOk({ url });
}

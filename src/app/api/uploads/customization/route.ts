import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { jsonError, jsonOk } from "@/lib/api/response";
import { customizationUploadAllowIp } from "@/lib/customization-upload-rate-limit";
import { getS3Config } from "@/lib/s3-config";
import { putPublicUploadObject } from "@/lib/s3-server";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIM = 3000;

function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip")?.trim() ??
    "unknown"
  );
}

function safeOriginalFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 100);
  return base || "image";
}

function publicOrigin(req: Request): string {
  const u = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? (u.protocol === "https:" ? "https" : "http");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!customizationUploadAllowIp(ip)) {
    return jsonError("Too many uploads from this network. Try again in about an hour.", 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid multipart body", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError('Expected multipart field "file"', 400);
  }

  const mime = (file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  if (!ALLOWED.has(mime)) {
    return jsonError("Please upload JPG, PNG, or WebP only", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("Maximum file size is 10 MB", 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buf).rotate().metadata();
  let pipeline =
    meta.width &&
    meta.height &&
    (meta.width > MAX_DIM || meta.height > MAX_DIM)
      ? sharp(buf).rotate().resize(MAX_DIM, MAX_DIM, {
          fit: "inside",
          withoutEnlargement: true,
        })
      : sharp(buf).rotate();

  let outBuf: Buffer;
  let outMime: string;
  let ext: string;
  if (mime === "image/png") {
    outBuf = await pipeline.png({ compressionLevel: 8 }).toBuffer();
    outMime = "image/png";
    ext = ".png";
  } else if (mime === "image/webp") {
    outBuf = await pipeline.webp({ quality: 90 }).toBuffer();
    outMime = "image/webp";
    ext = ".webp";
  } else {
    outBuf = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    outMime = "image/jpeg";
    ext = ".jpg";
  }

  const fileId = randomUUID();
  const filename = safeOriginalFilename(file.name);
  const cfg = getS3Config();

  if (cfg) {
    const key = `uploads/customization/${fileId}${ext}`;
    await putPublicUploadObject(cfg, key, outBuf, outMime);
    const url = `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    return jsonOk({ url, fileId, filename });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "customization");
  await mkdir(dir, { recursive: true });
  const diskName = `${fileId}${ext}`;
  await writeFile(path.join(dir, diskName), outBuf);
  const url = `${publicOrigin(req)}/uploads/customization/${diskName}`;
  return jsonOk({ url, fileId, filename });
}

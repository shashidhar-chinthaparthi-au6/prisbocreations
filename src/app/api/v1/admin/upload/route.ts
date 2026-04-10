import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { maxBytesForAdminMime } from "@/lib/media-upload";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return jsonError("Missing file", 400);
  }

  const mime = (file as File).type;
  const ext = MIME_EXT[mime];
  if (!ext) {
    return jsonError("Unsupported file type (images or MP4/WebM/MOV video)", 400);
  }

  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.length === 0) return jsonError("Empty file", 400);
  const max = maxBytesForAdminMime(mime);
  if (buf.length > max) {
    return jsonError(`File too large (max ${Math.round(max / (1024 * 1024))} MB for this type)`, 400);
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const fsPath = path.join(dir, name);
  await writeFile(fsPath, buf);

  const url = `/uploads/${name}`;
  return jsonOk({ url });
}

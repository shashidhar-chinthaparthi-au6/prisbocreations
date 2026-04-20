import { mkdir, writeFile } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const uid = auth.session.sub;
  if (!mongoose.Types.ObjectId.isValid(uid)) return jsonError("Not found", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("avatar");
  if (!file || !(file instanceof File)) {
    return jsonError("Missing file field \"avatar\"", 400);
  }

  if (file.size > MAX_BYTES) {
    return jsonError("File must be under 2MB", 400);
  }

  const mime = (file.type || "").toLowerCase();
  const ext = ALLOWED.get(mime);
  if (!ext) {
    return jsonError("Use JPG, PNG, or WebP", 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());

  await connectDb();

  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const basename = `${uid}.${ext}`;
  const fsPath = path.join(dir, basename);
  await writeFile(fsPath, buf);

  const avatarUrl = `/uploads/avatars/${basename}`;
  await User.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(uid) },
    { $set: { profileImageUrl: avatarUrl } },
  );

  return jsonOk({ avatarUrl });
}

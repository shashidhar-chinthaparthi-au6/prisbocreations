import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { getS3Config } from "@/lib/s3-config";
import { putPublicUploadObject } from "@/lib/s3-server";
import { Order } from "@/lib/models/Order";
import { User } from "@/lib/models/User";
import { notifyProofReady } from "@/lib/notify/dispatch";
import { appBaseUrl } from "@/lib/notify/config";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; itemIndex: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id, itemIndex } = await ctx.params;
  const idx = parseInt(itemIndex, 10);
  if (isNaN(idx) || idx < 0) return jsonError("Invalid item index", 400);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("image") ?? form.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return jsonError("Missing image file", 400);
  }

  const mime = (file as File).type;
  const ext = MIME_EXT[mime];
  if (!ext) return jsonError("Use JPG, PNG, or WebP", 400);

  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.length === 0) return jsonError("Empty file", 400);
  if (buf.length > MAX_BYTES) return jsonError("Max 8 MB", 400);

  let processed: Buffer;
  let contentType: string;
  try {
    const meta = await sharp(buf).metadata();
    let pipeline = sharp(buf).rotate();
    if (meta.width != null && meta.width > 1800) {
      pipeline = pipeline.resize({ width: 1800, withoutEnlargement: true });
    }
    processed = await pipeline.toBuffer();
    contentType = mime;
  } catch {
    return jsonError("Could not process image", 400);
  }

  await connectDb();
  const order = await Order.findById(id);
  if (!order) return jsonError("Order not found", 404);

  const items = order.items as unknown as Array<Record<string, unknown>>;
  if (idx >= items.length) return jsonError("Item index out of range", 400);
  const item = items[idx];

  const base = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  let proofImageUrl: string;

  const cfg = getS3Config();
  if (cfg) {
    const key = `uploads/proofs/${base}`;
    try {
      await putPublicUploadObject(cfg, key, processed, contentType);
    } catch {
      return jsonError("Storage upload failed", 500);
    }
    proofImageUrl = `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  } else {
    const dir = path.join(process.cwd(), "public", "uploads", "proofs");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, base), processed);
    proofImageUrl = `/uploads/proofs/${base}`;
  }

  const proofToken: string =
    typeof item.proofToken === "string" && item.proofToken
      ? item.proofToken
      : randomBytes(24).toString("hex");

  item.proofImageUrl = proofImageUrl;
  item.proofToken = proofToken;
  item.proofStatus = "sent";
  item.proofSentAt = new Date();
  item.proofApproved = false;

  order.status = "proof_sent" as typeof order.status;
  order.markModified("items");
  await order.save();

  // Notify customer
  const ship = order.shipping as { fullName?: string };
  const firstName = ship?.fullName?.trim().split(/\s+/)[0] ?? "there";
  const inv = (order as unknown as { invoiceNumber?: string }).invoiceNumber ?? order._id.toString();
  const proofUrl = `${appBaseUrl()}/proof/${proofToken}`;
  const productName = String(item.name ?? "Your personalised item");

  let toEmail: string | undefined;
  const guestEmail = (order as unknown as { guestEmail?: string }).guestEmail;
  if (guestEmail) {
    toEmail = guestEmail;
  } else if (order.userId) {
    const user = await User.findById(order.userId).select("email").lean();
    if (user?.email) toEmail = user.email;
  }

  if (toEmail) {
    notifyProofReady({
      email: toEmail,
      firstName,
      orderNumber: inv,
      productName,
      proofUrl,
      orderId: order._id.toString(),
    }).catch(() => {});
  }

  return jsonOk({ proofImageUrl, proofToken, proofUrl });
}

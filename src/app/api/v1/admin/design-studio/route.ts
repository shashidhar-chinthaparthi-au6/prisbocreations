import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { connectDb } from "@/lib/db";
import { DesignScene } from "@/lib/models/DesignScene";
import { Product } from "@/lib/models/Product";
import sharp from "sharp";
import { normalizeKind, normalizeZones, type DesignKind, type PrintZone } from "@/lib/studio/composePrint";

export const maxDuration = 60;

function sceneJson(doc: {
  _id: mongoose.Types.ObjectId;
  baseUrl?: string | null;
  beforeUrl?: string | null;
  afterUrl?: string | null;
  zone?: PrintZone | PrintZone[] | null;
  designMode?: string | null;
  placeholder?: string | null;
  sampleText?: string | null;
  sampleImageUrl?: string | null;
  productName?: string | null;
  productKey?: string | null;
  useOnHome?: boolean | null;
  productId?: mongoose.Types.ObjectId | null;
}) {
  return {
    id: String(doc._id),
    baseUrl: doc.baseUrl || doc.beforeUrl || "",
    beforeUrl: doc.beforeUrl || "",
    afterUrl: doc.afterUrl || "",
    zones: normalizeZones(doc.zone),
    zone: normalizeZones(doc.zone)[0],
    designMode: normalizeKind(doc.designMode),
    placeholder: doc.placeholder?.trim() || "Your design",
    sampleText: doc.sampleText || "",
    sampleImageUrl: doc.sampleImageUrl || "",
    productName: doc.productName || "",
    productId: doc.productKey || (doc.productId ? String(doc.productId) : ""),
    useOnHome: Boolean(doc.useOnHome),
  };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  const scenes = await DesignScene.find().sort({ createdAt: -1 }).limit(24).lean();
  return jsonOk(scenes.map(sceneJson));
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
  const productId = String(form.get("productId") || "");
  let buf: Buffer;
  let linked: { _id: mongoose.Types.ObjectId; name?: string } | null = null;
  if (productId) {
    await connectDb();
    const product = mongoose.isValidObjectId(productId)
      ? await Product.findById(productId)
      : await Product.findOne({ studioKey: productId });
    const src = product?.images?.[0];
    if (!src) return jsonError("That product has no photo yet", 400);
    linked = product;
    const image = await fetch(src);
    if (!image.ok) return jsonError("Could not read the product photo", 400);
    buf = Buffer.from(await image.arrayBuffer());
  } else {
    const file = form.get("file");
    if (!file || typeof file === "string" || !("arrayBuffer" in file)) return jsonError("Add an image", 400);
    const mime = (file as File).type;
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return jsonError("Use a JPG, PNG, or WebP", 400);
    }
    buf = Buffer.from(await (file as File).arrayBuffer());
  }
  if (!buf.length || buf.length > 12 * 1024 * 1024) return jsonError("Image must be under 12 MB", 400);

  try {
    await connectDb();
    const jpeg = await sharp(buf)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 86 })
      .toBuffer();
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const stamp = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const baseName = `scene-base-${stamp}.jpg`;
    await writeFile(path.join(dir, baseName), jpeg);
    const doc = await DesignScene.create({
      baseUrl: `/uploads/${baseName}`,
      placeholder: "Your design",
      designMode: "both",
      zone: { x: 0.3, y: 0.36, w: 0.4, h: 0.26 },
      productId: linked?._id,
      productKey: linked ? productId : "",
      productName: linked?.name || "",
    });
    return jsonOk(sceneJson(doc));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not prepare the image";
    return jsonError(msg, 500);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!mongoose.isValidObjectId(id)) return jsonError("Missing scene", 400);
  await connectDb();
  const scene = await DesignScene.findById(id);
  if (!scene) return jsonError("Scene not found", 404);
  if (scene.productId) {
    await Product.updateOne(
      { _id: scene.productId },
      { $set: { sceneBaseUrl: "", sceneBeforeUrl: "", sceneAfterUrl: "", scenePlaceholder: "", sceneDesignMode: "", sceneZone: null, sceneOnHome: false } },
    );
  }
  await scene.deleteOne();
  return jsonOk({ id });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    productId?: string;
    useOnHome?: boolean;
    beforeUrl?: string;
    afterUrl?: string;
    placeholder?: string;
    designMode?: DesignKind;
    sampleText?: string;
    sampleImageUrl?: string;
    zone?: PrintZone;
    zones?: PrintZone[];
  } | null;
  if (!body?.id || !mongoose.isValidObjectId(body.id)) return jsonError("Missing scene", 400);
  await connectDb();
  const scene = await DesignScene.findById(body.id);
  if (!scene) return jsonError("Scene not found", 404);

  const productKey = (body.productId || "").trim();
  const product = productKey
    ? mongoose.isValidObjectId(productKey)
      ? await Product.findById(productKey)
      : await Product.findOne({ studioKey: productKey })
    : null;
  if (productKey && !product) return jsonError("Choose a product that exists", 400);

  if (typeof body.beforeUrl === "string" && body.beforeUrl.startsWith("/uploads/")) scene.beforeUrl = body.beforeUrl;
  if (typeof body.afterUrl === "string" && body.afterUrl.startsWith("/uploads/")) scene.afterUrl = body.afterUrl;
  if (typeof body.placeholder === "string") scene.placeholder = body.placeholder.slice(0, 80) || "Your design";
  if (body.designMode) scene.designMode = normalizeKind(body.designMode);
  if (typeof body.sampleText === "string") scene.sampleText = body.sampleText.slice(0, 180);
  if (typeof body.sampleImageUrl === "string" && (body.sampleImageUrl === "" || body.sampleImageUrl.startsWith("/uploads/"))) {
    scene.sampleImageUrl = body.sampleImageUrl;
  }
  if (Array.isArray(body.zones)) scene.zone = normalizeZones(body.zones);
  else if (body.zone) scene.zone = normalizeZones([body.zone]);

  if (scene.productId && String(scene.productId) !== String(product?._id || "")) {
    await Product.updateOne(
      { _id: scene.productId },
      { $set: { sceneBaseUrl: "", sceneBeforeUrl: "", sceneAfterUrl: "", scenePlaceholder: "", sceneDesignMode: "", sceneZone: null, sceneOnHome: false } },
    );
  }

  const useOnHome = Boolean(body.useOnHome) && Boolean(product);
  if (useOnHome) await Product.updateMany({ sceneOnHome: true }, { $set: { sceneOnHome: false } });
  await DesignScene.updateMany({ useOnHome: true }, { $set: { useOnHome: false } });

  if (product) {
    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          sceneBaseUrl: scene.baseUrl || "",
          sceneBeforeUrl: scene.beforeUrl || "",
          sceneAfterUrl: scene.afterUrl || "",
          scenePlaceholder: scene.placeholder || "Your design",
          sceneDesignMode: scene.designMode || "both",
          sceneZone: scene.zone || null,
          sceneOnHome: useOnHome,
        },
      },
    );
  }

  scene.productId = product?._id;
  scene.productKey = product ? productKey : "";
  scene.productName = product?.name || "";
  scene.useOnHome = useOnHome;
  scene.markModified("zone");
  await scene.save();
  return jsonOk(sceneJson(scene));
}

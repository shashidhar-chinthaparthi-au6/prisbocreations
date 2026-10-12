import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx";
const SIZE = 320;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const CREAM = { r: 243, g: 238, b: 230 };

type Session = {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array | number[] }>>;
};

let sessionPromise: Promise<Session> | null = null;

async function modelPath(): Promise<string> {
  const dir = path.join(process.cwd(), ".cache");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "u2netp.onnx");
  try {
    await access(file);
  } catch {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error("Could not download the background model");
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

async function session(): Promise<Session> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await import("onnxruntime-node");
      const created = await ort.InferenceSession.create(await modelPath());
      return created as unknown as Session;
    })().catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

/**
 * Lift the subject off its background and place it on the shop cream.
 * The original bytes are the "before". The cream composite is the "after".
 * Uses the MIT-licensed U²-Netp model locally. No per-image fee.
 */
export async function makeStudioPair(input: Buffer): Promise<{ before: Buffer; after: Buffer }> {
  const fitted = sharp(input, { failOn: "none" }).rotate().resize({
    width: 1400,
    height: 1400,
    fit: "inside",
    withoutEnlargement: true,
  });
  const before = await fitted.clone().jpeg({ quality: 86 }).toBuffer();
  const meta = await sharp(before).metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;

  const rgb = await sharp(before).removeAlpha().resize(SIZE, SIZE, { fit: "fill" }).raw().toBuffer();
  const tensor = new Float32Array(3 * SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      tensor[c * SIZE * SIZE + i] = (rgb[i * 3 + c] / 255 - MEAN[c]) / STD[c];
    }
  }

  const ort = await import("onnxruntime-node");
  const net = await session();
  const feeds: Record<string, unknown> = {
    [net.inputNames[0]]: new ort.Tensor("float32", tensor, [1, 3, SIZE, SIZE]),
  };
  const out = await net.run(feeds);
  const pred = out[net.outputNames[0]].data;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pred.length; i += 1) {
    const v = Number(pred[i]);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const small = Buffer.alloc(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    small[i] = Math.max(0, Math.min(255, Math.round(((Number(pred[i]) - min) / span) * 255)));
  }

  const mask = await sharp(small, { raw: { width: SIZE, height: SIZE, channels: 1 } })
    .resize(width, height, { fit: "fill" })
    .blur(0.6)
    .raw()
    .toBuffer();

  const cutout = await sharp(before)
    .removeAlpha()
    .joinChannel(mask, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
  const after = await sharp({
    create: { width, height, channels: 3, background: CREAM },
  })
    .composite([{ input: cutout }])
    .jpeg({ quality: 86 })
    .toBuffer();

  return { before, after };
}

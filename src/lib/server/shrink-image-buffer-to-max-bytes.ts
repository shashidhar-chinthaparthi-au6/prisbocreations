import sharp from "sharp";

/**
 * Re-encode (and optionally resize) so buffer is ≤ maxBytes.
 */
export async function shrinkImageBufferToMaxBytes(
  buf: Buffer,
  contentType: string,
  maxBytes: number,
): Promise<{ out: Buffer; contentType: string }> {
  if (buf.length <= maxBytes) return { out: buf, contentType };

  let working = buf;
  let ct = contentType;

  if (ct === "image/png") {
    working = await sharp(working).rotate().webp({ quality: 82 }).toBuffer();
    ct = "image/webp";
    if (working.length <= maxBytes) return { out: working, contentType: ct };
  }

  for (let q = 78; q >= 40; q -= 6) {
    const out =
      ct === "image/jpeg"
        ? await sharp(working).rotate().jpeg({ quality: q, mozjpeg: true }).toBuffer()
        : await sharp(working).rotate().webp({ quality: q }).toBuffer();
    if (out.length <= maxBytes) {
      return {
        out,
        contentType: ct === "image/jpeg" ? "image/jpeg" : "image/webp",
      };
    }
    working = out;
  }

  const meta = await sharp(working).metadata();
  let width = meta.width ?? 1000;
  while (width > 320) {
    width = Math.max(320, Math.round(width * 0.82));
    const out = await sharp(working)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    if (out.length <= maxBytes) {
      return { out, contentType: "image/webp" };
    }
    working = out;
  }

  throw new Error("Could not shrink image to target size");
}

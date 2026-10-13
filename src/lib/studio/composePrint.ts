import { loopsOf, normalizeShape, shapeBounds, traceAnchors, type Anchor, type PrintShape } from "@/lib/studio/printShape";
export type PrintZone = { x: number; y: number; w: number; h: number };
export type DesignKind = "image" | "text" | "both";
export type { PrintShape };

/** A chest-sized window, centered, ready to cover a logo on a hoodie or any other piece. */
export const DEFAULT_ZONE: PrintZone = { x: 0.3, y: 0.36, w: 0.4, h: 0.26 };

export function clampZone(zone: Partial<PrintZone> | null | undefined): PrintZone {
  const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const x = Math.min(0.9, Math.max(0, n(zone?.x, DEFAULT_ZONE.x)));
  const y = Math.min(0.9, Math.max(0, n(zone?.y, DEFAULT_ZONE.y)));
  const w = Math.min(1 - x, Math.max(0.12, n(zone?.w, DEFAULT_ZONE.w)));
  const h = Math.min(1 - y, Math.max(0.1, n(zone?.h, DEFAULT_ZONE.h)));
  return { x, y, w, h };
}

export function normalizeZones(input: unknown): PrintZone[] {
  const list = Array.isArray(input) ? input : input && typeof input === "object" ? [input] : [];
  const zones = list
    .slice(0, 1)
    .filter((zone) => zone && typeof zone === "object")
    .map((zone) => clampZone(zone as Partial<PrintZone>));
  return zones.length ? zones : [clampZone(null)];
}

export function normalizeKind(value: unknown): DesignKind {
  return value === "image" || value === "text" || value === "both" ? value : "both";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image"));
    img.src = canvasSrc(src);
  });
}

/** Same-origin copy of catalogue photos so the print can be drawn on the cloth. */
function canvasSrc(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("/") || src.startsWith("blob:")) return src;
  try {
    const host = new URL(src).hostname;
    if (host.endsWith(".amazonaws.com")) return `/api/media/fabric?src=${encodeURIComponent(src)}`;
  } catch {
    /* Use the original address. */
  }
  return src;
}

/** Finds the busiest patch of a photo, usually the logo already printed on the piece. */
export async function suggestPrintZone(src: string): Promise<PrintZone> {
  const img = await loadImage(src);
  const w = 96;
  const h = Math.max(1, Math.round((img.height / Math.max(1, img.width)) * w));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return clampZone(null);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const patch = (x0: number, y0: number) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = y0; y < y0 + 5 && y < h; y++) {
      for (let x = x0; x < x0 + 5 && x < w; x++) {
        const i = (y * w + x) * 4;
        r += data[i] ?? 0;
        g += data[i + 1] ?? 0;
        b += data[i + 2] ?? 0;
        n += 1;
      }
    }
    return { r: r / n, g: g / n, b: b / n };
  };
  const corners = [
    patch(0, 0),
    patch(w - 5, 0),
    patch(0, h - 5),
    patch(w - 5, h - 5),
  ];
  const isBackground = (i: number) =>
    corners.some((c) => {
      const dr = (data[i] ?? 0) - c.r;
      const dg = (data[i + 1] ?? 0) - c.g;
      const db = (data[i + 2] ?? 0) - c.b;
      return Math.hypot(dr, dg, db) < 52;
    });
  let best = { score: -1, ...DEFAULT_ZONE };
  for (const fw of [0.22, 0.32, 0.42]) {
    for (const fh of [0.16, 0.24, 0.34]) {
      const bw = Math.max(4, Math.round(fw * w));
      const bh = Math.max(4, Math.round(fh * h));
      for (let y = Math.round(h * 0.22); y < h * 0.82 - bh; y += 4) {
        for (let x = Math.round(w * 0.12); x < w * 0.8 - bw; x += 4) {
          const stats = (x0: number, y0: number, x1: number, y1: number, hole: boolean) => {
            let sum = 0;
            let sum2 = 0;
            let cloth = 0;
            let seen = 0;
            for (let yy = y0; yy < y1; yy += 2) {
              for (let xx = x0; xx < x1; xx += 2) {
                if (hole && xx >= x && xx < x + bw && yy >= y && yy < y + bh) continue;
                const i = (yy * w + xx) * 4;
                seen += 1;
                if (isBackground(i)) continue;
                cloth += 1;
                const l = (data[i] ?? 0) * 0.3 + (data[i + 1] ?? 0) * 0.5 + (data[i + 2] ?? 0) * 0.2;
                sum += l;
                sum2 += l * l;
              }
            }
            return { cloth, seen, variance: cloth ? sum2 / cloth - (sum / cloth) ** 2 : 0 };
          };
          const inside = stats(x, y, x + bw, y + bh, false);
          if (!inside.cloth || inside.cloth / inside.seen < 0.7 || inside.variance < 180) continue;
          const pad = Math.round(Math.min(bw, bh) * 0.45);
          const ring = stats(Math.max(0, x - pad), Math.max(0, y - pad), Math.min(w, x + bw + pad), Math.min(h, y + bh + pad), true);
          if (ring.cloth < 8) continue;
          const cx = (x + bw / 2) / w;
          const cy = (y + bh / 2) / h;
          const center = 1 - Math.min(1, Math.hypot(cx - 0.5, (cy - 0.56) * 0.8));
          const score = (inside.variance / (ring.variance + 30)) * (0.45 + center);
          if (score > best.score) best = { score, x: x / w, y: y / h, w: bw / w, h: bh / h };
        }
      }
    }
  }
  if (best.score > 0) {
    let zx = Math.round(best.x * w);
    let zy = Math.round(best.y * h);
    let zw = Math.round(best.w * w);
    let zh = Math.round(best.h * h);
    const stripVariance = (x0: number, y0: number, x1: number, y1: number) => {
      let sum = 0;
      let sum2 = 0;
      let n = 0;
      for (let yy = Math.max(0, y0); yy < Math.min(h, y1); yy++) {
        for (let xx = Math.max(0, x0); xx < Math.min(w, x1); xx++) {
          const i = (yy * w + xx) * 4;
          if (isBackground(i)) continue;
          const l = (data[i] ?? 0) * 0.3 + (data[i + 1] ?? 0) * 0.5 + (data[i + 2] ?? 0) * 0.2;
          sum += l;
          sum2 += l * l;
          n += 1;
        }
      }
      if (n < 4) return 0;
      return sum2 / n - (sum / n) ** 2;
    };
    for (let step = 0; step < 8; step++) {
      const left = stripVariance(zx - 3, zy, zx, zy + zh);
      const right = stripVariance(zx + zw, zy, zx + zw + 3, zy + zh);
      const up = stripVariance(zx, zy - 3, zx + zw, zy);
      const down = stripVariance(zx, zy + zh, zx + zw, zy + zh + 3);
      let grew = false;
      if (left > 90 && zx > 2) {
        zx -= 3;
        zw += 3;
        grew = true;
      }
      if (right > 90 && zx + zw < w - 2) {
        zw += 3;
        grew = true;
      }
      if (up > 90 && zy > 2) {
        zy -= 3;
        zh += 3;
        grew = true;
      }
      if (down > 90 && zy + zh < h - 2) {
        zh += 3;
        grew = true;
      }
      if (!grew) break;
    }
    best = { ...best, x: zx / w, y: zy / h, w: zw / w, h: zh / h };
  }
  return clampZone(best);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

type RGB = { r: number; g: number; b: number; l: number };

function luminance(r: number, g: number, b: number) {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function smooth(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Colour of the cloth just outside the existing print. */
function sampleFabric(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): RGB {
  const margin = Math.max(8, Math.round(Math.min(w, h) * 0.35));
  const x0 = Math.max(0, Math.floor(x - margin));
  const y0 = Math.max(0, Math.floor(y - margin));
  const x1 = Math.min(ctx.canvas.width, Math.ceil(x + w + margin));
  const y1 = Math.min(ctx.canvas.height, Math.ceil(y + h + margin));
  const sw = Math.max(1, x1 - x0);
  const sh = Math.max(1, y1 - y0);
  let data: ImageData;
  try {
    data = ctx.getImageData(x0, y0, sw, sh);
  } catch {
    return { r: 28, g: 28, b: 28, l: 28 };
  }
  const samples: RGB[] = [];
  const step = Math.max(1, Math.floor((sw * sh) / 900));
  for (let p = 0; p < sw * sh; p += step) {
    const px = p % sw;
    const py = Math.floor(p / sw);
    const absX = x0 + px;
    const absY = y0 + py;
    if (absX >= x && absX <= x + w && absY >= y && absY <= y + h) continue;
    const i = p * 4;
    const r = data.data[i] ?? 0;
    const g = data.data[i + 1] ?? 0;
    const b = data.data[i + 2] ?? 0;
    samples.push({ r, g, b, l: luminance(r, g, b) });
  }
  if (!samples.length) return { r: 28, g: 28, b: 28, l: 28 };
  samples.sort((a, b) => a.l - b.l);
  return samples[Math.floor(samples.length / 2)]!;
}

function boxBlur(src: Float32Array, w: number, h: number, radius: number) {
  const r = Math.max(1, radius);
  const tmp = new Float32Array(src.length);
  const dst = new Float32Array(src.length);
  const span = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[y * w + Math.min(w - 1, Math.max(0, x + k))]!;
      tmp[y * w + x] = sum / span;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x]!;
      dst[y * w + x] = sum / span;
    }
  }
  return dst;
}

function shapeMask(width: number, height: number, shape: PrintShape, box: PrintZone) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx || !box.w || !box.h) return null;
  ctx.beginPath();
  traceAnchors(
    ctx,
    shape.points,
    (x) => ((x - box.x) / box.w) * canvas.width,
    (y) => ((y - box.y) / box.h) * canvas.height,
  );
  ctx.fillStyle = "#fff";
  ctx.fill();
  const soft = document.createElement("canvas");
  soft.width = canvas.width;
  soft.height = canvas.height;
  const softCtx = soft.getContext("2d");
  if (!softCtx) return canvas;
  softCtx.filter = "blur(1.4px)";
  softCtx.drawImage(canvas, 0, 0);
  return soft;
}

/** Lift the old artwork and leave the cloth, including its folds. */
function restoreCloth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fabric: RGB,
  shape: PrintShape,
  box: PrintZone,
) {
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = Math.max(1, Math.min(ctx.canvas.width - ix, Math.ceil(w)));
  const ih = Math.max(1, Math.min(ctx.canvas.height - iy, Math.ceil(h)));
  const image = ctx.getImageData(ix, iy, iw, ih);
  const px = image.data;
  const lums = new Float32Array(iw * ih);
  for (let i = 0; i < iw * ih; i++) {
    lums[i] = luminance(px[i * 4] ?? 0, px[i * 4 + 1] ?? 0, px[i * 4 + 2] ?? 0);
  }
  const blurred = boxBlur(lums, iw, ih, Math.max(6, Math.round(Math.min(iw, ih) * 0.07)));
  let mean = 0;
  for (let i = 0; i < blurred.length; i++) mean += blurred[i]!;
  mean = mean / blurred.length || fabric.l || 1;
  const mask = shapeMask(iw, ih, shape, box);
  const cover = mask?.getContext("2d")?.getImageData(0, 0, iw, ih).data;
  for (let py = 0; py < ih; py++) {
    for (let px0 = 0; px0 < iw; px0++) {
      const i = py * iw + px0;
      const t = cover ? (cover[i * 4 + 3] ?? 0) / 255 : 1;
      if (t < 0.01) continue;
      const shade = Math.min(1.04, Math.max(0.96, blurred[i]! / mean));
      const o = i * 4;
      px[o] = (px[o]! * (1 - t) + fabric.r * shade * t) | 0;
      px[o + 1] = (px[o + 1]! * (1 - t) + fabric.g * shade * t) | 0;
      px[o + 2] = (px[o + 2]! * (1 - t) + fabric.b * shade * t) | 0;
    }
  }
  ctx.putImageData(image, ix, iy);
}

function cornerBackdrop(photo: HTMLImageElement): RGB | null {
  const c = document.createElement("canvas");
  c.width = Math.max(1, photo.width);
  c.height = Math.max(1, photo.height);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(photo, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const at = (x: number, y: number) => {
    const i = (y * c.width + x) * 4;
    return { r: d[i] ?? 0, g: d[i + 1] ?? 0, b: d[i + 2] ?? 0, l: 0 };
  };
  const corners = [at(0, 0), at(c.width - 1, 0), at(0, c.height - 1), at(c.width - 1, c.height - 1)];
  const avg = {
    r: corners.reduce((s, p) => s + p.r, 0) / 4,
    g: corners.reduce((s, p) => s + p.g, 0) / 4,
    b: corners.reduce((s, p) => s + p.b, 0) / 4,
    l: 0,
  };
  const close = corners.every((p) => Math.hypot(p.r - avg.r, p.g - avg.g, p.b - avg.b) < 28);
  return close ? avg : null;
}

/** Lay artwork into the cloth so folds and colour show through, with no hard patch. */
function blendArt(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  x: number,
  y: number,
  backdrop: RGB | null,
  fabricLum: number,
  shape: PrintShape,
  box: PrintZone,
) {
  const ix = Math.max(0, Math.floor(x));
  const iy = Math.max(0, Math.floor(y));
  const iw = art.width;
  const ih = art.height;
  const cloth = ctx.getImageData(ix, iy, Math.min(iw, ctx.canvas.width - ix), Math.min(ih, ctx.canvas.height - iy));
  const artCtx = art.getContext("2d", { willReadFrequently: true });
  if (!artCtx) return;
  const ink = artCtx.getImageData(0, 0, iw, ih);
  const mask = shapeMask(iw, ih, shape, box);
  const cover = mask?.getContext("2d")?.getImageData(0, 0, iw, ih).data;
  const feather = Math.max(10, Math.round(Math.min(iw, ih) * 0.1));
  const out = cloth.data;
  const src = ink.data;
  for (let py = 0; py < cloth.height; py++) {
    for (let px0 = 0; px0 < cloth.width; px0++) {
      const i = (py * iw + px0) * 4;
      const o = (py * cloth.width + px0) * 4;
      let a = (src[i + 3] ?? 0) / 255;
      if (cover) a *= (cover[i + 3] ?? 0) / 255;
      if (a < 0.004) continue;
      if (backdrop) {
        const dist = Math.hypot((src[i] ?? 0) - backdrop.r, (src[i + 1] ?? 0) - backdrop.g, (src[i + 2] ?? 0) - backdrop.b);
        if (dist < 42) a *= dist / 42;
      }
      if (!cover) {
        const edge = Math.min(px0, py, iw - 1 - px0, ih - 1 - py) / feather;
        a *= smooth(edge);
      }
      const cr = out[o] ?? 0;
      const cg = out[o + 1] ?? 0;
      const cb = out[o + 2] ?? 0;
      const gain = Math.min(1.08, Math.max(0.9, luminance(cr, cg, cb) / Math.max(12, fabricLum)));
      const pr = (src[i] ?? 0) * gain;
      const pg = (src[i + 1] ?? 0) * gain;
      const pb = (src[i + 2] ?? 0) * gain;
      out[o] = (cr * (1 - a) + pr * a) | 0;
      out[o + 1] = (cg * (1 - a) + pg * a) | 0;
      out[o + 2] = (cb * (1 - a) + pb * a) | 0;
    }
  }
  ctx.putImageData(cloth, ix, iy);
}

function drawText(ctx: CanvasRenderingContext2D, text: string, w: number, h: number, ink: string) {
  const fontSize = Math.max(14, Math.min(w * 0.13, h * 0.36));
  ctx.font = `italic 500 ${fontSize}px "Playfair Display", Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ink;
  const lines = wrapLines(ctx, text, w * 0.84);
  const lineHeight = fontSize * 1.18;
  const block = lines.length * lineHeight;
  const start = h / 2 - block / 2 + lineHeight / 2;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, start + i * lineHeight));
}

/**
 * Cover the existing artwork with the garment colour.
 * Before always reads “Your design”.
 * After is a picture, text, or both.
 */
export async function composePrint(opts: {
  baseUrl: string;
  zone?: PrintZone;
  zones?: PrintZone[];
  placeholder: string;
  text: string;
  imageUrl?: string;
  kind?: DesignKind;
  mode: "before" | "after";
  shape?: unknown;
  /** Transparent everywhere except the new ink, so it can sit on the original photo. */
  inkOnly?: boolean;
  /** One print per closed loop. Each area can be a picture, text, or both. */
  areas?: { points: Anchor[]; text?: string; imageUrl?: string; kind?: DesignKind }[];
}): Promise<HTMLCanvasElement> {
  const base = await loadImage(opts.baseUrl);
  const canvas = document.createElement("canvas");
  canvas.width = base.naturalWidth || base.width;
  canvas.height = base.naturalHeight || base.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the preview");
  ctx.drawImage(base, 0, 0);

  const shape = normalizeShape(opts.shape ?? (opts.zones?.length ? opts.zones : opts.zone));
  const kind = normalizeKind(opts.kind);
  const text = opts.text.trim();
  const showPlaceholder = opts.mode === "before";
  const shared = loopsOf(shape).map((loop) => ({
    points: loop.points,
    text: showPlaceholder ? opts.placeholder.trim() || "Your design" : kind === "image" ? "" : text,
    imageUrl: showPlaceholder || kind === "text" ? "" : opts.imageUrl || "",
    kind,
  }));
  const areas = opts.areas?.length
    ? opts.areas.map((area) => ({
        points: area.points,
        text: showPlaceholder ? opts.placeholder.trim() || "Your design" : area.text || "",
        imageUrl: showPlaceholder ? "" : area.imageUrl || "",
        kind: normalizeKind(area.kind ?? kind),
      }))
    : shared;
  const original = opts.inkOnly ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
  for (const area of areas) {
    const local: PrintShape = { kind: "free", points: area.points };
    const zone = shapeBounds(local);
    const x = zone.x * canvas.width;
    const y = zone.y * canvas.height;
    const w = zone.w * canvas.width;
    const h = zone.h * canvas.height;
    const fabric = sampleFabric(ctx, x, y, w, h);
    if (!opts.inkOnly) restoreCloth(ctx, x, y, w, h, fabric, local, zone);
    const areaKind = normalizeKind(area.kind);
    const wantImage = !showPlaceholder && (areaKind === "image" || areaKind === "both") && Boolean(area.imageUrl);
    const wantText = showPlaceholder || areaKind === "text" || areaKind === "both";
    let photo: HTMLImageElement | null = null;
    if (wantImage && area.imageUrl) {
      try {
        photo = await loadImage(area.imageUrl);
      } catch {
        photo = null;
      }
    }
    const line = wantText ? area.text.trim() : "";
    if (!photo && !line) drawBlended(ctx, x, y, w, h, null, opts.placeholder.trim() || "Your design", fabric, null, local, zone);
    else drawBlended(ctx, x, y, w, h, photo, line, fabric, photo ? cornerBackdrop(photo) : null, local, zone);
  }
  if (opts.inkOnly && original) keepInk(ctx, original, areas.map((area) => area.points));
  return canvas;
}

/** Drop every pixel that is still the original photo, leaving only the new print. */
function keepInk(ctx: CanvasRenderingContext2D, original: ImageData, rings: Anchor[][]) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const mctx = mask.getContext("2d");
  if (!mctx) return;
  mctx.beginPath();
  for (const points of rings) traceAnchors(mctx, points, (px) => px * width, (py) => py * height);
  mctx.fillStyle = "#fff";
  mctx.fill();
  const cover = mctx.getImageData(0, 0, width, height).data;
  const after = ctx.getImageData(0, 0, width, height);
  const src = original.data;
  const dst = after.data;
  for (let i = 0; i < dst.length; i += 4) {
    const inside = (cover[i + 3] ?? 0) / 255;
    const changed = dst[i] !== src[i] || dst[i + 1] !== src[i + 1] || dst[i + 2] !== src[i + 2];
    dst[i + 3] = changed ? Math.round(255 * inside) : 0;
  }
  ctx.putImageData(after, 0, 0);
}

function drawBlended(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  photo: HTMLImageElement | null,
  text: string,
  fabric: RGB,
  backdrop: RGB | null,
  shape: PrintShape,
  box: PrintZone,
) {
  const art = document.createElement("canvas");
  art.width = Math.max(1, Math.round(w));
  art.height = Math.max(1, Math.round(h));
  const actx = art.getContext("2d");
  if (!actx) return;
  actx.filter = "blur(0.4px)";
  const ink = fabric.l > 150 ? "#2a2520" : "#f4efe8";
  const textBand = photo && text ? art.height * 0.3 : 0;
  if (photo) {
    const pad = Math.min(art.width, art.height) * 0.06;
    const iw = art.width - pad * 2;
    const ih = art.height - pad * 2 - textBand;
    const scale = Math.min(iw / photo.width, ih / photo.height);
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    actx.drawImage(photo, (art.width - dw) / 2, pad + (ih - dh) / 2, dw, dh);
  }
  if (text) {
    if (textBand) {
      actx.save();
      actx.translate(0, art.height - textBand);
      drawText(actx, text, art.width, textBand, ink);
      actx.restore();
    } else {
      drawText(actx, text, art.width, art.height, ink);
    }
  }
  blendArt(ctx, art, x, y, photo ? backdrop : null, fabric.l, shape, box);
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not save the preview"))), "image/jpeg", 0.86);
  });
}

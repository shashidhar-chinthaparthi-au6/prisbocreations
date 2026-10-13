export type ShapeKind = "rect" | "round" | "ellipse" | "triangle" | "diamond" | "hex" | "heart" | "star" | "free";

/** A corner of the print, in fractions of the photo. Curve handles are optional. */
export type Anchor = {
  x: number;
  y: number;
  ix?: number;
  iy?: number;
  ox?: number;
  oy?: number;
};

export type LoopFill = "image" | "text" | "both";

/** One closed outline. Each loop can hold a picture, text, or both. */
export type PrintLoop = {
  points: Anchor[];
  fill: LoopFill;
  sample: string;
};

export type PrintShape = {
  kind: ShapeKind;
  points: Anchor[];
  loops?: PrintLoop[];
};

const KINDS: ShapeKind[] = ["rect", "round", "ellipse", "triangle", "diamond", "hex", "heart", "star", "free"];

export const SHAPE_LABELS: { kind: ShapeKind; label: string }[] = [
  { kind: "rect", label: "Rectangle" },
  { kind: "round", label: "Rounded" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "hex", label: "Hexagon" },
  { kind: "heart", label: "Heart" },
  { kind: "star", label: "Star" },
  { kind: "free", label: "Free draw" },
];

export type PrintBox = { x: number; y: number; w: number; h: number };

function fitBox(box: Partial<PrintBox> | null | undefined): PrintBox {
  const x = Math.min(0.9, Math.max(0, n(box?.x, 0.3)));
  const y = Math.min(0.9, Math.max(0, n(box?.y, 0.36)));
  const w = Math.min(1 - x, Math.max(0.12, n(box?.w, 0.4)));
  const h = Math.min(1 - y, Math.max(0.1, n(box?.h, 0.26)));
  return { x, y, w, h };
}
function n(v: unknown, d = 0) {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

function clamp(v: number) {
  return Math.min(0.98, Math.max(0.02, v));
}

function anchor(x: number, y: number, ix?: number, iy?: number, ox?: number, oy?: number): Anchor {
  const point: Anchor = { x: clamp(x), y: clamp(y) };
  if (ix != null && iy != null) {
    point.ix = clamp(ix);
    point.iy = clamp(iy);
  }
  if (ox != null && oy != null) {
    point.ox = clamp(ox);
    point.oy = clamp(oy);
  }
  return point;
}

/** Straight sides: handles sit on the lines, so the outline starts flat and can be pulled into a curve. */
function straight(raw: { x: number; y: number }[]): Anchor[] {
  const count = raw.length;
  return raw.map((point, i) => {
    const prev = raw[(i - 1 + count) % count]!;
    const next = raw[(i + 1) % count]!;
    return anchor(
      point.x,
      point.y,
      point.x + (prev.x - point.x) * 0.32,
      point.y + (prev.y - point.y) * 0.32,
      point.x + (next.x - point.x) * 0.32,
      point.y + (next.y - point.y) * 0.32,
    );
  });
}

export function closeFreeDraw(raw: { x: number; y: number }[]): PrintShape {
  const points = straight(raw);
  return { kind: "free", points, loops: [{ points, fill: "both", sample: "" }] };
}

export function loopsOf(shape: PrintShape): PrintLoop[] {
  if (shape.loops?.length) return shape.loops;
  return [{ points: shape.points, fill: "both", sample: "" }];
}

function readFill(value: unknown): LoopFill {
  return value === "image" || value === "text" || value === "both" ? value : "both";
}

function readPoints(list: unknown): Anchor[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((point) => point && typeof point === "object")
    .map((point) => {
      const p = point as Anchor;
      return anchor(
        n(p.x, 0.3),
        n(p.y, 0.36),
        p.ix == null ? undefined : n(p.ix),
        p.iy == null ? undefined : n(p.iy),
        p.ox == null ? undefined : n(p.ox),
        p.oy == null ? undefined : n(p.oy),
      );
    });
}

function mapBox(box: PrintBox, u: number, v: number) {
  return { x: box.x + u * box.w, y: box.y + v * box.h };
}

export function presetShape(kind: ShapeKind, box: PrintBox): PrintShape {
  const b = fitBox(box);
  if (kind === "ellipse") {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const rx = b.w / 2;
    const ry = b.h / 2;
    const k = 0.5522847498;
    return {
      kind,
      points: [
        anchor(cx + rx, cy, cx + rx, cy - ry * k, cx + rx, cy + ry * k),
        anchor(cx, cy + ry, cx + rx * k, cy + ry, cx - rx * k, cy + ry),
        anchor(cx - rx, cy, cx - rx, cy + ry * k, cx - rx, cy - ry * k),
        anchor(cx, cy - ry, cx - rx * k, cy - ry, cx + rx * k, cy - ry),
      ],
    };
  }
  if (kind === "round") {
    const r = Math.min(b.w, b.h) * 0.22;
    const x0 = b.x;
    const y0 = b.y;
    const x1 = b.x + b.w;
    const y1 = b.y + b.h;
    const c = 0.5522847498 * r;
    return {
      kind,
      points: [
        anchor(x0 + r, y0, x0 + r - c, y0, x1 - r, y0),
        anchor(x1 - r, y0, x0 + r, y0, x1 - r + c, y0),
        anchor(x1, y0 + r, x1, y0 + r - c, x1, y1 - r),
        anchor(x1, y1 - r, x1, y0 + r, x1, y1 - r + c),
        anchor(x1 - r, y1, x1 - r + c, y1, x0 + r, y1),
        anchor(x0 + r, y1, x1 - r, y1, x0 + r - c, y1),
        anchor(x0, y1 - r, x0, y1 - r + c, x0, y0 + r),
        anchor(x0, y0 + r, x0, y1 - r, x0, y0 + r - c),
      ],
    };
  }
  if (kind === "heart") {
    const p = (u: number, v: number) => mapBox(b, u / 32, v / 30);
    const a = p(2, 11);
    const aIn = p(2, 18);
    const aOut = p(2, 6);
    const b1 = p(10, 3);
    const bIn = p(6, 3);
    const bOut = p(13, 3);
    const c = p(16, 7);
    const cIn = p(15, 5);
    const cOut = p(17, 5);
    const d = p(22, 3);
    const dIn = p(19, 3);
    const dOut = p(26, 3);
    const e = p(30, 11);
    const eIn = p(30, 6);
    const eOut = p(30, 18);
    const f = p(16, 28);
    return {
      kind,
      points: [
        anchor(a.x, a.y, aIn.x, aIn.y, aOut.x, aOut.y),
        anchor(b1.x, b1.y, bIn.x, bIn.y, bOut.x, bOut.y),
        anchor(c.x, c.y, cIn.x, cIn.y, cOut.x, cOut.y),
        anchor(d.x, d.y, dIn.x, dIn.y, dOut.x, dOut.y),
        anchor(e.x, e.y, eIn.x, eIn.y, eOut.x, eOut.y),
        anchor(f.x, f.y, f.x, f.y, f.x, f.y),
      ],
    };
  }
  if (kind === "star") {
    const cx = 0.5;
    const cy = 0.5;
    const raw: { x: number; y: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? 0.5 : 0.22;
      raw.push(mapBox(b, cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad));
    }
    return { kind, points: straight(raw) };
  }
  if (kind === "hex") {
    const raw: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 3;
      raw.push(mapBox(b, 0.5 + Math.cos(ang) * 0.5, 0.5 + Math.sin(ang) * 0.5));
    }
    return { kind, points: straight(raw) };
  }
  if (kind === "triangle") {
    return {
      kind,
      points: straight([
        mapBox(b, 0.5, 0.02),
        mapBox(b, 0.98, 0.98),
        mapBox(b, 0.02, 0.98),
      ]),
    };
  }
  if (kind === "diamond") {
    return {
      kind,
      points: straight([
        mapBox(b, 0.5, 0.02),
        mapBox(b, 0.98, 0.5),
        mapBox(b, 0.5, 0.98),
        mapBox(b, 0.02, 0.5),
      ]),
    };
  }
  return {
    kind: kind === "free" ? "free" : "rect",
    points: straight([
      { x: b.x, y: b.y },
      { x: b.x + b.w, y: b.y },
      { x: b.x + b.w, y: b.y + b.h },
      { x: b.x, y: b.y + b.h },
    ]),
  };
}

export function normalizeShape(input: unknown): PrintShape {
  const raw = Array.isArray(input) ? input[0] : input;
  if (raw && typeof raw === "object") {
    const record = raw as { kind?: unknown; points?: unknown; loops?: unknown; x?: unknown; y?: unknown; w?: unknown; h?: unknown };
    const kind = KINDS.includes(record.kind as ShapeKind) ? (record.kind as ShapeKind) : "free";
    const loops = Array.isArray(record.loops)
      ? record.loops
          .map((item) => {
            const loop = item as { points?: unknown; fill?: unknown; sample?: unknown };
            const points = readPoints(loop.points);
            if (points.length < 3) return null;
            return { points, fill: readFill(loop.fill), sample: typeof loop.sample === "string" ? loop.sample : "" };
          })
          .filter((loop): loop is PrintLoop => Boolean(loop))
      : [];
    if (loops.length) return { kind, points: loops[0]!.points, loops };
    const points = readPoints(record.points);
    if (points.length >= 3) return { kind, points, loops: [{ points, fill: "both", sample: "" }] };
    if (record.x != null || record.w != null) {
      return presetShape("rect", fitBox({ x: n(record.x, 0.3), y: n(record.y, 0.36), w: n(record.w, 0.4), h: n(record.h, 0.26) }));
    }
  }
  return presetShape("rect", fitBox(null));
}

export function shapeBounds(shape: PrintShape): PrintBox {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const loop of loopsOf(shape))
    for (const point of loop.points) {
    for (const [x, y] of [
      [point.x, point.y],
      [point.ix ?? point.x, point.iy ?? point.y],
      [point.ox ?? point.x, point.oy ?? point.y],
    ]) {
      minX = Math.min(minX, x!);
      minY = Math.min(minY, y!);
      maxX = Math.max(maxX, x!);
      maxY = Math.max(maxY, y!);
    }
  }
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(1, maxX);
  maxY = Math.min(1, maxY);
  return {
    x: minX,
    y: minY,
    w: Math.max(0.04, maxX - minX),
    h: Math.max(0.04, maxY - minY),
  };
}

export function scaleShape(shape: PrintShape, originX: number, originY: number, sx: number, sy: number): PrintShape {
  const mapX = (value: number) => clamp(originX + (value - originX) * sx);
  const mapY = (value: number) => clamp(originY + (value - originY) * sy);
  const pair = (x?: number, y?: number) => (x == null || y == null ? undefined : { x: mapX(x), y: mapY(y) });
  return {
    kind: shape.kind,
    points: shape.points.map((point) => {
      const inn = pair(point.ix, point.iy);
      const out = pair(point.ox, point.oy);
      return anchor(mapX(point.x), mapY(point.y), inn?.x, inn?.y, out?.x, out?.y);
    }),
  };
}

export function shapeCenter(shape: PrintShape) {
  const bounds = shapeBounds(shape);
  return { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
}

export function translateShape(shape: PrintShape, dx: number, dy: number): PrintShape {
  const shift = (v: number | undefined, d: number) => (v == null ? undefined : clamp(v + d));
  return {
    kind: shape.kind === "rect" || shape.kind === "round" || shape.kind === "ellipse" ? "free" : shape.kind,
    points: shape.points.map((point) =>
      anchor(point.x + dx, point.y + dy, shift(point.ix, dx), shift(point.iy, dy), shift(point.ox, dx), shift(point.oy, dy)),
    ),
  };
}

export function rotateShape(shape: PrintShape, radians: number, origin = shapeCenter(shape)): PrintShape {
  const turn = (x: number, y: number) => {
    const dx = x - origin.x;
    const dy = y - origin.y;
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return { x: origin.x + dx * c - dy * s, y: origin.y + dx * s + dy * c };
  };
  const map = (x?: number, y?: number) => (x == null || y == null ? undefined : turn(x, y));
  return {
    kind: "free",
    points: shape.points.map((point) => {
      const p = turn(point.x, point.y);
      const inn = map(point.ix, point.iy);
      const out = map(point.ox, point.oy);
      return anchor(p.x, p.y, inn?.x, inn?.y, out?.x, out?.y);
    }),
  };
}

export function moveAnchor(shape: PrintShape, index: number, x: number, y: number): PrintShape {
  const current = shape.points[index];
  if (!current) return shape;
  const dx = x - current.x;
  const dy = y - current.y;
  const points = shape.points.map((point, i) =>
    i === index
      ? anchor(
          x,
          y,
          point.ix == null ? undefined : point.ix + dx,
          point.iy == null ? undefined : point.iy + dy,
          point.ox == null ? undefined : point.ox + dx,
          point.oy == null ? undefined : point.oy + dy,
        )
      : point,
  );
  return { kind: "free", points };
}

export function moveHandle(shape: PrintShape, index: number, which: "in" | "out", x: number, y: number): PrintShape {
  const points = shape.points.map((point, i) => {
    if (i !== index) return point;
    const dx = x - point.x;
    const dy = y - point.y;
    if (which === "out") return anchor(point.x, point.y, point.x - dx, point.y - dy, x, y);
    return anchor(point.x, point.y, x, y, point.x - dx, point.y - dy);
  });
  return { kind: "free", points };
}

export function insertAnchor(shape: PrintShape, after: number): PrintShape {
  const a = shape.points[after];
  const b = shape.points[(after + 1) % shape.points.length];
  if (!a || !b) return shape;
  const mid = anchor((a.x + b.x) / 2, (a.y + b.y) / 2, a.x, a.y, b.x, b.y);
  const points = [...shape.points.slice(0, after + 1), mid, ...shape.points.slice(after + 1)];
  return { kind: "free", points };
}

export function removeAnchor(shape: PrintShape, index: number): PrintShape {
  if (shape.points.length <= 3) return shape;
  return { kind: "free", points: shape.points.filter((_, i) => i !== index) };
}

export function traceAnchors(
  ctx: CanvasRenderingContext2D,
  points: Anchor[],
  mx: (x: number) => number,
  my: (y: number) => number,
) {
  const first = points[0];
  if (!first || points.length < 3) return;
  ctx.moveTo(mx(first.x), my(first.y));
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const ox = a.ox ?? a.x;
    const oy = a.oy ?? a.y;
    const ix = b.ix ?? b.x;
    const iy = b.iy ?? b.y;
    const straightSide = Math.abs(ox - a.x) < 0.0001 && Math.abs(oy - a.y) < 0.0001 && Math.abs(ix - b.x) < 0.0001 && Math.abs(iy - b.y) < 0.0001;
    if (straightSide) ctx.lineTo(mx(b.x), my(b.y));
    else ctx.bezierCurveTo(mx(ox), my(oy), mx(ix), my(iy), mx(b.x), my(b.y));
  }
  ctx.closePath();
}

export function loopPathD(points: Anchor[]): string {
  const first = points[0];
  if (!first) return "";
  const p = (x: number, y: number) => `${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`;
  let d = `M ${p(first.x, first.y)}`;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    d += ` C ${p(a.ox ?? a.x, a.oy ?? a.y)} ${p(b.ix ?? b.x, b.iy ?? b.y)} ${p(b.x, b.y)}`;
  }
  return `${d} Z`;
}

export function shapePathD(shape: PrintShape): string {
  return loopsOf(shape)
    .map((loop) => loopPathD(loop.points))
    .join(" ");
}

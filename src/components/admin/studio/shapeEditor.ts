import {
  closeFreeDraw,
  insertAnchor,
  loopPathD,
  loopsOf,
  moveAnchor,
  moveHandle,
  removeAnchor,
  rotateShape,
  scaleShape,
  shapeBounds,
  shapeCenter,
  translateShape,
  type PrintLoop,
  type PrintShape,
} from "@/lib/studio/printShape";

type Drag =
  | { kind: "point"; index: number }
  | { kind: "handle"; index: number; which: "in" | "out" }
  | { kind: "move"; x: number; y: number; shape: PrintShape }
  | { kind: "rotate"; angle: number; shape: PrintShape }
  | { kind: "grip"; grip: string; shape: PrintShape; bounds: { x: number; y: number; w: number; h: number } };

const GRIPS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;

function cloneLoop(loop: PrintLoop): PrintLoop {
  return { fill: loop.fill, sample: loop.sample, points: loop.points.map((point) => ({ ...point })) };
}

/** Points, curve handles, eight resize grips, and a rotate knob on the print photo. */
export function attachShapeEditor(
  frame: HTMLElement,
  initial: PrintShape,
  onChange: (shape: PrintShape) => void,
  onActive?: (index: number) => void,
) {
  let shape = initial;
  let loops = loopsOf(initial).map(cloneLoop);
  let active = 0;
  let selected = 0;
  let drag: Drag | null = null;
  let draft: { x: number; y: number }[] | null = null;
  const layer = document.createElement("div");
  layer.className = "shape-edit";
  layer.style.cssText = "position:absolute;inset:0;z-index:2;touch-action:none;";
  frame.appendChild(layer);

  const frac = (event: { clientX: number; clientY: number }) => {
    const rect = frame.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(1, rect.width),
      y: (event.clientY - rect.top) / Math.max(1, rect.height),
    };
  };

  const emit = () => {
    const list = loops.filter((loop) => loop.points.length >= 3);
    if (!list.length) {
      shape = { kind: "free", points: shape.points, loops: [] };
      onChange(shape);
      return;
    }
    active = Math.min(active, list.length - 1);
    shape = { kind: "free", points: list[active]!.points, loops: list };
    onChange(shape);
    onActive?.(active);
  };

  const lone = (): PrintShape => ({ kind: "free", points: loops[active]?.points ?? shape.points });

  const writeActive = (next: PrintShape) => {
    if (!loops[active]) return;
    loops[active] = { ...loops[active], points: next.points };
    shape = next;
    emit();
    redraw();
  };

  const tools = () => {
    const canUndo = Boolean(draft && (draft.length > 0 || loops.length > 0));
    const canClose = Boolean(draft && draft.length >= 3);
    return `<div class="draw-tools">
      <button type="button" data-act="undo" ${canUndo ? "" : "disabled"}>Undo</button>
      <button type="button" data-act="close" ${canClose ? "" : "disabled"}>Close loop</button>
    </div>`;
  };

  const redraw = () => {
    if (draft) {
      const closed = loops
        .map((loop, index) => {
          const on = index === active ? " on" : "";
          return `<path data-loop="${index}" class="${on.trim()}" fill="${index === active ? "rgba(190,108,59,0.2)" : "rgba(190,108,59,0.1)"}" stroke="#be6c3b" stroke-width="${index === active ? 2.2 : 1.4}" d="${loopPathD(loop.points)}" />`;
        })
        .join("");
      const dots = draft
        .map(
          (point, index) =>
            `<button type="button" class="anchor on" data-draft="${index}" style="left:${point.x * 100}%;top:${point.y * 100}%" aria-label="Point ${index + 1}"></button>`,
        )
        .join("");
      const line =
        draft.length > 1
          ? `<polyline points="${draft.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")}" />`
          : "";
      const editing = draft.length === 0 && loops.length ? gripsFor(lone()) : "";
      layer.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${closed}${line}</svg>
        <p class="draw-hint">${draft.length ? "Click to add a point. Close loop finishes this outline, then draw the next one." : "Click the photo to start another loop. Click a closed loop to choose what goes inside it."}</p>
        ${tools()}${editing}${dots}`;
      layer.classList.toggle("drawing", draft.length > 0);
      return;
    }
    layer.classList.remove("drawing");
    const current = lone();
    layer.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none">
      ${loops
        .map((loop, index) => `<path data-loop="${index}" fill="${index === active ? "rgba(190,108,59,0.16)" : "rgba(190,108,59,0.08)"}" stroke="#be6c3b" stroke-width="1.6" d="${loopPathD(loop.points)}" />`)
        .join("")}
    </svg>
    ${gripsFor(current)}`;
  };

  function gripsFor(current: PrintShape) {
    const bounds = shapeBounds(current);
    const center = shapeCenter(current);
    const points = current.points;
    const grips = GRIPS.map((grip) => {
      const x = grip.includes("w") ? bounds.x : grip.includes("e") ? bounds.x + bounds.w : bounds.x + bounds.w / 2;
      const y = grip.includes("n") ? bounds.y : grip.includes("s") ? bounds.y + bounds.h : bounds.y + bounds.h / 2;
      return `<button type="button" class="grip ${grip}" data-grip="${grip}" style="left:${x * 100}%;top:${y * 100}%" aria-label="Resize ${grip}"></button>`;
    }).join("");
    const lines = points
      .map((point) => {
        const inn = point.ix == null ? "" : `<line x1="${point.x * 100}" y1="${point.y * 100}" x2="${point.ix * 100}" y2="${(point.iy ?? point.y) * 100}" />`;
        const out = point.ox == null ? "" : `<line x1="${point.x * 100}" y1="${point.y * 100}" x2="${point.ox * 100}" y2="${(point.oy ?? point.y) * 100}" />`;
        return inn + out;
      })
      .join("");
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect class="box" x="${bounds.x * 100}" y="${bounds.y * 100}" width="${bounds.w * 100}" height="${bounds.h * 100}" />
      <line class="stem" x1="${center.x * 100}" y1="${center.y * 100}" x2="${(bounds.x + bounds.w / 2) * 100}" y2="${(bounds.y - 0.04) * 100}" />
      ${lines}
    </svg>
    <button type="button" class="rot" style="left:${(bounds.x + bounds.w / 2) * 100}%;top:${(bounds.y - 0.04) * 100}%" aria-label="Rotate"></button>
    ${grips}
    ${points
      .map((point, index) => {
        const handles =
          index === selected && point.ix != null
            ? `<button type="button" class="handle" data-h="in" data-i="${index}" style="left:${point.ix * 100}%;top:${(point.iy ?? point.y) * 100}%" aria-label="Curve in"></button>
               <button type="button" class="handle" data-h="out" data-i="${index}" style="left:${(point.ox ?? point.x) * 100}%;top:${(point.oy ?? point.y) * 100}%" aria-label="Curve out"></button>`
            : "";
        return `${handles}<button type="button" class="anchor${index === selected ? " on" : ""}" data-i="${index}" style="left:${point.x * 100}%;top:${point.y * 100}%" aria-label="Point ${index + 1}"></button>`;
      })
      .join("")}`;
  }

  const closeLoop = () => {
    if (!draft || draft.length < 3) return;
    const closed = closeFreeDraw(draft);
    const previous = loops[active];
    loops.push({ points: closed.points, fill: previous?.fill ?? "both", sample: "" });
    active = loops.length - 1;
    selected = 0;
    draft = [];
    emit();
    redraw();
  };

  const undo = () => {
    if (!draft) return;
    if (draft.length) {
      draft = draft.slice(0, -1);
      redraw();
      return;
    }
    if (!loops.length) return;
    const last = loops.pop()!;
    draft = last.points.map((point) => ({ x: point.x, y: point.y }));
    active = Math.max(0, loops.length - 1);
    emit();
    redraw();
  };

  const pickLoop = (index: number) => {
    if (!loops[index]) return;
    active = index;
    selected = 0;
    emit();
    redraw();
  };

  layer.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.act === "undo") {
      undo();
      event.preventDefault();
      return;
    }
    if (target.dataset.act === "close") {
      closeLoop();
      event.preventDefault();
      return;
    }
    if (draft && draft.length > 0) {
      if (target.dataset.draft != null) {
        if (Number(target.dataset.draft) === 0 && draft.length >= 3) closeLoop();
        return;
      }
      const point = frac(event);
      const first = draft[0]!;
      if (draft.length >= 3 && Math.hypot(point.x - first.x, point.y - first.y) < 0.035) {
        closeLoop();
        event.preventDefault();
        return;
      }
      draft = [...draft, point];
      redraw();
      event.preventDefault();
      return;
    }
    if (draft && draft.length === 0) {
      if (target.closest(".draw-tools")) return;
      if (target.dataset.loop != null) {
        pickLoop(Number(target.dataset.loop));
        return;
      }
      const handle = target.closest(".anchor, .handle, .grip, .rot");
      if (!handle && target.tagName !== "path") {
        draft = [frac(event)];
        redraw();
        event.preventDefault();
        return;
      }
    }
    const point = frac(event);
    const current = lone();
    if (target.classList.contains("rot")) {
      const center = shapeCenter(current);
      drag = { kind: "rotate", angle: Math.atan2(point.y - center.y, point.x - center.x), shape: current };
    } else if (target.dataset.grip) {
      drag = { kind: "grip", grip: target.dataset.grip, shape: current, bounds: shapeBounds(current) };
    } else if (target.classList.contains("handle")) {
      drag = { kind: "handle", index: Number(target.dataset.i), which: target.dataset.h === "in" ? "in" : "out" };
      selected = Number(target.dataset.i);
    } else if (target.classList.contains("anchor")) {
      drag = { kind: "point", index: Number(target.dataset.i) };
      selected = drag.index;
      redraw();
    } else if (target.dataset.loop != null || target.tagName === "path") {
      if (target.dataset.loop != null) pickLoop(Number(target.dataset.loop));
      drag = { kind: "move", x: point.x, y: point.y, shape: lone() };
    } else return;
    layer.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  layer.addEventListener("pointermove", (event) => {
    if (!drag || !layer.hasPointerCapture(event.pointerId)) return;
    const point = frac(event);
    if (drag.kind === "point") writeActive(moveAnchor(lone(), drag.index, point.x, point.y));
    else if (drag.kind === "handle") writeActive(moveHandle(lone(), drag.index, drag.which, point.x, point.y));
    else if (drag.kind === "move") writeActive(translateShape(drag.shape, point.x - drag.x, point.y - drag.y));
    else if (drag.kind === "grip") {
      const box = drag.bounds;
      const grip = drag.grip;
      let sx = 1;
      let sy = 1;
      let ox = box.x;
      let oy = box.y;
      if (grip === "e" || grip === "ne" || grip === "se") {
        sx = Math.max(0.2, (point.x - box.x) / box.w);
        ox = box.x;
      }
      if (grip === "w" || grip === "nw" || grip === "sw") {
        sx = Math.max(0.2, (box.x + box.w - point.x) / box.w);
        ox = box.x + box.w;
      }
      if (grip === "s" || grip === "se" || grip === "sw") {
        sy = Math.max(0.2, (point.y - box.y) / box.h);
        oy = box.y;
      }
      if (grip === "n" || grip === "ne" || grip === "nw") {
        sy = Math.max(0.2, (box.y + box.h - point.y) / box.h);
        oy = box.y + box.h;
      }
      if (grip === "e" || grip === "w") sy = 1;
      if (grip === "n" || grip === "s") sx = 1;
      writeActive(scaleShape(drag.shape, ox, oy, sx, sy));
    } else {
      const center = shapeCenter(drag.shape);
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      writeActive(rotateShape(drag.shape, angle - drag.angle, center));
    }
  });

  layer.addEventListener("pointerup", () => {
    drag = null;
  });

  layer.addEventListener("dblclick", (event) => {
    if (draft) {
      if (draft.length >= 4) draft = draft.slice(0, -1);
      closeLoop();
      event.preventDefault();
      return;
    }
    const target = event.target as HTMLElement;
    if (target.tagName !== "path") return;
    const point = frac(event);
    const points = lone().points;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((anchor, index) => {
      const next = points[(index + 1) % points.length]!;
      const dist = Math.hypot(point.x - (anchor.x + next.x) / 2, point.y - (anchor.y + next.y) / 2);
      if (dist < bestDist) {
        bestDist = dist;
        best = index;
      }
    });
    writeActive(insertAnchor(lone(), best));
    selected = best + 1;
    redraw();
  });

  const onKey = (event: KeyboardEvent) => {
    const typing = (event.target as HTMLElement | null)?.closest("input, textarea, select");
    if (typing) return;
    if (draft && ((event.key === "z" && (event.metaKey || event.ctrlKey)) || event.key === "Backspace")) {
      event.preventDefault();
      undo();
      return;
    }
    if (draft) return;
    if (event.key !== "Backspace" && event.key !== "Delete") return;
    event.preventDefault();
    writeActive(removeAnchor(lone(), selected));
    selected = Math.min(selected, (loops[active]?.points.length ?? 1) - 1);
    redraw();
  };
  window.addEventListener("keydown", onKey);
  redraw();

  return {
    set(next: PrintShape) {
      draft = null;
      shape = next;
      loops = loopsOf(next).map(cloneLoop);
      active = 0;
      selected = 0;
      onActive?.(0);
      redraw();
    },
    startDraw() {
      if (draft) return;
      loops = shape.kind === "free" ? loopsOf(shape).map(cloneLoop) : [];
      active = Math.max(0, loops.length - 1);
      draft = [];
      drag = null;
      redraw();
    },
    undo,
    closeLoop,
    stop() {
      window.removeEventListener("keydown", onKey);
      layer.remove();
    },
  };
}

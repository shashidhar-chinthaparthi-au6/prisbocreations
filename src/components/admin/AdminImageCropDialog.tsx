"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageBlob, outputMimeForFile } from "@/lib/canvas-crop";

type Props = {
  imageSrc: string;
  fileName: string;
  originalMime: string;
  onCancel: () => void;
  onCropped: (blob: Blob, suggestedBaseName: string) => void;
  /** Defaults to "Crop & upload" */
  title?: string;
  /** Defaults to "Use cropped image & upload" */
  submitLabel?: string;
};

const ASPECT_PRESETS: { label: string; value: number }[] = [
  { label: "Original", value: 0 },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
];

export function AdminImageCropDialog({
  imageSrc,
  fileName,
  originalMime,
  onCancel,
  onCropped,
  title = "Crop & upload",
  submitLabel = "Use cropped image & upload",
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectMode, setAspectMode] = useState(0);
  const [naturalAspect, setNaturalAspect] = useState(4 / 3);
  const pixelsRef = useRef<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const aspect = aspectMode === 0 ? naturalAspect : ASPECT_PRESETS[aspectMode]?.value ?? 4 / 3;

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    pixelsRef.current = areaPixels;
  }, []);

  async function apply() {
    const pixels = pixelsRef.current;
    if (!pixels) {
      setErr("Adjust the crop area first.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, pixels, originalMime);
      const base = fileName.replace(/\.[^.]+$/, "") || "image";
      onCropped(blob, base);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not crop image");
    } finally {
      setBusy(false);
    }
  }

  const { mime } = outputMimeForFile(originalMime);
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-lg flex-col gap-3 rounded-2xl border border-sand-deep bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg text-ink">{title}</h3>
            <p className="mt-0.5 text-xs text-ink-muted">{fileName}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-sand-deep px-3 py-1 text-sm text-ink hover:bg-sand"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>

        <div className="relative h-[min(50vh,360px)] w-full overflow-hidden rounded-xl bg-ink">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
            restrictPosition
            style={{
              containerStyle: { borderRadius: 12 },
            }}
            onMediaLoaded={(media) => {
              setNaturalAspect(media.naturalWidth / Math.max(1, media.naturalHeight));
            }}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="w-12 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="min-w-0 flex-1 accent-accent"
            />
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ASPECT_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  aspectMode === i
                    ? "bg-ink text-white"
                    : "border border-sand-deep text-ink-muted hover:border-accent"
                }`}
                onClick={() => setAspectMode(i)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-ink-muted">
          Output: <span className="font-mono text-ink">{mime}</span> (.{ext}) — drag to frame, then
          upload.
        </p>

        {err ? <p className="text-sm text-rose">{err}</p> : null}

        <button
          type="button"
          disabled={busy}
          className="rounded-full bg-accent py-2.5 text-sm font-semibold text-ink hover:bg-accent-light disabled:opacity-50"
          onClick={() => void apply()}
        >
          {busy ? "Processing…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { getCroppedImageBlob } from "@/lib/canvas-crop";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  imageSrc: string;
  fileName: string;
  originalMime: string;
  onClose: () => void;
  /** Called with cropped JPEG file ready for upload. */
  onApply: (file: File) => void;
};

export function ProfilePhotoCropModal({
  imageSrc,
  fileName,
  originalMime,
  onClose,
  onApply,
}: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const pixelsRef = useRef<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    pixelsRef.current = areaPixels;
  }, []);

  async function apply() {
    const pixels = pixelsRef.current;
    if (!pixels) {
      setErr("Move or zoom the photo so the crop area is ready.");
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, pixels, originalMime, {
        maxEdge: 512,
        outputMime: "image/jpeg",
        quality: 0.88,
      });
      const base = fileName.replace(/\.[^.]+$/, "") || "avatar";
      const file = new File([blob], `${base}-profile.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onApply(file);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not crop image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[230] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-crop-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-4 rounded-2xl border border-sand-deep bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 id="profile-crop-title" className="font-display text-xl text-ink">
              Profile photo
            </h2>
            <p className="mt-1 text-xs text-ink-muted">
              Drag to position, zoom to frame your face, then apply. Square crop, saved as JPEG.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full border border-sand-deep px-3 py-1.5 text-sm text-ink hover:bg-sand"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        <div className="relative aspect-square w-full max-h-[min(55vh,380px)] overflow-hidden rounded-2xl bg-ink">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            restrictPosition
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { borderRadius: 16 },
            }}
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="w-14 shrink-0 font-medium text-ink">Zoom</span>
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

        {err ? <p className="text-sm text-rose">{err}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void apply()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-white hover:bg-accent-light disabled:opacity-60"
          >
            {busy ? (
              <>
                <Spinner size="sm" className="text-white" />
                Applying…
              </>
            ) : (
              "Apply & upload"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
